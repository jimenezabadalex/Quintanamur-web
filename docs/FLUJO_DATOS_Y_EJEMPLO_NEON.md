# 🚜 Flujo de Ingesta de Datos: Formulario Web -> API Serverless -> Neon PostgreSQL

> **Proyecto:** Quintanamur S.L. Platform  
> **Documentos Relacionados:**  
> - [`docs/INFORME_DISENO_BBDD_NEON_BIGQUERY.md`](file:///c:/Users/alexj/Quintanamur-web/docs/INFORME_DISENO_BBDD_NEON_BIGQUERY.md)  
> - [`docs/GUIA_INTEGRACION_DATOS_NEON_BIGQUERY.md`](file:///c:/Users/alexj/Quintanamur-web/docs/GUIA_INTEGRACION_DATOS_NEON_BIGQUERY.md)  
> - [`src/pages/contacto.astro`](file:///c:/Users/alexj/Quintanamur-web/src/pages/contacto.astro)  
> **Propósito:** Explicar con un caso real cómo viajan los datos recopilados por el formulario y el mapa interactivo hasta quedar almacenados en la base de datos PostgreSQL de Neon.

---

## 1. 🗺️ Diagrama del Flujo en 4 Pasos

```
┌────────────────────────┐      POST (JSON)     ┌─────────────────────────┐     INSERT (SSL)    ┌─────────────────────────┐
│ 1. NAVEGADOR (Cliente) │ ───────────────────▶ │ 2. ENDPOINT SERVERLESS  │ ──────────────────▶ │ 3. NEON (PostgreSQL)    │
│  Formulario + Leaflet  │    (HTTPS Seguro)    │     `/api/lead.ts`      │  (SQL Parametrizado)│  Tabla: `raw_leads`     │
└────────────────────────┘                      └─────────────────────────┘                     └─────────────────────────┘
                                                                                                             │
                                                                                                    Trigger PostGIS
                                                                                                             ▼
                                                                                                Calcula columna `geom`
```

### Paso 1: Captura Híbrida en el Navegador (Frontend)
- El usuario completa los datos en el formulario: nombre, teléfono, sector y descripción del trabajo.
- Al interactuar con el mapa Leaflet (o pulsar el botón de geolocalización), la aplicación calcula automáticamente en el cliente:
  - Latitud (`user_lat`) y Longitud (`user_lng`).
  - Nombre del municipio mediante geocodificación inversa.
  - Distancia geodésica a Yecla (`distance_to_base_km`) usando la fórmula de Haversine.
  - Clasificación operativa: `ZONA_PRIORITARIA` (≤100 km) o `GRAN_PROYECTO` (>100 km).

### Paso 2: Envío Seguro por API (Por qué no conectar directo a la BD)
- Si el frontend se conectara directamente a PostgreSQL, la contraseña de la base de datos quedaría expuesta a cualquier visitante en las herramientas de desarrollo del navegador.
- En su lugar, el navegador empaqueta la información en un objeto **JSON** y realiza una petición `POST` al endpoint interno de la plataforma: `/api/lead`.

### Paso 3: Validación e Inserción en el Servidor (Backend)
- El endpoint serverless recupera de forma segura la cadena de conexión cifrada mediante variables de entorno (`process.env.NEON_DATABASE_URL`).
- Valida que el consentimiento RGPD sea afirmativo (`privacy_consent_accepted === true`) y que los campos indispensables existan.
- Inserta los datos mediante **SQL parametrizado**, protegiendo la base de datos frente a ataques de inyección SQL.

### Paso 4: Persistencia y Enriquecimiento Geoespacial
- Neon almacena el registro en la tabla `raw_leads`.
- El disparador (*trigger*) automático `trg_update_lead_geom` convierte la latitud y longitud en un punto geométrico nativo de **PostGIS** (`geom`), permitiendo posteriores mapas de calor y análisis de densidad territorial en BigQuery y Power BI.

---

## 2. 📝 Ejemplo Práctico de Extremo a Extremo

### Escenario:
**Don Julián**, propietario de la finca *El Campillo* en **Jumilla**, necesita despedregar una parcela para una plantación de almendros.

---

### A. Datos recogidos en la interfaz (`contacto.astro`)

* **Sector seleccionado:** Servicios Agrícolas
* **Nombre:** Finca El Campillo (Julián)
* **Teléfono:** `+34 612 34 56 78`
* **Ubicación en el mapa:** Jumilla (Murcia)
* **Coordenadas capturadas:** Latitud `38.4752`, Longitud `-1.3256`
* **Distancia calculada:** `28.4 km` de la base de Yecla
* **Estado de cobertura:** `ZONA_PRIORITARIA`
* **Mensaje:** *"Despedregado de 15 hectáreas con rulo antes de siembra de almendros."*
* **Consentimiento legal:** Casilla RGPD marcada (`true`)

---

### B. Carga útil enviada por la red (Payload JSON)

Al hacer clic en "Enviar Solicitud", el navegador envía esta estructura JSON al servidor:

```json
{
  "client_name": "Finca El Campillo (Julián)",
  "client_phone": "+34 612 34 56 78",
  "client_email": null,
  "service_category": "agricola",
  "machinery_interest": "Rulos despedregadores",
  "municipality_name": "Jumilla",
  "user_lat": 38.4752,
  "user_lng": -1.3256,
  "distance_to_base_km": 28.4,
  "coverage_status": "ZONA_PRIORITARIA",
  "message_text": "Despedregado de 15 hectáreas con rulo antes de siembra de almendros.",
  "privacy_consent_accepted": true
}
```

---

### C. Consulta ejecutada en Neon PostgreSQL

El backend ejecuta la inserción segura mediante SSL:

```sql
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
    lead_source,
    lead_status
) VALUES (
    'Finca El Campillo (Julián)',
    '+34 612 34 56 78',
    NULL,
    'agricola',
    'Rulos despedregadores',
    'Jumilla',
    38.4752,
    -1.3256,
    28.4,
    'ZONA_PRIORITARIA',
    'Despedregado de 15 hectáreas con rulo antes de siembra de almendros.',
    TRUE,
    NOW(),
    'WEB_FORM',
    'NUEVO'
)
RETURNING lead_id;
```

---

### D. Registro final almacenado en la tabla `raw_leads`

| Columna en Neon | Valor Almacenado | Utilidad / Observaciones |
| :--- | :--- | :--- |
| **`lead_id`** | `42` | Clave primaria generada automáticamente. |
| **`created_at`** | `2026-09-03 17:01:25+00` | Timestamp UTC auditable. |
| **`client_name`** | `Finca El Campillo (Julián)` | Identificación del cliente. |
| **`client_phone`** | `+34 612 34 56 78` | Teléfono directo para contactar en <24h. |
| **`service_category`** | `agricola` | Clasificación de sector comercial. |
| **`machinery_interest`** | `Rulos despedregadores` | Tipo de apero demandado. |
| **`municipality_name`** | `Jumilla` | Población de la actuación. |
| **`user_lat`**, **`user_lng`** | `38.4752`, `-1.3256` | Georreferenciación exacta. |
| **`distance_to_base_km`** | `28.4` | Cálculo logístico respecto a Yecla. |
| **`coverage_status`** | `ZONA_PRIORITARIA` | Dentro del radio preferente de 100 km. |
| **`message_text`** | `Despedregado de 15 hectáreas...` | Detalles de la labor agrícola. |
| **`privacy_consent_accepted`** | `TRUE` | Evidencia de consentimiento RGPD. |
| **`privacy_consent_timestamp`**| `2026-09-03 17:01:25+00` | Prueba jurídica inmutable. |
| **`lead_source`** | `WEB_FORM` | Canal de adquisición. |
| **`lead_status`** | `NUEVO` | Estado inicial para el CRM / equipo comercial. |
| **`geom`** | `0101000020E6100000305...` | Geometría PostGIS generada por el trigger para BI. |

---

## 3. 🎯 Respuesta al Usuario

Una vez insertado el registro en Neon, el servidor responde al navegador con código HTTP `200 OK`:

```json
{
  "success": true,
  "lead_id": 42,
  "message": "Solicitud registrada correctamente."
}
```

La interfaz muestra una confirmación visual al usuario indicando que su solicitud ha sido recibida y que el equipo de Quintanamur contactará con él en menos de 24 horas laborables.
