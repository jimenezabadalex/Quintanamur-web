# 🚀 Guía Paso a Paso: Integración de Datos de Extremo a Extremo (Web -> Neon Postgres -> BigQuery -> Power BI)

> **Manual Práctico para Principiantes y Portfolio Técnico de Ingeniería de Datos**  
> **Proyecto:** Quintanamur S.L. Platform  
> **Nivel:** Principiante / Intermedio  
> **Objetivo:** Conectar el formulario web con geolocalización a una base de datos PostgreSQL Serverless (Neon) 24/7 y orquestar un pipeline ELT hacia Google BigQuery para su posterior análisis con dbt y Power BI.

---

## 🗺️ Mapa Visual de la Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND WEB (Astro)                                                    │
│    • Usuario completa formulario + marca ubicación en Leaflet               │
│    • Acepta Checkbox RGPD (Obligatorio)                                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ POST (JSON con coordenadas y datos)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. ENDPOINT / API SERVERLESS                                                │
│    • Valida campos y consentimiento legal                                   │
│    • Inserta de forma segura (SQL parametrizado con SSL)                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ INSERT directo
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. BASE DE DATOS OLTP: Neon.tech (PostgreSQL + PostGIS)                     │
│    • 24/7 Serverless (Gratis)                                               │
│    • Tablas: raw_leads, raw_web_events                                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Script ELT en Python (Extracción incremental)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. DATA WAREHOUSE OLAP: Google BigQuery (Sandbox Free Tier)                 │
│    • Almacén de datos en la nube (10 GB gratis / 1 TB consultas/mes)        │
│    • Modelado dimensional (Star Schema con dbt o SQL): fact_ y dim_         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Conexión Nativa
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. VISUALIZACIÓN & ANALYTICS: Power BI / Looker Studio / Python             │
│    • Cuadro de mando ejecutivo: mapa de calor de demanda y embudo de leads  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📌 FASE 1: Crear y Configurar la Base de Datos en Neon.tech (PostgreSQL)

Neon es un servicio de **PostgreSQL en la nube 100% gratuito** con arquitectura *Serverless* (siempre disponible 24/7 y sin costes sorpresa).

