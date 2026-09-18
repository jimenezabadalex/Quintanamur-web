# 📊 Guía Técnica de Business Intelligence con Microsoft Power BI
### Arquitectura Modern Data Stack: Web Astro ➔ Neon PostgreSQL (PostGIS) ➔ Python ELT ➔ Google BigQuery ➔ Power BI Desktop

> **Proyecto:** Quintanamur S.L. Platform  
> **Área:** Data Engineering, Modelado Dimensional y Business Intelligence  
> **Objetivo:** Guía práctica paso a paso para desplegar el almacén de datos en BigQuery y construir un cuadro de mando profesional en Power BI con coste cero y mantenimiento cero (*Zero-Maintenance Portfolio*).

---

## 🗺️ 1. Flujo de Arquitectura del Dato

```
┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│ 1. CAPTACIÓN / WEB      │      │ 2. PIPELINE ELT         │      │ 3. DATA WAREHOUSE       │      │ 4. BUSINESS INTEL.      │
│ • Astro 7 + Cloudflare  │ ───▶ │ • scripts/elt_pipeline.py│ ───▶ │ • Google BigQuery       │ ───▶ │ • Power BI Desktop      │
│ • Neon PostgreSQL       │      │ • Extracción Pandas     │      │ • fact_leads_analytics │      │ • Medidas DAX + Mapas   │
│ • PostGIS (geom)        │      │ • Carga con gcp-key.json│      │ • Star Schema           │      │ • Tema quintanamur.json │
└─────────────────────────┘      └─────────────────────────┘      └─────────────────────────┘      └─────────────────────────┘
```

---

## ☁️ 2. FASE 4: Configuración de Google Cloud BigQuery (Coste Cero)

BigQuery Sandbox ofrece **10 GB de almacenamiento mensual y 1 TB de consultas gratuitas** de por vida, sin necesidad de introducir tarjeta de crédito.

