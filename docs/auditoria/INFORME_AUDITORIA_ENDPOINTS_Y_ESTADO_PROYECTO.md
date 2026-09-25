# 📋 Informe Técnico: Auditoría de Conexiones, Endpoints y Estado del Proyecto Web

**Proyecto:** Web Corporativa Quintanamur S.L.  
**Fecha de Ejecución:** 25 de septiembre de 2026  
**Entorno Auditado:** Servidor de Aplicación Local (Astro Serverless Cloudflare Adapter)  
**Herramienta de Verificación Automatizada:** `scripts/verify_endpoints.mjs` (`npm run test:endpoints`)  
**Resultado Global:** ✅ **100% Superado (14/14 comprobaciones satisfactorias)**

---

## 1. 🎯 Finalidad y Alcance del Proyecto Web

La plataforma digital de **Quintanamur S.L.** ha sido concebida no como una web estática convencional, sino como un **sistema integral de captación, cualificación comercial y analítica operativa** para el sector de la maquinaria agrícola y la obra civil pesada en el sureste español (base operativa en Yecla, Murcia).

### Objetivos Clave de la Plataforma:
1. **Captación y Conversión de Leads B2B/B2C:**
   - Presentación de servicios especializados (despedregado con tecnología GPS, desmonte, movimiento de tierras, zanjas y trituración).
   - Formulario de contacto inteligente con geolocalización asistida mediante la fórmula de Haversine (cálculo de radio de cobertura de 60-100 km).
2. **Automatización Operativa Instantánea:**
   - Despacho inmediato de notificaciones en tiempo real al equipo comercial mediante **Telegram Bot API**, incluyendo enlaces directos para contactar al cliente por WhatsApp con un solo clic y ubicación GPS en Google Maps.
   - Sistema de alertas técnicas críticas (`CRIT-01` a `CRIT-04`) ante fallos de base de datos o intentos de saturación por bots.
3. **Gobierno del Dato y Business Intelligence:**
   - Registro inmutable y transaccional en **Neon PostgreSQL**.
   - Pipeline automatizado ELT (`scripts/elt_pipeline.py`) hacia **Google BigQuery** con modelo Star Schema para cuadros de mando en **Power BI**.
4. **Cumplimiento Legal y Privacidad por Diseño (Privacy by Design):**
   - Garantía de conformidad con el **RGPD** y la **LOPDGDD**: minimización de telemetría de geolocalización en navegador, caducidad de borradores (TTL 24h), registro temporal de consentimientos y disociación de PII en analítica.

---

## 2. 🛠️ Trabajos Realizados en Esta Sesión

En el marco de la presente auditoría y puesta a punto, se ejecutaron las siguientes actuaciones:

