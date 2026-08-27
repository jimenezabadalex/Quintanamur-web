# [AGENT-RULES] Workspace Context: Quintanamur S.L. Project

## 1. Identidad y Propósito del Proyecto
- **Cliente / Negocio:** Quintanamur S.L. (transición de autónomo local a sociedad consolidada de movimiento de tierras y servicios agrícolas).
- **Audiencia Dual:** La arquitectura y el diseño deben guiar sin fricción tanto al Perfil A (Sector Agrícola: agricultores, cooperativas) como al Perfil B (Obra Civil: promotoras, constructoras, ayuntamientos).
- **Objetivo del Código:** Desarrollar un producto web optimizado tanto para servir como escaparate comercial de alto rendimiento como para actuar como una fuente de datos (*Data Source*) fiable para futuras integraciones analíticas.

## 2. Restricciones Técnicas Obligatorias (Jamstack & Performance)
- **Framework Principal:** Utilizar **Astro** para generar HTML estático puro. La web no debe procesar bases de datos en el momento de la carga para eliminar tiempos de espera[cite: 1].
- **Enfoque Mobile-First:** El 80% del tráfico proviene de zonas rurales o extrarradio con conexiones inestables. Priorizar la carga ultrarrápida (Core Web Vitals impecables) y componentes adaptados a pantallas móviles.
- **Estilos:** Utilizar **Tailwind CSS** para construir la interfaz dual con clases utilitarias, manteniendo un peso mínimo en la hoja de estilos[cite: 1].
- **Gestión de Contenido:** El catálogo de maquinaria pesada debe desacoplarse mediante un **Headless CMS**[cite: 1] (ej. Sanity o Decap CMS), permitiendo al cliente final autogestionar textos e imágenes sin modificar el código fuente ni poner en riesgo la seguridad de la web[cite: 1].

## 3. Arquitectura de Datos y Captura de Leads
- **Separación de Responsabilidades:** El almacenamiento visual (Headless CMS) está estrictamente separado de la lógica de negocio y transaccional.
- **Base de Datos Propia:** La recolección y procesamiento de leads se gestiona de manera independiente mediante una Base de Datos Transaccional propia[cite: 1] (ej. PostgreSQL/Supabase).
- **Formulario Inteligente:** Los envíos de formularios deben estructurarse en formato JSON limpio (incluyendo `lead_id`, `timestamp`, `origen_servicio`, `ubicacion_postal` y `descripcion_libre`) para facilitar su posterior procesamiento mediante pipelines analíticos o modelos de NLP[cite: 1].

## 4. Lineamientos de Ejecución para el Agente
- Prioriza siempre código limpio, modular y reutilizable en Astro (`.astro`).
- No introduzcas dependencias innecesarias de JavaScript en el cliente para mantener el rendimiento al máximo.
- Cada componente de interfaz (como botones Click-to-Call o selectores de servicios) debe ser accesible y estar optimizado para pantallas táctiles en movilidad.

## 5. Git Commits
- Cada vez que termines una subtarea con éxito (por ejemplo, al finalizar la creación del Layout, o al migrar la página de Maquinaria), debes ejecutar automáticamente los comandos de Git necesarios (git add . y git commit -m) utilizando estrictamente el estándar de Conventional Commits (ej.feat: estandarizada pagina de maquinaria con Tailwind).