### Paso 1.1: Registro y Creación del Proyecto
1. Entra en [neon.tech](https://neon.tech) y haz clic en **Sign Up** (puedes registrarte con tu cuenta de GitHub o Google).
2. Haz clic en **Create Project**:
   - **Project Name:** `quintanamur-data-platform`
   - **Postgres Version:** Deja la recomendada (ej. `16` o `17`).
   - **Region:** Selecciona **Europe (Frankfurt - `eu-central-1`)** para cumplir con la normativa RGPD en servidores europeos.
3. Haz clic en **Create Project**.

### Paso 1.2: Copiar la Cadena de Conexión (`DATABASE_URL`)
En el panel principal verás una caja llamada **Connection Details**.
- Selecciona el formato **`Connection string`**.
- Tendrá un aspecto similar a este:
  ```text
  postgresql://alex_owner:AbC123XyZ@ep-cool-cloud-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
  ```
- **¡Guarda esta cadena en un lugar seguro!** La usaremos para conectar el backend.

### Paso 1.3: Crear las Tablas y Activar PostGIS (Editor SQL de Neon)
En el menú lateral de Neon, haz clic en **SQL Editor** y ejecuta el siguiente script completo:

```sql
-- 1. Activar extensión geoespacial PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Crear tabla para almacenar los Leads y Presupuestos
CREATE TABLE IF NOT EXISTS raw_leads (
    lead_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_name VARCHAR(150) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    client_email VARCHAR(150),
    service_category VARCHAR(100) NOT NULL,    -- 'Servicios Agrícolas', 'Obra Civil / Excavación', etc.
    machinery_interest VARCHAR(100),          -- 'Tractor', 'Retropala', 'Aperos', etc.
    municipality_name VARCHAR(150),           -- 'Yecla', 'Almansa', 'Villena', etc.
    user_lat DOUBLE PRECISION,                -- Coordenada Latitud
    user_lng DOUBLE PRECISION,                -- Coordenada Longitud
    distance_to_base_km DOUBLE PRECISION,     -- Distancia calculada a Yecla
    coverage_status VARCHAR(50),              -- 'ZONA_PRIORITARIA' (<=100km) vs 'GRAN_PROYECTO' (>100km)
    message_text TEXT,
    privacy_consent_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    privacy_consent_timestamp TIMESTAMP WITH TIME ZONE,
    lead_source VARCHAR(50) DEFAULT 'WEB_FORM',
    geom GEOMETRY(Point, 4326)                -- Geometría PostGIS para mapas
);

-- 3. Crear disparador automático para calcular el punto PostGIS automáticamente
CREATE OR REPLACE FUNCTION update_geom_from_latlng()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_lat IS NOT NULL AND NEW.user_lng IS NOT NULL THEN
        NEW.geom = ST_SetSRID(ST_MakePoint(NEW.user_lng, NEW.user_lat), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_lead_geom
BEFORE INSERT OR UPDATE ON raw_leads
FOR EACH ROW
EXECUTE FUNCTION update_geom_from_latlng();

-- 4. Crear tabla para registrar eventos de navegación (Tracking de clics y mapa)
CREATE TABLE IF NOT EXISTS raw_web_events (
    event_id SERIAL PRIMARY KEY,
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    event_name VARCHAR(100) NOT NULL,          -- 'map_click', 'whatsapp_click', 'service_view'
    session_id VARCHAR(100),
    page_url VARCHAR(255),
    event_payload JSONB                        -- Datos flexibles en formato JSON
);
```

---

## 📌 FASE 2: Conectar el Formulario de la Web (`contacto.astro`)

Para enviar los datos desde el navegador hacia Neon de forma segura **sin exponer la contraseña de la base de datos en el frontend**, usamos un endpoint de API en el servidor.

### Paso 2.1: Crear archivo de Variables de Entorno (`.env`)
En la raíz del proyecto `Quintanamur-web/`, crea o edita el archivo `.env`:

```env
# URL de conexión de Neon (¡No subir este archivo a GitHub público!)
NEON_DATABASE_URL="postgresql://alex_owner:TU_PASSWORD@ep-cool-cloud-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require"
```

### Paso 2.2: Crear el Endpoint de Ingesta (`src/pages/api/lead.ts`)
Crea el archivo `src/pages/api/lead.ts` en tu proyecto Astro. Este script recibe la petición del formulario, valida el consentimiento legal y guarda el registro en Neon:

```typescript
import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

export const prerender = false; // Permite ejecución serverless dinámica

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // 1. Validación de seguridad y consentimiento RGPD
    if (!data.client_name || !data.client_phone || !data.privacy_consent_accepted) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios o no se ha aceptado la Política de Privacidad.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Conectar a Neon PostgreSQL mediante el SDK Serverless optimizado
    const sql = neon(import.meta.env.NEON_DATABASE_URL);

    // 3. Inserción segura con SQL parametrizado (protección anti SQL Injection)
    const result = await sql`
      INSERT INTO raw_leads (
        client_name,
        client_phone,
        client_email,
        service_category,
        machinery_interest,
        municipality_name,
        user_lat,
        user_lng,
        distance_to_base_km,
        coverage_status,
        message_text,
        privacy_consent_accepted,
        privacy_consent_timestamp
      ) VALUES (
        ${data.client_name},
        ${data.client_phone},
        ${data.client_email || null},
        ${data.service_category || 'General'},
        ${data.machinery_interest || null},
        ${data.municipality_name || null},
        ${data.user_lat || null},
        ${data.user_lng || null},
        ${data.distance_to_base_km || null},
        ${data.distance_to_base_km <= 100 ? 'ZONA_PRIORITARIA' : 'GRAN_PROYECTO'},
        ${data.message_text || null},
        ${data.privacy_consent_accepted},
        NOW()
      )
      RETURNING lead_id;
    `;

    return new Response(
      JSON.stringify({ success: true, lead_id: result[0].lead_id, message: 'Solicitud registrada correctamente.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error al insertar lead en Neon:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor al procesar la solicitud.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

### Paso 2.3: Enviar el Formulario con JavaScript desde `contacto.astro`
En la sección `<script>` de `contacto.astro`, actualizamos el manejador del evento `submit`:

```javascript
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Recopilar valores del formulario + geodatos calculados del mapa
    const payload = {
      client_name: document.getElementById('name').value,
      client_phone: document.getElementById('phone').value,
      client_email: document.getElementById('email').value,
      service_category: document.getElementById('service-type').value,
      message_text: document.getElementById('message').value,
      municipality_name: document.getElementById('location').value,
      // Variables capturadas por el mapa de Leaflet
      user_lat: window.currentUserLat || null,
      user_lng: window.currentUserLng || null,
      distance_to_base_km: window.currentDistanceKm || null,
      privacy_consent_accepted: document.getElementById('privacy-consent').checked
    };

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const resData = await response.json();
      if (response.ok) {
        alert('¡Solicitud enviada con éxito! Nos pondremos en contacto contigo.');
        contactForm.reset();
      } else {
        alert('Error: ' + resData.error);
      }
    } catch (err) {
      alert('Error de conexión al enviar el formulario.');
    }
  });
}
```

---

## 📌 FASE 3: Configurar Google BigQuery (Data Warehouse)

BigQuery almacena los datos en formato columnar para análisis a gran escala.

### Paso 3.1: Crear Proyecto en Google Cloud (Modo Sandbox Gratis)
1. Accede a [console.cloud.google.com](https://console.cloud.google.com/).
2. Inicia sesión con tu cuenta de Google.
3. Haz clic en el selector de proyectos arriba a la izquierda y pulsa **New Project** (Nombre: `quintanamur-analytics`).
4. En el buscador superior escribe **BigQuery** y pulsa enter.

### Paso 3.2: Crear el Dataset en BigQuery
1. En el panel izquierdo de BigQuery, haz clic en los tres puntos junto al nombre de tu proyecto (`quintanamur-analytics`) y selecciona **Create dataset**.
2. **Dataset ID:** `quintanamur_warehouse`
3. **Data location:** Selecciona **`europe-west3 (Frankfurt)`** o **`EU (multiple regions in European Union)`**.
4. Haz clic en **Create dataset**.

### Paso 3.3: Obtener Credenciales de Acceso (Cuenta de Servicio)
Para que un script en Python pueda escribir en BigQuery:
1. Ve a **IAM & Admin** > **Service Accounts** en Google Cloud.
2. Pulsa **Create Service Account** (Nombre: `bigquery-ingestor`).
3. En el paso de roles, asígnale: **BigQuery Admin** (o *BigQuery Data Editor* + *BigQuery Job User*).
4. Pulsa **Done**, haz clic en la cuenta creada, ve a la pestaña **Keys** > **Add Key** > **Create new key** > **JSON**.
5. Se descargará un archivo `.json` (ejemplo: `gcp-key.json`). **Guarda este archivo en una carpeta segura fuera de git.**

---

## 📌 FASE 4: Pipeline ELT Automatizado en Python (Neon -> BigQuery)

Este script se ejecuta periódicamente (o bajo demanda) para extraer los nuevos leads de Neon y cargarlos en BigQuery.

### Paso 4.1: Instalar dependencias en tu entorno Python
```bash
pip install psycopg2-binary google-cloud-bigquery pandas python-dotenv
```

### Paso 4.2: Script de Extracción y Carga (`elt_pipeline.py`)

```python
import os
import psycopg2
import pandas as pd
from google.cloud import bigquery
from google.oauth2 import service_account