### A. Creación de la Suite de Auditoría de Endpoints
- Se programó la herramienta [verify_endpoints.mjs](file:///C:/Users/alexj/Quintanamur-web/scripts/verify_endpoints.mjs), capaz de:
  - Levantar de forma autónoma el servidor de desarrollo en un subproceso aislado.
  - Ejecutar una batería completa de peticiones HTTP sintéticas.
  - Validar códigos de estado (200, 400, 404), cabeceras `Content-Type` y estructura semántica de respuestas JSON.
  - Soportar el paso de URLs remotas (`node scripts/verify_endpoints.mjs https://...`) para auditorías en entornos de producción o staging.
- Se configuró el script directo en [package.json](file:///C:/Users/alexj/Quintanamur-web/package.json):
  ```bash
  npm run test:endpoints
  ```

### B. Corrección y Normalización de Activos Gráficos
- Actualización de la card de especialidades de obra civil en la portada ([index.astro](file:///C:/Users/alexj/Quintanamur-web/src/pages/index.astro)), apuntando a la imagen WebP optimizada `/images/home/servicios-obra-civil.webp`.
- Verificación de integridad de carga y resolución HTTP 200 en todos los recursos multimedia clave del frontend.

### C. Despliegue de Cabeceras HTTP de Seguridad Perimetral
- Creación y configuración del archivo [_headers](file:///C:/Users/alexj/Quintanamur-web/public/_headers) para Cloudflare Pages, blindando la distribución perimetral con:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (HSTS estricto a 1 año).
  - `X-Frame-Options: DENY` (prevención de ataques de Clickjacking).
  - `X-Content-Type-Options: nosniff` (mitigación de ataques MIME-sniffing).
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=()` (restringe la geolocalización exclusivamente al dominio propio y bloquea hardware no utilizado).
  - `Content-Security-Policy (CSP)` estricta autorizando fuentes Google Fonts, CDNs requeridas y restringiendo destinos de formularios y scripts.

### D. Ampliación y Blindaje del Plan Legal RGPD / LOPDGDD
- Consolidación del documento técnico-legal [PLAN_CUMPLIMIENTO_RGPD_PRIVACIDAD.md](file:///C:/Users/alexj/Quintanamur-web/docs/legal/PLAN_CUMPLIMIENTO_RGPD_PRIVACIDAD.md):
  - Inclusión de la **FAQ Técnica y Jurídica** con 5 argumentarios preparados para inspecciones de la AEPD (Accountability, minimización de datos, TTL de 24h en formularios, disociación en BI y sanitización de credenciales).
  - Elaboración de la **Matriz de Checklist de Conformidad Técnica** con 12 puntos de control.

---

## 3. 📊 Matriz de Resultados de la Auditoría

Se ejecutaron 14 pruebas automáticas cubriendo vistas principales, activos multimedia, páginas de error y vectores defensivos de la API:

| Grupo | Endpoint / Recurso | Método | Código Esperado | Código Devuelto | Latencia | Estado |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Vistas Web** | `/` (Home / Portada) | `GET` | `200 OK` | `200` | 71 ms | ✅ Correcto |
| **Vistas Web** | `/contacto` | `GET` | `200 OK` | `200` | 120 ms | ✅ Correcto |
| **Vistas Web** | `/maquinaria` | `GET` | `200 OK` | `200` | 110 ms | ✅ Correcto |
| **Vistas Web** | `/servicios` | `GET` | `200 OK` | `200` | 121 ms | ✅ Correcto |
| **Vistas Web** | `/sobre-nosotros` | `GET` | `200 OK` | `200` | 93 ms | ✅ Correcto |
| **Multimedia** | `/images/home/servicios-obra-civil.webp` | `GET` | `200 OK` | `200` | 3 ms | ✅ Correcto |
| **Multimedia** | `/images/home/servicios-agricolas.webp` | `GET` | `200 OK` | `200` | 2 ms | ✅ Correcto |
| **Multimedia** | `/favicon.svg` | `GET` | `200 OK` | `200` | 2 ms | ✅ Correcto |
| **Control 404**| `/ruta-aleatoria-test` | `GET` | `404 Not Found` | `404` | 88 ms | ✅ Controlado |
| **Seguridad API**| `/api/lead` (Sin credenciales) | `GET` | `404 Not Found` | `404` | 172 ms | ✅ Modo Sigilo |
| **Seguridad API**| `/api/lead` (Payload JSON vacío) | `POST` | `400 Bad Request` | `400` | 53 ms | ✅ Controlado |
| **Seguridad API**| `/api/lead` (Teléfono inválido) | `POST` | `400 Bad Request` | `400` | 23 ms | ✅ Controlado |
| **Seguridad API**| `/api/lead` (Sin consentimiento RGPD) | `POST` | `400 Bad Request` | `400` | 22 ms | ✅ Controlado |
| **Seguridad API**| `/api/lead` (Honeypot Anti-Bot) | `POST` | `200 OK (Tarpit)` | `200` | 24 ms | ✅ Trampa Bot |

---

## 4. 🔍 Análisis Detallado del Comportamiento Defensivo

### 1. Páginas Públicas y Multimedia (Rendimiento y Disponibilidad)
- Todas las rutas estáticas prerenderizadas responden en menos de 125 ms en frío, garantizando un índice de disponibilidad y experiencia de usuario excelente.
- Los recursos estáticos e imágenes clave se entregan de forma inmediata (<3 ms) listos para la capa de caché perimetral de Cloudflare.

### 2. Modo Sigilo en `GET /api/lead`
- Si un atacante o escáner automatizado intenta descubrir endpoints internos mediante peticiones `GET /api/lead`, la aplicación responde **`404 Not Found`** en lugar de `401 Unauthorized` o `403 Forbidden`.
- **Ventaja de seguridad:** Evita confirmar la existencia de un endpoint administrativo a herramientas de reconocimiento pasivo. Solo con la cabecera `x-admin-key` correcta se desbloquea el panel de diagnóstico interno.

### 3. Validación Estricta de Entradas en `POST /api/lead`
- **Cuerpo Vacío:** La API detecta la ausencia de campos requeridos y aborta la ejecución antes de alcanzar el driver de base de datos (`400 Bad Request`), protegiendo el pool de conexiones de Neon.
- **Validación de Teléfono:** Se exige formato estricto de telefonía española de 9 dígitos que comience por 6, 7, 8 o 9 (`/^[6789]\d{8}$/`). Peticiones con formatos maliciosos o scripts se rechazan en memoria.
- **Blindaje Legal RGPD:** Cualquier intento de envío donde `privacy_consent_accepted` no sea estrictamente `true` es denegado con código 400 y mensaje explicativo al usuario.

### 4. Trampa Silenciosa Honeypot Anti-Bot (Tarpit)
- Se incluye el campo invisible `business_website`. Si un bot rellena este campo automáticamente:
  - La API devuelve una respuesta simulada `200 OK` con `lead_id: 0`.
  - El bot asume que su ataque tuvo éxito y cesa el reintento.
  - El sistema **no realiza inserción en PostgreSQL** ni despacha alertas a Telegram, protegiendo los recursos de la empresa de spam.

### 5. Políticas Perimetrales y Cabeceras HTTP en Edge (`public/_headers`)
- La implementación en [public/_headers](file:///C:/Users/alexj/Quintanamur-web/public/_headers) asegura que todas las respuestas emitidas por Cloudflare Pages incluyan cabeceras defensivas para mitigar ataques XSS, Clickjacking, MIME-sniffing y navegación insegura vía HTTP plano mediante HSTS estricto.

---

## 5. 🏗️ Estado Global del Proyecto Web

| Componente / Módulo | Estado Actual | Observaciones Técnicas |
| :--- | :---: | :--- |
| **Frontend & UI (Astro 5 + Tailwind)** | 🟢 **100% Operativo** | Diseño responsive optimizado, modo oscuro, video hero con swap inverso, tipografías e imágenes adaptativas. |
| **Compilación y Diagnósticos** | 🟢 **Excelente** | `astro check` superado con 0 errores y 0 advertencias sobre 19 archivos evaluados. |
| **Backend Serverless (`/api/lead`)** | 🟢 **100% Operativo** | Validación simétrica, protección Honeypot, rate-limiting en memoria y control de idempotencia anti-duplicados (5 min). |
| **Persistencia Transaccional (Neon DB)** | 🟢 **Operativo** | Conexión SSL (`sslmode=require`) con SDK serverless y consultas parametrizadas contra inyección SQL. |
| **Sistema de Alertas Críticas (Telegram)** | 🟢 **Operativo** | Códigos de incidente `CRIT-01` a `CRIT-04` con desinfección de logs (`sanitizeLog`) para evitar fugas de contraseñas o IPs. |
| **Capa Analítica (BigQuery & Power BI)** | 🟢 **Completado** | Tablas de hechos disociadas sin PII y pipeline ELT programado para cuadros de mando operacionales. |
| **Cabeceras de Seguridad Perimetral** | 🟢 **100% Desplegado** | Archivo `public/_headers` implementado con CSP, HSTS estricto (1 año), no-sniff, frame-ancestors y permisos controlados. |
| **Suite de Auditoría Automatizada** | 🟢 **100% Integrada** | Script ejecutable vía `npm run test:endpoints` con 14 tests automatizados de conectividad y seguridad. |
| **Páginas Legales Estáticas** | 🟡 **En Integración** | Documento base de cumplimiento RGPD redactado en `docs/legal/`; pendiente publicación de `/politica-de-privacidad` y `/aviso-legal`. |

---

## 6. 🚀 Recomendaciones y Siguientes Pasos

1. **✅ Despliegue de Cabeceras HTTP Perimetrales (`public/_headers`) — COMPLETADO:**
   - Se configuraron `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy` y `Content-Security-Policy` estricta para obtener calificación de grado A+ en escáneres de seguridad perimetral.
2. **Auditoría Post-Despliegue en Entorno de Producción:**
   - Una vez desplegado el commit en Cloudflare Pages, ejecutar la suite pasando la URL remota:
     ```bash
     node scripts/verify_endpoints.mjs https://quintanamur.com
     ```
3. **Publicación de Rutas Legales Estáticas:**
   - Crear las páginas [src/pages/politica-de-privacidad.astro](file:///C:/Users/alexj/Quintanamur-web/src/pages/politica-de-privacidad.astro) y [src/pages/aviso-legal.astro](file:///C:/Users/alexj/Quintanamur-web/src/pages/aviso-legal.astro) según el contenido definido en [PLAN_CUMPLIMIENTO_RGPD_PRIVACIDAD.md](file:///C:/Users/alexj/Quintanamur-web/docs/legal/PLAN_CUMPLIMIENTO_RGPD_PRIVACIDAD.md).
4. **Finalización de Enlaces en Footer:**
   - Reemplazar los enlaces provisionales (`#`) del pie de página ([Footer.astro](file:///C:/Users/alexj/Quintanamur-web/src/components/Footer.astro)) por las rutas definitivas de Aviso Legal y Política de Privacidad.
5. **Regla de Rate Limiting Perimetral en Cloudflare WAF:**
   - Añadir una regla perimetral en el dashboard de Cloudflare sobre `/api/lead` (ej. 15 peticiones POST por IP / 5 minutos) como segunda línea de defensa complementaria al rate limiter en memoria del endpoint.

---
*Informe generado automáticamente y registrado en el repositorio de Quintanamur S.L. como constancia técnica de auditoría de calidad y seguridad web.*