### Paso 2.1: Crear Proyecto en Google Cloud
1. Inicia sesión en [Google Cloud Console](https://console.cloud.google.com/) con tu cuenta de Google.
2. En el selector superior de proyectos, pulsa **"Proyecto nuevo"**:
   * **Nombre del proyecto:** `quintanamur-analytics`
   * Anota tu **ID del proyecto** (ej. `quintanamur-analytics-412300`).

### Paso 2.2: Crear Cuenta de Servicio y Descargar `gcp-key.json`
1. En el menú de navegación lateral, ve a **IAM y administración** ➔ **Cuentas de servicio**.
2. Pulsa **"Crear cuenta de servicio"**:
   * **Nombre:** `bigquery-ingestor`
   * **Rol:** Selecciona **BigQuery** ➔ **Administrador de BigQuery** (o *Data Editor* + *Job User*).
3. Pulsa **Continuar** y **Listo**.
4. Haz clic sobre la cuenta de servicio recién creada ➔ Pestaña **Claves** ➔ **Agregar clave** ➔ **Crear clave nueva**.
5. Selecciona formato **JSON** y pulsa **Crear**.
6. Se descargará un archivo `.json` en tu ordenador:
   * **Cámbiale el nombre a:** `gcp-key.json`.
   * **Muévelo a:** La raíz de tu proyecto `C:\Users\alexj\Quintanamur-web\gcp-key.json`.
   *(Este archivo está protegido en `.gitignore` y jamás se subirá a GitHub).*

---

## 🐍 3. FASE 5: Inyección de Datos y Ejecución del Pipeline ELT

En tu terminal local de Windows:

### Paso 3.1: Instalar Dependencias de Python
```bash
pip install -r requirements.txt
```

### Paso 3.2: Sembrar Datos de Prueba Realistas en Neon
Ejecuta el generador de semillas para inyectar ~65 solicitudes con coordenadas GPS de toda la comarca (Yecla, Jumilla, Villena, Caudete, Almansa, etc.):
```bash
python scripts/seed_demo_leads.py
```
*Salida esperada:* `✅ Sembrado completado con éxito. Total registros en Neon: 65+`.

### Paso 3.3: Ejecutar el Pipeline "One-Click" hacia BigQuery
Ejecuta el script principal:
```bash
python scripts/elt_pipeline.py
```
Este comando realiza automáticamente en 5 segundos:
1. Conexión a Neon PostgreSQL y extracción con Pandas.
2. Creación del Dataset `quintanamur_warehouse` en BigQuery (región `EU`).
3. Carga limpia de la tabla réplica `raw_leads_sync`.
4. Ejecución del script SQL `create_fact_leads_analytics.sql` para generar la tabla de hechos con **Lead Quality Score**, **Segmentos de Negocio** y **Coste de Góndola**.

---

## 📊 4. FASE 6 & 7: Construcción del Dashboard en Power BI Desktop

### Paso 4.1: Conectar Power BI con BigQuery
1. Abre **Power BI Desktop** en Windows.
2. Pulsa en **Obtener datos** ➔ **Más...** ➔ Busca **"Google BigQuery"** ➔ **Conectar**.
3. Pulsa **Iniciar sesión** e introduce tu cuenta de Google Cloud.
4. En el Navegador, despliega:
   `quintanamur-analytics` ➔ `quintanamur_warehouse` ➔ Selecciona **`fact_leads_analytics`**.
5. Elige el modo de conectividad: **Importar** (*Recomendado para máxima velocidad de filtrado e interactividad sin latencia de red*).
6. Pulsa **Cargar**.

---

### Paso 4.2: Importar la Paleta Visual Corporativa (Tema JSON)
Para que los gráficos adopten la estética de Quintanamur (verde agrícola, ocre tierra y fondos claros):
1. En la cinta superior de Power BI, ve a la pestaña **Ver**.
2. En la galería de **Temas**, despliega la flecha inferior ➔ **Buscar temas...**
3. Selecciona el archivo [`bi/quintanamur_theme.json`](file:///c:/Users/alexj/Quintanamur-web/bi/quintanamur_theme.json).
*Listo: Las fuentes, tarjetas y paleta de colores quedan estandarizadas al 100%.*

---

### Paso 4.3: Biblioteca de Medidas DAX (Copiar y Pegar)

Crea una tabla dedicada para medidas o añádelas sobre `fact_leads_analytics` pulsando **Nueva medida**:

#### 1. Volumen Total de Solicitudes
```dax
Total Solicitudes = COUNTROWS(fact_leads_analytics)
```

#### 2. Lead Quality Score Promedio (0 a 100)
```dax
Quality Score Promedio = ROUND(AVERAGE(fact_leads_analytics[lead_quality_score]), 1)
```

#### 3. Coste Logístico Estimado de Góndola (€)
```dax
Coste Portes Total EUR = SUM(fact_leads_analytics[estimated_logistics_cost_eur])
```

#### 4. Coste Logístico Promedio por Trabajo (€)
```dax
Coste Porte Promedio EUR = ROUND(AVERAGE(fact_leads_analytics[estimated_logistics_cost_eur]), 2)
```

#### 5. Distancia Media a Base (km de Yecla)
```dax
Distancia Media KM = ROUND(AVERAGE(fact_leads_analytics[distance_to_base_km]), 1)
```

#### 6. % Solicitudes de Gran Proyecto (>60 km)
```dax
Pct Gran Proyecto = 
DIVIDE(
    CALCULATE(COUNTROWS(fact_leads_analytics), fact_leads_analytics[coverage_status] = "GRAN_PROYECTO"),
    [Total Solicitudes],
    0
)
```

---

### Paso 4.4: Estructura y Distribución del Cuadro de Mando (Layout)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🚜 QUINTANAMUR S.L. | PLATAFORMA DE INTELIGENCIA COMERCIAL Y LOGÍSTICA        [Slicers Fecha]   │
├───────────────────┬───────────────────┬───────────────────┬───────────────────┬──────────────────┤
│ TOTAL SOLICITUDES │ QUALITY SCORE AVG │ COSTE PORTES TOTAL│ DISTANCIA MEDIA   │ % FUERA COBERTURA│
│       65          │     78.4 / 100    │     8.420 €       │     38.2 km       │       24 %       │
├───────────────────┴───────────────────┴───────────────────┴───────────────────┴──────────────────┤
│                                                           │                                      │
│  🗺️ MAPA GEOESPACIAL DE DEMANDA TERRITORIAL               │  🚜 DEMANDA POR TIPO DE MAQUINARIA   │
│  • Ubicación: user_lat, user_lng                          │  • Gráfico de barras horizontales    │
│  • Tamaño burbuja: lead_quality_score                     │  • Rulos despedregadores             │
│  • Color: business_segment                                │  • Motoniveladora con Láser          │
│  (Muestra parcelas en Yecla, Jumilla, Villena, Almansa...) │  • Bulldozer Cat D6                  │
│                                                           │  • Tractor Fendt GPS                 │
├───────────────────────────────────────────────────────────┴──────────────────────────────────────┤
│  📝 LOG DETALLADO DE OPORTUNIDADES COMERCIALES                                                   │
│  • Tabla con: Fecha | Cliente | Municipio | Sector | Maquinaria | Distancia km | Score | Portes €│
│  • Formato condicional: Barra de datos verde para Quality Score y escala de color para Portes.   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⏰ 5. FASE 8: Orquestación Desatendida con GitHub Actions (Viernes Noche)

Para que el almacén de datos de BigQuery se mantenga sincronizado periódicamente sin intervención humana, el repositorio cuenta con un workflow en [`.github/workflows/weekly_elt.yml`](file:///c:/Users/alexj/Quintanamur-web/.github/workflows/weekly_elt.yml).

### ¿Cuándo se ejecuta?
- **Automático:** Cada **viernes a las 22:00 UTC (23:00 / 00:00 hora peninsular española)** mediante un cron programado.
- **Bajo demanda:** En cualquier momento desde GitHub en la pestaña **Actions** ➔ **Weekly ELT Pipeline** ➔ Botón **"Run workflow"**.

### Configuración de Secretos en GitHub (Paso Único)
Para que el runner de GitHub Actions pueda conectarse a Neon y BigQuery sin exponer claves en el código público:

1. En tu repositorio de GitHub, ve a **Settings** ➔ **Secrets and variables** ➔ **Actions**.
2. Pulsa en **New repository secret** y añade los siguientes dos secretos:

| Nombre del Secreto | Valor |
| :--- | :--- |
| `NEON_DATABASE_URL` | Tu cadena de conexión completa de Neon PostgreSQL (la misma que tienes en tu `.env`). |
| `GCP_SA_KEY` | El contenido completo del archivo `gcp-key.json` (abre el archivo en un editor de texto, copia todo el JSON y pégalo). |

3. *(Opcional)* En la pestaña **Variables** puedes configurar `GCP_PROJECT_ID` si tu proyecto en Google Cloud tiene un ID personalizado distinto de `quintanamur-analytics`.

---

## 💼 6. Cómo presentar este Proyecto en tu Portfolio y Entrevistas

1. **Guarda el archivo `.pbix` en el repositorio:**  
   Guarda tu informe terminado como `bi/quintanamur_analytics.pbix`.
2. **Exportar Capturas en Alta Resolución:**  
   Captura la pantalla del informe con datos activos y guárdala en `docs/portfolio/powerbi_dashboard_preview.png`.
3. **El discurso técnico ganador para la entrevista:**
   > *"Diseñé una plataforma de captación y analítica geoespacial para una empresa de maquinaria pesada. Implementé un flujo desacoplado con Astro y Cloudflare Workers en el frontend, base de datos transaccional en Neon Postgres con PostGIS, y un pipeline ELT en Python orquestado de forma desatendida mediante GitHub Actions cada viernes por la noche.*  
   > *En Google BigQuery modelé un Star Schema donde calculo el Lead Quality Score y el coste de transporte de góndola por kilómetro según la distancia GPS. Finalmente, conecté Power BI Desktop para que la gerencia visualice un mapa de calor de parcelas y tome decisiones estratégicas sobre despliegue de maquinaria fuera del radio de 60 km con coste cero de mantenimiento (FinOps)."*

---

## ⚖️ 7. Mantenimiento y Costes: Cero Absoluto (FinOps)

* **¿Hay costes mensuales?** **0,00 €.** BigQuery Sandbox, GitHub Actions (consume ~3,5 min/mes de los 2.000 min gratis) y Power BI Desktop son completamente gratuitos.
* **¿Se puede romper?** **No.** El pipeline usa idempotencia limpia (`WRITE_TRUNCATE` en réplica + regeneración controlada del *Star Schema*). Puedes abrir el informe, interactuar con los filtros y compartirlo en pantalla en cualquier entrevista sin depender de servidores de pago ni procesos frágiles.

