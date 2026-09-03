# 📊 Informe Estratégico: Extracción, Ingeniería y Analítica de Datos (Portfolio para Consultoría)

> **Documento de Referencia para Desarrollo de Proyectos de Datos (Data Analytics, Data Engineering, Data Science / BI)**  
> **Proyecto:** Quintanamur S.L. Web Platform  
> **Objetivo:** Portfolio técnico para candidaturas en consultoras tecnológicas (ej. Capgemini, NTT DATA, Deloitte, Accenture).

---

## 1. 🗂️ Taxonomía de Datos Extraíbles e Instrumentables

```
                                  FUENTES DE DATOS WEB
                                           │
         ┌──────────────────┬──────────────┴──────────────┬──────────────────┐
         ▼                  ▼                             ▼                  ▼
  [ GEODATOS & MAPA ]  [ LEAD GENERATION ]     [ COMPORTAMIENTO ]     [ TÉCNICOS & UTM ]
  • Coords (Lat/Lng)   • Sector (Agri/Civil)   • Quick-jump clicks    • Dispositivo (OS)
  • Distancia Haversine • Municipio / Finca    • Scroll Depth (%)     • Modo (Dark/Light)
  • Zona (In/Out 100km)• Longitud Mensaje      • Clics CTA / WhatsApp • Origen / Campaña
  • Intentos Búsqueda  • Time-to-Submit        • Tiempo por sección   • Web Share triggers
```

### A. Datos Geoespaciales y de Logística (Diferencial Clave)
| Variable | Tipo de Dato | Descripción y Utilidad de Negocio |
| :--- | :--- | :--- |
| `user_lat`, `user_lng` | `Float` | Coordenadas exactas del usuario al usar geolocalización o hacer clic en el mapa Leaflet. |
| `distance_to_base_km` | `Float` | Distancia calculada por la fórmula de Haversine respecto a la base de Yecla. |
| `coverage_status` | `Categoría` | Flag enum: `ZONA_PRIORITARIA` (<=100 km) vs `GRAN_PROYECTO` (>100 km). |
| `searched_municipality` | `String` | Texto exacto introducido en el buscador de municipios (ej. "Almansa", "Villena", "Jumilla"). |
| `geolocation_method` | `Enum` | Método empleado: `GPS_AUTO` (navegador), `MANUAL_PIN` (clic en mapa), `SEARCH_BOX`. |

### B. Datos de Captación de Leads y Formulario (Conversión B2B)
| Variable | Tipo de Dato | Descripción y Utilidad de Negocio |
| :--- | :--- | :--- |
| `lead_sector` | `Categórica` | Sector demandado: `Servicios Agrícolas`, `Obra Civil / Excavación`, `Otro`. |
| `lead_location_text` | `String` | Nombre de la finca o población declarada en el input del formulario. |
| `message_char_length` | `Entero` | Extensión del mensaje descriptivo del trabajo solicitado. |
| `form_completion_time_sec` | `Numérico` | Segundos transcurridos desde que el usuario enfoca el primer campo hasta que pulsa "Enviar". |
| `form_drop_off_field` | `String` | Campo donde el usuario abandonó el formulario si no llegó a enviar. |

### C. Datos de Micro-Interacciones y Navegación
| Variable | Tipo de Dato | Descripción y Utilidad de Negocio |
| :--- | :--- | :--- |
| `quick_jump_click` | `String` | Clics en la barra flotante móvil: `Tractores`, `Retropala`, `Aperos`, `Agrícolas`, `Excavaciones`. |
| `service_card_cta_click` | `String` | Servicio específico que despertó interés (ej. "Despedregado", "Plantación GPS", "Desfonde"). |
| `channel_conversion` | `Enum` | Canal de salida: `Formulario_Web`, `WhatsApp_Click`, `Phone_Call`, `Instagram_Visit`. |
| `web_share_trigger` | `Booleano` | Si el usuario interactuó con el botón de compartir web (`Web Share API` o portapapeles). |
| `scroll_depth_percent` | `Entero (0-100)` | Profundidad de lectura en cada página antes de abandonar o convertir. |

### D. Datos de Contexto Técnico y Sesión
| Variable | Tipo de Dato | Descripción |
| :--- | :--- | :--- |
| `session_id`, `user_pseudo_id` | `UUID` | Identificador de sesión anónimo (GDPR compliant). |
| `device_category` | `Enum` | `Mobile`, `Desktop`, `Tablet`. |
| `color_theme_preference` | `Enum` | `Dark Mode`, `Light Mode`. |
| `referrer_source` | `String` | Tráfico orgánico Google, directo, redes sociales o campañas. |

---

## 2. 🏗️ Arquitectura de Datos de Referencia (Modern Data Stack)

Arquitectura desacoplada en la nube recomendada para presentar en consultoría:

