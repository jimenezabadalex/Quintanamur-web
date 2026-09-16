# 🏆 Guía Maestra Unificada: Arquitectura de Datos, Ingesta Segura y Resiliencia Extremo a Extremo
### (Web Astro ➔ Neon Postgres + PostGIS ➔ Pipeline Python ELT ➔ Google BigQuery ➔ Power BI / Looker Studio)

> **Proyecto:** Quintanamur S.L. Platform  
> **Documentos Consolidados:**  
> - [`docs/formulario/PROTOCOLO_GESTION_FALLOS_FORMULARIO.md`](file:///c:/Users/alexj/Quintanamur-web/docs/formulario/PROTOCOLO_GESTION_FALLOS_FORMULARIO.md)  
> - [`docs/datos/GUIA_INTEGRACION_DATOS_NEON_BIGQUERY.md`](file:///c:/Users/alexj/Quintanamur-web/docs/datos/GUIA_INTEGRACION_DATOS_NEON_BIGQUERY.md)  
> - [`docs/datos/INFORME_DISENO_BBDD_NEON_BIGQUERY.md`](file:///c:/Users/alexj/Quintanamur-web/docs/datos/INFORME_DISENO_BBDD_NEON_BIGQUERY.md)  
> - [`docs/datos/FLUJO_DATOS_Y_EJEMPLO_NEON.md`](file:///c:/Users/alexj/Quintanamur-web/docs/datos/FLUJO_DATOS_Y_EJEMPLO_NEON.md)  
> **Propósito:** Proveer un **manual único de implementación práctica** que garantice la captura íntegra del dato, la analítica predictiva de negocio y la **cero pérdida de clientes potenciales (*leads*)** ante caídas de servidor, fallos de cobertura o arranques en frío.

---

## 🗺️ 1. Mapa de Arquitectura Global del Sistema

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND RESILIENTE (Astro + Leaflet en `src/pages/contacto.astro`)                 │
│    • Formulario + Mapa con cálculo Haversine de distancia a Yecla                      │
│    • Prevención de pérdida: NUNCA resetea campos en fallo                              │
│    • Guardado temporal en localStorage (con caducidad TTL 24h)                         │
│    • Fallback de rescate comercial: botón WhatsApp pre-redactado + llamada directa     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ POST /api/lead (JSON seguro vía HTTPS)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. ENDPOINT SERVERLESS Y DEDUPLICACIÓN (`src/pages/api/lead.ts`)                       │
│    • Validación estricta y prueba legal inmutable de consentimiento RGPD               │
│    • Idempotencia: bloquea leads duplicados por teléfono en ventana de 5 minutos       │
│    • Inserción SQL parametrizada mediante conexión SSL                                 │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ INSERT directo
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. BASE DE DATOS OPERACIONAL (OLTP): Neon.tech (PostgreSQL 16+ / PostGIS)              │
│    • Región: Frankfurt (eu-central-1) para estricto cumplimiento RGPD                  │
│    • Tablas: `raw_leads` (solicitudes) y `raw_web_events` (telemetría sin cookies)     │
│    • Disparador automático PostGIS: genera el punto geométrico espacial (`geom`)       │
│    • Índices optimizados (B-Tree, GIST espacial y GIN para JSONB)                      │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Extracción incremental (`elt_pipeline.py`)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. PIPELINE ELT EN PYTHON (`elt_pipeline.py`)                                          │
│    • Extrae registros de Neon mediante `psycopg2` y `pandas`                           │
│    • Carga estructurada en Google BigQuery mediante Cuenta de Servicio cifrada         │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Carga Columnar
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 5. DATA WAREHOUSE (OLAP): Google BigQuery (Dataset: `quintanamur_warehouse`)           │
│    • Modelo en Estrella (Star Schema): `fact_leads_analytics` y dimensiones           │
│    • Lógica de negocio: Lead Quality Score (0-100), segmentación y coste logístico     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Conexión Nativa (Cloud / Desktop)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 6. BUSINESS INTELLIGENCE: Looker Studio / Power BI Desktop                             │
│    • Mapa de calor de demanda territorial fuera del radio de 60-100 km de Yecla        │
│    • Embudo de conversión, desglose por maquinaria y predicción de tickets             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ 2. FASE 1: Configuración de la Base de Datos (Neon PostgreSQL + PostGIS)

Neon es un motor PostgreSQL serverless, 100% estándar y con almacenamiento desacoplado.

### Paso 1.1: Registro y Creación del Proyecto
1. Accede a [neon.tech](https://neon.tech) y regístrate.
2. Crea un nuevo proyecto:
   - **Project Name:** `quintanamur-data-platform`
   - **Region:** **Europe (Frankfurt - `eu-central-1`)** *(Obligatorio por RGPD)*.
3. Copia tu cadena de conexión privada:
   ```text
   postgresql://alex_owner:TU_PASSWORD@ep-cool-cloud-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

### Paso 1.2: Esquema DDL Completo e Índices Espaciales
En la consola **SQL Editor** de Neon, ejecuta este script integral:

```sql
-- 1. Habilitar extensión geoespacial
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Tabla de Solicitudes y Leads Comerciales
CREATE TABLE IF NOT EXISTS raw_leads (
    lead_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_name VARCHAR(150) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    client_email VARCHAR(150),
    service_category VARCHAR(100) NOT NULL,    -- 'agricola', 'civil', 'otro'
    machinery_interest VARCHAR(100),          -- 'Rulos', 'Tractores', 'Niveladora', etc.
    municipality_name VARCHAR(150),           -- Población (ej. Jumilla, Yecla)
    user_lat DOUBLE PRECISION,                -- Latitud GPS
    user_lng DOUBLE PRECISION,                -- Longitud GPS
    distance_to_base_km DOUBLE PRECISION,     -- Km respecto a Yecla
    coverage_status VARCHAR(50),              -- 'ZONA_PRIORITARIA' (<=100km) vs 'GRAN_PROYECTO'
    message_text TEXT,
    privacy_consent_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    privacy_consent_timestamp TIMESTAMP WITH TIME ZONE,
    lead_source VARCHAR(50) DEFAULT 'WEB_FORM',
    lead_status VARCHAR(50) DEFAULT 'NUEVO',  -- 'NUEVO', 'CONTACTADO', 'CONVERTIDO'
    geom GEOMETRY(Point, 4326)                -- Punto nativo WGS84 para mapas BI
);

-- 3. Trigger espacial automático para calcular la geometría PostGIS
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

-- 4. Tabla de Telemetría Web y Rescate (Sin cookies invasivas)
CREATE TABLE IF NOT EXISTS raw_web_events (
    event_id SERIAL PRIMARY KEY,
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    event_name VARCHAR(100) NOT NULL,          -- 'whatsapp_fallback_click', 'map_pin_placed'
    session_id VARCHAR(100),
    page_url VARCHAR(255),
    event_payload JSONB                        -- Detalles del evento en JSON
);

-- 5. Índices de Alto Rendimiento
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON raw_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON raw_leads (client_phone);
CREATE INDEX IF NOT EXISTS idx_leads_service_category ON raw_leads (service_category);
CREATE INDEX IF NOT EXISTS idx_leads_geom ON raw_leads USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON raw_web_events (event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_name ON raw_web_events (event_name);
CREATE INDEX IF NOT EXISTS idx_events_payload_gin ON raw_web_events USING GIN (event_payload);
```

---

## 🛡️ 3. FASE 2: Backend e Ingesta con Deduplicación (`/api/lead.ts`)

Para evitar problemas de **leads duplicados** (cuando un cliente en el campo tiene cobertura inestable y pulsa "Reintentar" tras un timeout de red), implementamos **idempotencia defensiva** en el servidor.

### Paso 2.1: Instalar el SDK de Neon
En la raíz de tu proyecto:
```bash
npm install @neondatabase/serverless
```

### Paso 2.2: Configurar Variable de Entorno en `.env`
Crea o edita `.env` en la raíz (asegúrate de que esté en `.gitignore`):
```env
NEON_DATABASE_URL="postgresql://alex_owner:TU_PASSWORD@ep-cool-cloud-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require"
```

### Paso 2.3: Crear Endpoint Serverless (`src/pages/api/lead.ts`)
```typescript
import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

export const prerender = false; // Ejecución dinámica en servidor

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // 1. Validación de seguridad y consentimiento RGPD estricto
    if (!data.client_name || !data.client_phone || data.privacy_consent_accepted !== true) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Debes completar tu nombre, teléfono y aceptar la política de privacidad.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sql = neon(import.meta.env.NEON_DATABASE_URL);

    // 2. Control de Idempotencia: Verificar si existe un envío idéntico en los últimos 5 minutos
    const recentDuplicate = await sql`
      SELECT lead_id FROM raw_leads
      WHERE client_phone = ${data.client_phone}
        AND created_at > NOW() - INTERVAL '5 minutes'
      LIMIT 1;
    `;

    if (recentDuplicate.length > 0) {
      // Actualizamos el mensaje si aportó más detalles en lugar de duplicar
      await sql`
        UPDATE raw_leads
        SET message_text = COALESCE(${data.message_text}, message_text)
        WHERE lead_id = ${recentDuplicate[0].lead_id};
      `;
      return new Response(
        JSON.stringify({ 
          success: true, 
          lead_id: recentDuplicate[0].lead_id, 
          message: 'Solicitud actualizada correctamente.' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Inserción protegida contra SQL Injection
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
        privacy_consent_timestamp,
        lead_source
      ) VALUES (
        ${data.client_name},
        ${data.client_phone},
        ${data.client_email || null},
        ${data.service_category || 'agricola'},
        ${data.machinery_interest || null},
        ${data.municipality_name || null},
        ${data.user_lat || null},
        ${data.user_lng || null},
        ${data.distance_to_base_km || null},
        ${data.distance_to_base_km <= 100 ? 'ZONA_PRIORITARIA' : 'GRAN_PROYECTO'},
        ${data.message_text || null},
        TRUE,
        NOW(),
        ${data.lead_source || 'WEB_FORM'}
      )
      RETURNING lead_id;
    `;

    return new Response(
      JSON.stringify({ 
        success: true, 
        lead_id: result[0].lead_id, 
        message: 'Solicitud registrada correctamente.' 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error al insertar lead en Neon:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'El servidor tardó en responder. Por favor, inténtalo de nuevo.' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

---

## 📱 4. FASE 3: Frontend con Protocolo de Resiliencia en 4 Niveles (`contacto.astro`)

Este script implementa el protocolo estricto de [`PROTOCOLO_GESTION_FALLOS_FORMULARIO.md`](file:///c:/Users/alexj/Quintanamur-web/docs/formulario/PROTOCOLO_GESTION_FALLOS_FORMULARIO.md):
- **Nivel 1:** Prohibido hacer `form.reset()` si falla; botón en espera para evitar dobles clics y tolerar el *Cold Start* de Neon (timeout de 10s).
- **Nivel 2:** Diagnóstico transparente en español (sin códigos HTTP crudos).
- **Nivel 3:** Fallback de WhatsApp pre-redactado + teléfono directo para escritorio.
- **Nivel 4:** Respaldo local en `localStorage` con caducidad (TTL) de 24 horas.

Incluye este código en la sección de script de [`src/pages/contacto.astro`](file:///c:/Users/alexj/Quintanamur-web/src/pages/contacto.astro):

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  const submitBtn = form?.querySelector('button[type="submit"]');
  const DRAFT_KEY = 'quintanamur_lead_draft';
  const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

  // 1. RESTAURACIÓN INTELIGENTE DE BORRADORES (TTL 24 HORAS)
  try {
    const savedDraftRaw = localStorage.getItem(DRAFT_KEY);
    if (savedDraftRaw) {
      const draft = JSON.parse(savedDraftRaw);
      const isExpired = Date.now() - (draft._timestamp || 0) > DRAFT_TTL_MS;

      if (isExpired) {
        localStorage.removeItem(DRAFT_KEY);
      } else {
        if (confirm('Hemos recuperado los datos de tu última solicitud no enviada. ¿Deseas restaurarlos?')) {
          if (document.getElementById('name')) document.getElementById('name').value = draft.client_name || '';
          if (document.getElementById('phone')) document.getElementById('phone').value = draft.client_phone || '';
          if (document.getElementById('email')) document.getElementById('email').value = draft.client_email || '';
          if (document.getElementById('service-type')) document.getElementById('service-type').value = draft.service_category || 'agricola';
          if (document.getElementById('message')) document.getElementById('message').value = draft.message_text || '';
          if (document.getElementById('location')) document.getElementById('location').value = draft.municipality_name || '';
        }
      }
    }
  } catch (e) {
    console.warn('Error leyendo borrador local:', e);
  }

  if (!form || !submitBtn) return;

  // 2. CONTROLADOR DE ENVÍO CON TOLERANCIA A FALLOS
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Recoger valores del DOM y del mapa Leaflet
    const payload = {
      client_name: document.getElementById('name')?.value.trim(),
      client_phone: document.getElementById('phone')?.value.trim(),
      client_email: document.getElementById('email')?.value.trim() || null,
      service_category: document.getElementById('service-type')?.value || 'agricola',
      municipality_name: document.getElementById('location')?.value.trim() || null,
      message_text: document.getElementById('message')?.value.trim() || '',
      user_lat: window.currentUserLat || null,
      user_lng: window.currentUserLng || null,
      distance_to_base_km: window.currentDistanceKm || null,
      privacy_consent_accepted: document.getElementById('privacy-consent')?.checked || false,
      _timestamp: Date.now()
    };

    // Validación previa de RGPD en cliente
    if (!payload.privacy_consent_accepted) {
      alert('Debes marcar la casilla para aceptar la política de privacidad antes de enviar.');
      return;
    }

    // Nivel 1: Estado de carga visual (Tolera Cold Start de Neon)
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span>Conectando de forma segura...</span>';

    // Configurar Timeout de 10 segundos para no bloquear la pantalla indefinidamente
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const resData = await response.json();

      if (response.ok && resData.success) {
        // Éxito: Limpiar borrador de respaldo y resetear form
        localStorage.removeItem(DRAFT_KEY);
        alert('¡Solicitud enviada con éxito! Nos pondremos en contacto contigo en menos de 24 horas.');
        form.reset();
      } else {
        throw new Error(resData.error || 'Error procesando los datos en el servidor.');
      }

    } catch (error) {
      clearTimeout(timeoutId);

      // Nivel 4: Respaldar datos en el navegador del usuario para no perderlos
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));

      // Nivel 2 y 3: Diagnóstico y activación del Fallback de WhatsApp
      mostrarFallbackComercial(payload, error.name === 'AbortError' 
        ? 'El servidor tardó más de lo esperado en responder debido a la cobertura.' 
        : error.message
      );

    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Reintentar Envío</span>';
    }
  });

  // 3. GENERADOR DEL PLAN DE RESCATE (WHATSAPP + TELÉFONO VISIBLE)
  function mostrarFallbackComercial(payload, errorMsg) {
    const distancia = payload.distance_to_base_km ? ` (a ${Math.round(payload.distance_to_base_km)} km de Yecla)` : '';
    const textoMensaje = 
      `Hola Quintanamur, intenté enviar presupuesto desde la web pero tuve un problema de conexión.\n` +
      `Mis datos son:\n` +
      `- Nombre: ${payload.client_name || 'No especificado'}\n` +
      `- Teléfono: ${payload.client_phone || 'No especificado'}\n` +
      `- Sector: ${payload.service_category}\n` +
      `- Municipio: ${payload.municipality_name || 'Zona Yecla'}${distancia}\n` +
      `- Trabajo: ${payload.message_text || 'Solicito presupuesto general'}`;

    const whatsappUrl = `https://wa.me/34600000000?text=${encodeURIComponent(textoMensaje)}`;

    // Renderizar tarjeta de aviso visual debajo del botón
    let fallbackCard = document.getElementById('form-fallback-card');
    if (!fallbackCard) {
      fallbackCard = document.createElement('div');
      fallbackCard.id = 'form-fallback-card';
      form.appendChild(fallbackCard);
    }

    fallbackCard.className = "mt-6 p-5 rounded-xl border border-secondary/40 bg-secondary/10 flex flex-col gap-3";
    fallbackCard.innerHTML = `
      <div class="flex items-center gap-2 text-secondary font-bold">
        <span class="material-symbols-outlined">warning</span>
        <span>Aviso de conexión: ${errorMsg}</span>
      </div>
      <p class="text-sm text-on-surface-variant">
        Tus datos no se han borrado. Puedes volver a pulsar <strong>"Reintentar Envío"</strong> o enviárnoslos directamente sin esperas:
      </p>
      <div class="flex flex-col sm:flex-row gap-3 mt-2">
        <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp flex-1 text-center py-3">
          <span>Enviar solicitud por WhatsApp</span>
        </a>
        <a href="tel:+34600000000" class="btn-agricola flex-1 text-center py-3 bg-surface border border-outline-variant text-on-surface">
          <span>Llamar al 600 00 00 00</span>
        </a>
      </div>
    `;
  }
});
```

---

## ☁️ 5. FASE 4: Configurar Google BigQuery (Data Warehouse)

### Paso 4.1: Proyecto y Dataset en Google Cloud Sandbox
1. Entra en [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto: `quintanamur-analytics`.
3. Abre **BigQuery** y crea un dataset:
   - **Dataset ID:** `quintanamur_warehouse`
   - **Data Location:** `EU (multiple regions in European Union)` o `europe-west3 (Frankfurt)`.

### Paso 4.2: Descargar Cuenta de Servicio (`gcp-key.json`)
1. En Google Cloud, ve a **IAM y administración** > **Cuentas de servicio**.
2. Crea la cuenta `bigquery-ingestor` con rol **Administrador de BigQuery**.
3. En la pestaña **Claves**, genera una clave en formato **JSON** y guárdala localmente como `gcp-key.json` (fuera del repositorio git).

---

## 🐍 6. FASE 5: Pipeline ELT en Python (`elt_pipeline.py`)

Este script se encarga de extraer la foto de datos de Neon y sincronizarla en BigQuery.

### Paso 5.1: Dependencias en Python
```bash
pip install psycopg2-binary google-cloud-bigquery pandas python-dotenv
```

### Paso 5.2: Código del Pipeline (`elt_pipeline.py`)
```python
import os
import psycopg2
import pandas as pd
from google.cloud import bigquery
from google.oauth2 import service_account

# 1. Configuración de Entornos y Conexiones
NEON_URI = os.getenv("NEON_DATABASE_URL", "postgresql://alex_owner:TU_PASS@ep-cool-cloud.neon.tech/neondb?sslmode=require")
GCP_KEY_PATH = "gcp-key.json"
PROJECT_ID = "quintanamur-analytics"
DATASET_ID = "quintanamur_warehouse"
TABLE_ID = "raw_leads_sync"

def run_elt():
    print("🚀 [1/3] Conectando a Neon PostgreSQL...")
    conn = psycopg2.connect(NEON_URI)
    
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
        lead_source,
        lead_status
    FROM raw_leads;
    """
    df = pd.read_sql(query, conn)
    conn.close()
    print(f"✅ Se han extraído {len(df)} registros de Neon.")

    if df.empty:
        print("ℹ️ La tabla está vacía. Finalizando.")
        return

    # 2. Carga en Google BigQuery
    print("🚀 [2/3] Autenticando en BigQuery...")
    credentials = service_account.Credentials.from_service_account_file(GCP_KEY_PATH)
    client = bigquery.Client(credentials=credentials, project=PROJECT_ID)

    table_ref = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"
    job_config = bigquery.LoadJobConfig(
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE, # Réplica fiel
        autodetect=True
    )

    print(f"🚀 [3/3] Cargando tabla {table_ref} en BigQuery...")
    job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
    job.result() # Bloquea hasta finalizar

    print("🎉 Pipeline completado con éxito. Datos listos en BigQuery.")

if __name__ == "__main__":
    run_elt()
```

---

## 📊 7. FASE 6: Modelado Dimensional y Analítica en BigQuery (Star Schema)

En la consola de BigQuery, ejecuta esta consulta SQL para crear la **Tabla de Hechos Analítica**:

```sql
CREATE OR REPLACE TABLE `quintanamur-analytics.quintanamur_warehouse.fact_leads_analytics` AS
SELECT 
    lead_id,
    created_at AS lead_timestamp,
    DATE(created_at) AS lead_date,
    service_category,
    COALESCE(machinery_interest, 'Sin especificar') AS machinery_interest,
    COALESCE(municipality_name, 'Desconocido') AS municipality_name,
    user_lat,
    user_lng,
    distance_to_base_km,
    coverage_status,
    -- 1. Segmentación de Negocio
    CASE 
        WHEN service_category = 'civil' THEN 'Ticket Alto (Obra Civil)'
        WHEN service_category = 'agricola' AND distance_to_base_km <= 50 THEN 'Ticket Recurrente Local'
        ELSE 'Ticket Estándar'
    END AS business_segment,
    -- 2. Lead Quality Score (0 a 100)
    CASE 
        WHEN client_email IS NOT NULL AND LENGTH(message_text) > 20 THEN 100
        WHEN client_email IS NOT NULL OR LENGTH(message_text) > 10 THEN 70
        ELSE 40
    END AS lead_quality_score,
    -- 3. Coste estimado de porte de góndola (Ida + Vuelta a 1.85 €/km)
    ROUND(distance_to_base_km * 2 * 1.85, 2) AS estimated_logistics_cost_eur
FROM `quintanamur-analytics.quintanamur_warehouse.raw_leads_sync`;
```

---

## 📈 8. FASE 7: Conexión con Cuadros de Mando (Power BI / Looker Studio)

### Looker Studio (Gratis y Cloud)
1. Ve a [lookerstudio.google.com](https://lookerstudio.google.com/) ➔ **Crear** ➔ **Fuente de Datos**.
2. Selecciona **BigQuery** ➔ Proyecto `quintanamur-analytics` ➔ Tabla `fact_leads_analytics`.
3. Inserta:
   - **Mapa de Burbujas / Calor:** Campo de ubicación `municipality_name` (o `user_lat`/`user_lng`), tamaño métrica `lead_quality_score`.
   - **Tarjetas de KPI:** Total Leads, Distancia Media (km), Coste Logístico Estimado.
   - **Desglose:** Gráfico de barras por `service_category` y `machinery_interest`.

### Power BI Desktop
1. En Power BI Desktop, pulsa **Obtener datos** ➔ **Google BigQuery**.
2. Conéctate con tu cuenta de Google Cloud y carga `fact_leads_analytics`.
3. Ya puedes generar informes con filtros de fecha y mapa de calor espacial.

---

## ⚖️ 9. Matriz de Resolución de Fallos Futuros (Basada en el Protocolo Técnico)

Esta guía resuelve de raíz los 5 riesgos operativos identificados:

| Riesgo Técnico Identificado | Impacto en Negocio | Solución Definitiva Implementada en esta Guía |
| :--- | :--- | :--- |
| **El cliente pierde cobertura y se borra el texto** | Abandono total del cliente tras escribir 300 caracteres | **Prohibición de `form.reset()`** en fallo y persistencia en `localStorage` |
| **Pérdida de leads si Neon no responde** | Pérdida de presupuestos y facturación | **Fallback automático con WhatsApp pre-redactado** y teléfono visible |
| **Leads duplicados por reintentos nerviosos** | Contacto redundante al cliente y mala imagen | **Idempotencia en `/api/lead.ts`** (ventana de 5 min por teléfono) |
| **Borradores desfasados en equipos compartidos** | Problemas de privacidad en cooperativas agrarias | **Caducidad automática (TTL)** del borrador a las 24 horas |
| **Demora de 3-5s por Cold Start de Neon** | El usuario cree que la página está congelada | **Leyenda interactiva *"Conectando de forma segura..."*** y timeout de 10s |
