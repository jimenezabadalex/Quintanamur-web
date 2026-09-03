# 🗄️ Informe Técnico: Diseño y Contenido de la Base de Datos (Neon PostgreSQL & Google BigQuery)

> **Proyecto:** Quintanamur S.L. Web Platform  
> **Documento Base de Referencia:** [`docs/GUIA_INTEGRACION_DATOS_NEON_BIGQUERY.md`](file:///c:/Users/alexj/Quintanamur-web/docs/GUIA_INTEGRACION_DATOS_NEON_BIGQUERY.md)  
> **Componentes Web Fuente:** [`src/pages/contacto.astro`](file:///c:/Users/alexj/Quintanamur-web/src/pages/contacto.astro), [`src/components/MobileBottomBar.astro`](file:///c:/Users/alexj/Quintanamur-web/src/components/MobileBottomBar.astro), [`src/components/Navbar.astro`](file:///c:/Users/alexj/Quintanamur-web/src/components/Navbar.astro)  
> **Propósito:** Definir de manera exhaustiva el diccionario de datos, tipos, tablas, orígenes de captura en el frontend y la transformación dimensional hacia el Data Warehouse.

---

## 1. 🎯 Arquitectura de Datos: Enfoque Híbrido (OLTP + OLAP)

La base de datos se estructura en dos capas complementarias para garantizar rendimiento óptimo, seguridad transaccional y capacidad analítica avanzada:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      CAPA 1: OPERACIONAL (OLTP)                        │
│             Neon Serverless PostgreSQL 16/17 + PostGIS                 │
│                                                                        │
│  • Objetivo: Ingesta rápida en tiempo real, integridad ACID y RGPD.    │
│  • Tablas Principales: raw_leads, raw_web_events                       │
│  • Región: Europa (eu-central-1 Frankfurt)                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Pipeline ELT Python (Incremental)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       CAPA 2: ANALÍTICA (OLAP)                         │
│             Google BigQuery (Dataset: quintanamur_warehouse)           │
│                                                                        │
│  • Objetivo: Almacenamiento columnar masivo, KPIs y consultas BI.      │
│  • Modelado: Modelo en Estrella (Star Schema) -> fact_ y dim_          │
│  • Destino de Consumo: Power BI / Looker Studio                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 📋 Diccionario Detallado de la Base de Datos Transaccional (Neon PostgreSQL)

### 📌 Tabla 1: `raw_leads` (Captura de Solicitudes y Presupuestos)

Esta tabla almacena cada envío del formulario de contacto ([`src/pages/contacto.astro`](file:///c:/Users/alexj/Quintanamur-web/src/pages/contacto.astro)). Combina datos de contacto del cliente, especificaciones de la maquinaria/servicio, métricas logísticas calculadas por Leaflet y auditoría de consentimiento RGPD.

| Columna | Tipo de Dato (PostgreSQL) | Restricciones | Origen en el Frontend (`contacto.astro`) | Descripción Funcional y Valor de Negocio |
| :--- | :--- | :--- | :--- | :--- |
| **`lead_id`** | `SERIAL` | `PRIMARY KEY` | Autogenerado por Neon | Identificador único secuencial de la solicitud de presupuesto. |
| **`created_at`** | `TIMESTAMP WITH TIME ZONE` | `DEFAULT NOW()` | Servidor de base de datos | Fecha y hora exacta de entrada de la solicitud con zona horaria (`UTC`). |
| **`client_name`** | `VARCHAR(150)` | `NOT NULL` | `input#name` ("Tu Nombre o Empresa") | Nombre del cliente particular, agricultor o razón social de la empresa/constructora. |
| **`client_phone`** | `VARCHAR(50)` | `NOT NULL` | `input#phone` ("Teléfono de Contacto") | Teléfono móvil o fijo. Canal principal de contacto rápido para el equipo de Quintanamur. |
| **`client_email`** | `VARCHAR(150)` | `NULL` | Formulario / Parámetro de contacto | Correo electrónico para envío formal de presupuesto en PDF. |
| **`service_category`** | `VARCHAR(100)` | `NOT NULL` | `select#sector` ("Sector de Actuación") | Clasificación del negocio: `'agricola'` (Servicios Agrícolas), `'civil'` (Obra Civil / Excavación) u `'otro'`. |
| **`machinery_interest`** | `VARCHAR(100)` | `NULL` | Derivado de navegación previa o select | Maquinaria solicitada (ej. *Tractor alta potencia, Retropala, Traílla, Cuchilla niveladora, Rulos despedregadores*). |
| **`municipality_name`** | `VARCHAR(150)` | `NULL` | `input#location` / Nominatim Reverse | Nombre de la población o finca (ej. *Yecla, Jumilla, Almansa, Pinoso, Villena*). |
| **`user_lat`** | `DOUBLE PRECISION` | `NULL` | `window.currentUserLat` (Leaflet) | Coordenada geográfica de latitud del proyecto seleccionada en el mapa o detectada vía GPS. |
| **`user_lng`** | `DOUBLE PRECISION` | `NULL` | `window.currentUserLng` (Leaflet) | Coordenada geográfica de longitud del proyecto. |
| **`distance_to_base_km`**| `DOUBLE PRECISION` | `NULL` | `window.currentDistanceKm` | Distancia geodésica en kilómetros calculada mediante fórmula Haversine respecto a la base central de Yecla (`38.6136, -1.1166`). |
| **`coverage_status`** | `VARCHAR(50)` | `NULL` | Lógica JS del mapa (`distKm <= 100`) | Etiqueta logística operativa: `'ZONA_PRIORITARIA'` (≤ 100 km) o `'GRAN_PROYECTO'` (> 100 km). |
| **`message_text`** | `TEXT` | `NULL` | `textarea#message` ("Cuéntanos qué necesitas") | Descripción detallada del trabajo (hectáreas a despedregar, metros de zanja, desbroce, nivelación láser, etc.). |
| **`privacy_consent_accepted`** | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | `input#privacy-consent` | Flag de cumplimiento RGPD. Debe ser `TRUE` obligatoriamente para procesar el envío. |
| **`privacy_consent_timestamp`** | `TIMESTAMP WITH TIME ZONE` | `NULL` | Endpoint `src/pages/api/lead.ts` (`NOW()`) | Marca de tiempo inmutable que certifica el momento exacto en el que el usuario dio su consentimiento legal. |
| **`lead_source`** | `VARCHAR(50)` | `DEFAULT 'WEB_FORM'` | Endpoint de ingesta | Canal de adquisición: `'WEB_FORM'`, `'MOBILE_QUICK_FORM'`, `'LANDING_CAMPAIGN'`. |
| **`lead_status`** | `VARCHAR(50)` | `DEFAULT 'NUEVO'` | Operacional interno | Estado del lead en el flujo de ventas: `'NUEVO'`, `'CONTACTADO'`, `'PRESUPUESTADO'`, `'CONVERTIDO'`, `'DESCARTADO'`. |
| **`geom`** | `GEOMETRY(Point, 4326)` | `NULL` | Generado por Trigger PostGIS | Punto espacial vectorial nativo en coordenadas WGS84 para indexación y mapas de calor espaciales. |

---

### 📌 Disparador Automático Espacial (PostGIS Trigger)

Para evitar incongruencias en los datos espaciales, la base de datos calcula automáticamente la columna `geom` a partir de `user_lat` y `user_lng`:

```sql
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
```

---

### 📌 Tabla 2: `raw_web_events` (Telemetría de Interacción y Comportamiento)

Almacena micro-conversiones e interacciones clave de la web sin necesidad de cookies de terceros invasivas (Privacy by Design).

| Columna | Tipo de Dato (PostgreSQL) | Restricciones | Origen en la Web | Descripción Funcional |
| :--- | :--- | :--- | :--- | :--- |
| **`event_id`** | `SERIAL` | `PRIMARY KEY` | Autogenerado por Neon | Identificador secuencial del evento. |
| **`event_timestamp`** | `TIMESTAMP WITH TIME ZONE` | `DEFAULT NOW()` | Servidor de base de datos | Momento en el que se disparó la acción. |
| **`event_name`** | `VARCHAR(100)` | `NOT NULL` | Scripts de telemetría | Nombre del evento (`'whatsapp_click'`, `'call_click'`, `'map_pin_placed'`, `'map_search_executed'`, `'instagram_click'`, `'share_click'`). |
| **`session_id`** | `VARCHAR(100)` | `NULL` | Generado en cliente (`sessionStorage`) | Identificador seudónimo de sesión temporal (RGPD compliant, sin IP personal). |
| **`page_url`** | `VARCHAR(255)` | `NULL` | `window.location.pathname` | Ruta de la página donde ocurrió el evento (`/contacto`, `/servicios-agricolas`, `/obra-civil`, `/maquinaria`). |
| **`event_payload`** | `JSONB` | `NULL` | Parámetros del evento | Estructura JSON flexible que guarda detalles específicos del evento. |

#### Ejemplos de Contenido del campo `event_payload` (JSONB):

1. **Evento de Mapa:** `map_pin_placed`
   ```json
   {
     "lat": 38.8241,
     "lng": -1.0984,
     "municipality": "Almansa",
     "distance_km": 24.8,
     "zone": "ZONA_PRIORITARIA",
     "trigger": "search_box"
   }
   ```
2. **Evento de Contacto Directo:** `whatsapp_click`
   ```json
   {
     "location": "MobileBottomBar",
     "target_phone": "+34600000000",
     "device_type": "mobile"
   }
   ```
3. **Evento de Red Social:** `instagram_click`
   ```json
   {
     "profile": "@quintanamur_sl",
     "placement": "Navbar"
   }
   ```

---

## 3. 📑 Índices y Optimización para Neon PostgreSQL

Para garantizar que las consultas de inserción y lectura respondan en milisegundos incluso bajo picos de tráfico:

```sql
-- Índices para raw_leads
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON raw_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_service_category ON raw_leads (service_category);
CREATE INDEX IF NOT EXISTS idx_leads_coverage_status ON raw_leads (coverage_status);
CREATE INDEX IF NOT EXISTS idx_leads_geom ON raw_leads USING GIST (geom);

-- Índices para raw_web_events
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON raw_web_events (event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_name ON raw_web_events (event_name);
CREATE INDEX IF NOT EXISTS idx_events_session ON raw_web_events (session_id);
CREATE INDEX IF NOT EXISTS idx_events_payload_gin ON raw_web_events USING GIN (event_payload);
```

---

## 4. 🚀 Modelo Dimensional en Google BigQuery (Data Warehouse)

Cuando el script ELT en Python (`elt_pipeline.py`) transfiere los datos desde Neon hacia BigQuery, los datos brutos se transforman en un **Modelo en Estrella (Star Schema)** diseñado para alimentar dashboards en **Power BI** o **Looker Studio**.

```
                         ┌─────────────────────────────┐
                         │      dim_calendario         │
                         │  (date_id, dia, mes, año)   │
                         └──────────────┬──────────────┘
                                        │
                                        ▼
┌─────────────────────────────┐  ┌───────────────────────────────────┐  ┌─────────────────────────────┐
│       dim_geografia         │  │        fact_leads_analytics       │  │        dim_servicios        │
│ (municipio, lat, lng, zona) │─▶│ (metricas, puntuacion, tickets,   │◀─│  (sector, tipo_maquinaria,  │
└─────────────────────────────┘  │  distancias, valor_estimado)      │  │   margen_operativo)         │
                                 └───────────────────────────────────┘  └─────────────────────────────┘
```

### 📊 Tabla de Hechos: `fact_leads_analytics`

| Campo en BigQuery | Tipo BigQuery | Regla de Transformación / Lógica de Negocio | Utilidad en Power BI |
| :--- | :--- | :--- | :--- |
| **`lead_id`** | `INTEGER` | Clave primaria replicada desde Neon | Conteo de leads únicos y trazabilidad. |
| **`lead_timestamp`** | `TIMESTAMP` | `created_at` | Análisis horario y tendencias de tráfico. |
| **`lead_date`** | `DATE` | `DATE(created_at)` | Eje temporal para filtros diarios, semanales y mensuales. |
| **`service_category`** | `STRING` | Limpieza de valores nulos y capitalización | Segmentación: Agrícola vs Obra Civil vs Otros. |
| **`machinery_interest`**| `STRING` | `COALESCE(machinery_interest, 'Sin especificar')` | Demanda por tipo de apero o vehículo pesado. |
| **`municipality_name`** | `STRING` | `COALESCE(municipality_name, 'Desconocido')` | Agrupación geográfica local. |
| **`distance_to_base_km`**| `FLOAT64` | Distancia en línea recta desde Yecla | Cálculo de costes de transporte y viabilidad de ruta. |
| **`coverage_status`** | `STRING` | `'ZONA_PRIORITARIA'` vs `'GRAN_PROYECTO'` | KPI de cobertura territorial. |
| **`business_segment`** | `STRING` | Segmentación basada en sector y distancia: <br>• Obra Civil ➔ `Ticket Alto`<br>• Agrícola (≤50km) ➔ `Ticket Recurrente Local`<br>• Otros ➔ `Ticket Estándar` | Priorización comercial para el equipo de ventas. |
| **`lead_quality_score`**| `INTEGER` | Algoritmo de scoring (0 a 100):<br>• Si aporta email y mensaje extenso (>20 car.) ➔ `100`<br>• Si aporta email o mensaje medio (>10 car.) ➔ `70`<br>• Solo teléfono y mensaje básico ➔ `40` | Identificar clientes de alta intención de compra. |
| **`estimated_logistics_cost_eur`** | `FLOAT64` | `distance_to_base_km * 2 * 1.85` (Ida + vuelta a 1.85€/km de góndola) | Previsión del gasto en porte antes de pasar presupuesto. |

---

## 5. 🛡️ Gobernanza del Dato y Cumplimiento Normativo (RGPD)

En consonancia con el plan [`docs/PLAN_CUMPLIMIENTO_RGPD_PRIVACIDAD.md`](file:///c:/Users/alexj/Quintanamur-web/docs/PLAN_CUMPLIMIENTO_RGPD_PRIVACIDAD.md):

1. **Principio de Minimización (Art. 5.1.c RGPD):**
   - Solo se solicitan los campos estrictamente indispensables para elaborar la propuesta económica.
   - Las coordenadas GPS se registran únicamente cuando el usuario interactúa voluntariamente con el mapa o pulsa el botón de detección de ubicación.
2. **Registro de Prueba de Consentimiento (Art. 7.1 RGPD):**
   - Las columnas `privacy_consent_accepted` y `privacy_consent_timestamp` proporcionan prueba digital auditable de la aceptación previa al tratamiento de datos.
3. **Control de Acceso y Cifrado:**
   - La base de datos en Neon exige conexiones cifradas obligatorias mediante SSL (`sslmode=require`).
   - Las credenciales (`NEON_DATABASE_URL` y la clave de servicio `gcp-key.json`) se mantienen fuera del control de versiones (Git).
4. **Política de Retención (Retention Policy):**
   - Los leads inactivos o descartados se mantendrán un máximo de **24 meses**, tras lo cual sus datos identificativos (`client_name`, `client_phone`, `client_email`) pueden ser anonimizados mediante script automático para preservar únicamente las métricas agregadas (municipio, sector, distancia).