```mermaid
flowchart LR
    A[Quintanamur Web\nEvent Tracking] -->|Webhook / API| B[Ingesta\nFastAPI / Cloud Functions]
    B -->|Raw JSON| C[Data Lake / Storage\nAWS S3 / GCP GCS]
    C -->|ELT Pipeline| D[Cloud Data Warehouse\nSnowflake / BigQuery]
    D -->|Transformación\ndbt Core| E[Modelos Dimensionales\nStar Schema (Kimball)]
    E --> F[BI & Dashboards\nPower BI / Looker Studio]
    E --> G[Machine Learning\nPython / Scikit-Learn]
```

---

## 3. 🎯 3 Proyectos de Alto Impacto para Portfolio

### 🚀 Proyecto 1: *Logistics & Geospatial Demand Intelligence Platform* (Enfoque BI / Data Analytics)
* **Problema de Negocio:** La empresa tiene un radio de 100 km desde Yecla. ¿Dónde se concentra la demanda latente fuera de radio? ¿Sería rentable abrir una base secundaria en Alicante o Albacete?
* **Entregables:**
  1. Captura de eventos de búsqueda y clics de coordenadas en el mapa.
  2. Generación de un **Mapa de Calor Geoespacial (Heatmap)** con capas de densidad de demanda (KDE - Kernel Density Estimation).
  3. **Dashboard en Power BI / Tableau** que calcule el coste logístico estimado por kilómetro y el beneficio potencial de atender solicitudes fuera de zona.
* **Valor para Selección:** Demuestra dominio de datos espaciales, GIS, cálculo de KPIs de coste logístico y dashboards directivos.

---

### 🚀 Proyecto 2: *Predictive Lead Scoring & Sector Affinity Model* (Enfoque Data Science / ML)
* **Problema de Negocio:** Clasificar qué visitantes tienen mayor propensión a convertirse en clientes de alto valor (obras de gran envergadura vs trabajos agrícolas recurrentes).
* **Entregables:**
  1. Extracción de variables de comportamiento: tiempo en página de maquinaria, servicios visualizados, uso de botones rápidos, distancia en km, longitud de mensaje.
  2. Modelo de clasificación supervisada (Random Forest / XGBoost / Regresión Logística) para predecir la probabilidad de conversión (`Lead Conversion Score`).
  3. Interpretabilidad mediante **SHAP values** para explicar las variables críticas al equipo comercial.
* **Valor para Selección:** Demuestra conocimiento de ML aplicado a problemas reales de negocio, métricas de evaluación (AUC-ROC, F1-Score) y explicabilidad (XAI).

---

### 🚀 Proyecto 3: *End-to-End ELT Pipeline & Dimensional Modeling con dbt y BigQuery/Snowflake* (Enfoque Data Engineering)
* **Problema de Negocio:** Datos de eventos web desestructurados en formato JSON que requieren estructuración y gobierno para consumo analítico.
* **Entregables:**
  1. Pipeline de extracción y carga de eventos a BigQuery o Snowflake.
  2. Modelado dimensional en **dbt** bajo metodología Kimball:
     - **Tablas de Hechos:** `fact_page_views`, `fact_map_interactions`, `fact_lead_submissions`.
     - **Tablas de Dimensiones:** `dim_user`, `dim_service`, `dim_geography`, `dim_device`.
  3. Pruebas de calidad automáticas con `dbt tests` (unicidad, no nulos, integridad referencial).
* **Valor para Selección:** dbt y Snowflake/BigQuery son el estándar actual más solicitado en consultoría corporativa.

---

## 4. 🛠️ Stack Tecnológico Sugerido

| Capa | Tecnologías |
| :--- | :--- |
| **Captura / Tracking** | Google Tag Manager, custom JavaScript event listeners, Webhooks |
| **Ingesta & Storage** | Google Cloud Storage / AWS S3, Cloud Functions / FastAPI |
| **Data Warehouse** | Google BigQuery o Snowflake |
| **Transformación & Modelado** | **dbt (data build tool)**, SQL Avanzado (Window Functions, CTEs) |
| **Data Science / ML** | Python (Pandas, Scikit-Learn, XGBoost, GeoPandas, Shap) |
| **Visualización / BI** | **Power BI**, Looker Studio o Streamlit |
| **Control de Versiones / CI-CD** | Git, GitHub Actions, Docker |

---

## 5. 📝 Guía para CV y LinkedIn

> **Título del Proyecto:**  
> *B2B Geospatial & Conversion Analytics Engine for Heavy Machinery Platform (Quintanamur S.L.)*
>
> **Bullet points para el CV:**
> - Diseñé e implementé una arquitectura ELT de datos web integral utilizando **Python, BigQuery y dbt**, modelando más de 10+ métricas de negocio y eventos geoespaciales.
> - Construí un motor de inteligencia geoespacial para optimizar rutas logísticas y analizar la demanda no atendida en un radio de 100 km desde Yecla, identificando oportunidades de expansión territorial.
> - Desarrollé un cuadro de mando ejecutivo en **Power BI** para monitorización de embudos de conversión B2B, reduciendo la fricción en el formulario y analizando la atribución de leads multicanal (WhatsApp/Web).
> - Implementé modelos de scoring de leads con **Scikit-Learn/XGBoost** para priorización automática de oportunidades comerciales.
