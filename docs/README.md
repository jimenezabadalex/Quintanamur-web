# 📚 Centro de Documentación Técnica - Quintanamur S.L.

Bienvenido a la base de conocimiento y documentación técnica de la plataforma web de **Quintanamur S.L.**  
Este repositorio contiene las guías de arquitectura, diseño de bases de datos, resiliencia frontend, cumplimiento legal y el portfolio técnico de analítica de datos.

---

## 🗂️ Mapa de Contenidos por Sección

```
docs/
├── 📁 datos/                   # Arquitectura de Datos, BBDD y Pipelines
│   ├── GUIA_INTEGRACION_DATOS_NEON_BIGQUERY.md
│   ├── INFORME_DISENO_BBDD_NEON_BIGQUERY.md
│   └── FLUJO_DATOS_Y_EJEMPLO_NEON.md
├── 📁 formulario/              # Experiencia de Usuario, Validación y Resiliencia
│   └── PROTOCOLO_GESTION_FALLOS_FORMULARIO.md
├── 📁 legal/                   # Cumplimiento Normativo y Privacidad
│   └── PLAN_CUMPLIMIENTO_RGPD_PRIVACIDAD.md
├── 📁 portfolio/               # Casos de Uso y Portfolio para Consultoría
│   └── INFORME_DATOS_PORTFOLIO.md
└── 📄 README.md                # Este índice general
```

---

## 📂 1. Arquitectura de Datos y Backend (`docs/datos/`)

Documentación relativa al almacenamiento transaccional (OLTP), analítico (OLAP) y pipelines ELT:

* 📖 [**`GUIA_INTEGRACION_DATOS_NEON_BIGQUERY.md`**](file:///c:/Users/alexj/Quintanamur-web/docs/datos/GUIA_INTEGRACION_DATOS_NEON_BIGQUERY.md)  
  *Guía paso a paso para principiantes:* Conexión del frontend con Neon PostgreSQL (PostGIS), pipeline incremental en Python y carga en Google BigQuery para su posterior explotación en Power BI / Looker Studio.
* 📖 [**`INFORME_DISENO_BBDD_NEON_BIGQUERY.md`**](file:///c:/Users/alexj/Quintanamur-web/docs/datos/INFORME_DISENO_BBDD_NEON_BIGQUERY.md)  
  *Diccionario técnico de base de datos:* Estructura de las tablas `raw_leads` y `raw_web_events`, tipos de datos, gatillos espaciales PostGIS, índices optimizados y modelado dimensional en estrella (*Star Schema*).
* 📖 [**`FLUJO_DATOS_Y_EJEMPLO_NEON.md`**](file:///c:/Users/alexj/Quintanamur-web/docs/datos/FLUJO_DATOS_Y_EJEMPLO_NEON.md)  
  *Caso práctico real:* Explicación del ciclo de vida del dato desde la pulsación de "Enviar" en el navegador hasta la inserción en Neon, con el ejemplo de la Finca El Campillo en Jumilla (JSON, SQL parametrizado y PostGIS).

---

## 📂 2. Formulario y Resiliencia Frontend (`docs/formulario/`)

Documentación sobre la experiencia del usuario, control de entradas y tolerancia a fallos:

* 📖 [**`PROTOCOLO_GESTION_FALLOS_FORMULARIO.md`**](file:///c:/Users/alexj/Quintanamur-web/docs/formulario/PROTOCOLO_GESTION_FALLOS_FORMULARIO.md)  
  *Protocolo de contingencia y resiliencia:* Gestión de errores en 4 niveles (preservación de datos sin reseteo, diagnóstico amigable, fallback comercial a WhatsApp con datos pre-redactados y respaldo local en `localStorage`). Incluye análisis crítico de inconvenientes técnicos (*trade-offs*) y sus mitigaciones.

---

## 📂 3. Cumplimiento Legal y Privacidad (`docs/legal/`)

Documentación sobre gobernanza de datos y adecuación jurídica:

* 📖 [**`PLAN_CUMPLIMIENTO_RGPD_PRIVACIDAD.md`**](file:///c:/Users/alexj/Quintanamur-web/docs/legal/PLAN_CUMPLIMIENTO_RGPD_PRIVACIDAD.md)  
  *Plan de Privacidad y RGPD:* Adaptación al RGPD (Reglamento UE 2016/679) y LOPDGDD mediante la herramienta Facilita RGPD de la AEPD. Arquitectura *Privacy by Design*, registro de pruebas de consentimiento, minimización de datos de geolocalización y política de cookies.

---

## 📂 4. Portfolio Técnico y Consultoría (`docs/portfolio/`)

Estrategia analítica y presentación de proyectos para procesos de selección:

* 📖 [**`INFORME_DATOS_PORTFOLIO.md`**](file:///c:/Users/alexj/Quintanamur-web/docs/portfolio/INFORME_DATOS_PORTFOLIO.md)  
  *Portfolio de ingeniería y analítica de datos:* Taxonomía de datos instrumentables (geodatos, comportamiento, conversión B2B), arquitectura Modern Data Stack y 3 proyectos de alto impacto (Inteligencia Geoespacial fuera del radio de 100 km, Lead Scoring predictivo con Machine Learning y modelado con dbt/BigQuery).