# 1. Configuración de credenciales
NEON_URI = "postgresql://alex_owner:TU_PASSWORD@ep-cool-cloud-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require"
GCP_KEY_PATH = "gcp-key.json"
PROJECT_ID = "quintanamur-analytics"
DATASET_ID = "quintanamur_warehouse"
TABLE_ID = "raw_leads_sync"

def run_elt_pipeline():
    print("🚀 [1/3] Conectando a Neon PostgreSQL y extrayendo leads...")
    conn = psycopg2.connect(NEON_URI)
    
    # Extraer datos en bruto
    query = """
    SELECT 
        lead_id,
        created_at,
        client_name,
        client_phone,
        client_email,
        service_category,
        machinery_interest,
        municipality_name,
        user_lat,
        user_lng,
        distance_to_base_km,
        coverage_status,
        message_text,
        privacy_consent_accepted,
        lead_source
    FROM raw_leads;
    """
    df = pd.read_sql(query, conn)
    conn.close()
    print(f"✅ Se han extraído {len(df)} registros de Neon.")

    if df.empty:
        print("ℹ️ No hay registros para transferir.")
        return

    # 2. Conectar a BigQuery
    print("🚀 [2/3] Autenticando con Google BigQuery...")
    credentials = service_account.Credentials.from_service_account_file(GCP_KEY_PATH)
    client = bigquery.Client(credentials=credentials, project=PROJECT_ID)

    # 3. Configurar la carga en BigQuery (Modo WRITE_TRUNCATE para réplica exacta o WRITE_APPEND)
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"
    job_config = bigquery.LoadJobConfig(
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE, # Sobrescribe con la foto completa
        autodetect=True
    )

    print(f"🚀 [3/3] Cargando datos en BigQuery ({table_ref})...")
    job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
    job.result() # Espera a que termine la carga

    print("🎉 ¡Pipeline ELT completado con éxito! Datos disponibles en BigQuery.")

if __name__ == "__main__":
    run_elt_pipeline()
```

---

## 📌 FASE 5: Modelado Dimensional y Analítica en BigQuery (SQL / dbt)

Una vez los datos están en BigQuery, creamos las vistas analíticas (Modelos en Estrella) directamente desde la consola SQL de BigQuery:

```sql
-- Crear Tabla de Hechos: fact_leads_analytics
CREATE OR REPLACE TABLE `quintanamur-analytics.quintanamur_warehouse.fact_leads_analytics` AS
SELECT 
    lead_id,
    created_at AS lead_timestamp,
    DATE(created_at) AS lead_date,
    service_category,
    COALESCE(machinery_interest, 'Sin especificar') AS machinery_interest,
    COALESCE(municipality_name, 'Desconocido') AS municipality_name,
    distance_to_base_km,
    coverage_status,
    -- Clasificación de valor estimado
    CASE 
        WHEN service_category = 'Obra Civil / Excavación' THEN 'Ticket Alto'
        WHEN service_category = 'Servicios Agrícolas' AND distance_to_base_km <= 50 THEN 'Ticket Recurrente Local'
        ELSE 'Ticket Estándar'
    END AS business_segment,
    -- Puntuación de calidad del lead
    CASE 
        WHEN client_email IS NOT NULL AND LENGTH(message_text) > 20 THEN 100
        WHEN client_email IS NOT NULL OR LENGTH(message_text) > 10 THEN 70
        ELSE 40
    END AS lead_quality_score
FROM `quintanamur-analytics.quintanamur_warehouse.raw_leads_sync`;
```

---

## 📌 FASE 6: Conexión con Cuadros de Mando (Power BI / Looker Studio)

### Conectar Looker Studio (100% Gratis y en la Nube):
1. Entra en [lookerstudio.google.com](https://lookerstudio.google.com/).
2. Haz clic en **Create** > **Data Source**.
3. Selecciona el conector **BigQuery** > Selecciona tu proyecto `quintanamur-analytics` > Dataset `quintanamur_warehouse` > Tabla `fact_leads_analytics`.
4. Pulsa **Connect** y ya puedes crear gráficos:
   - **Mapa de burbujas:** Ubicaciones con más leads solicitados.
   - **KPI Cards:** Total Leads, Distancia Media a Yecla, Lead Quality Score Medio.
   - **Gráfico de Barras:** Demanda por Tipo de Maquinaria y Sector.

### Conectar Power BI Desktop:
1. Abre Power BI Desktop > **Obtener datos** > **Google BigQuery**.
2. Inicia sesión con tu cuenta de Google Cloud.
3. Selecciona la tabla `fact_leads_analytics` en modo **Importar** o **DirectQuery**.

---

## 💼 Resumen Ejecutivo para tu Entrevista

Cuando te pregunten sobre este proyecto en una entrevista técnica, describe el flujo así:

1. **Captura:** *"Diseñé la arquitectura web con Astro capturando leads y geodatos en el cliente con Leaflet."*
2. **Capa Transaccional (OLTP):** *"Utilicé **Neon PostgreSQL** serverless en Europa con **PostGIS**, asegurando persistencia 24/7 y validación de consentimiento RGPD."*
3. **Pipeline ELT:** *"Construí un pipeline de extracción incremental en **Python** que transfiere los datos en bruto a **Google BigQuery**."*
4. **Modelado y Consumo:** *"En BigQuery estructuré un modelo dimensional en estrella (*Star Schema*) con tablas de hechos y dimensiones que alimentan directamente un cuadro de mando en **Power BI / Looker Studio** para monitorizar la demanda fuera del radio de 100 km de Yecla."*
