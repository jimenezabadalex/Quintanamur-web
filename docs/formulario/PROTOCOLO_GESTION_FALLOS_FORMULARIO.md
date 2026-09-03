# 🛡️ Protocolo Técnico de Gestión de Errores y Resiliencia en Formulario Web

> **Proyecto:** Quintanamur S.L. Platform  
> **Documentos Relacionados:**  
> - [`docs/datos/FLUJO_DATOS_Y_EJEMPLO_NEON.md`](file:///c:/Users/alexj/Quintanamur-web/docs/datos/FLUJO_DATOS_Y_EJEMPLO_NEON.md)  
> - [`docs/datos/INFORME_DISENO_BBDD_NEON_BIGQUERY.md`](file:///c:/Users/alexj/Quintanamur-web/docs/datos/INFORME_DISENO_BBDD_NEON_BIGQUERY.md)  
> - [`src/pages/contacto.astro`](file:///c:/Users/alexj/Quintanamur-web/src/pages/contacto.astro)  
> **Objetivo:** Garantizar la **cero pérdida de clientes potenciales (*leads*)** ante fallos de conectividad, caídas del servidor o errores de validación, estableciendo mecanismos de rescate automáticos y analizando sus contrapartidas técnicas y operativas.

---

## 1. 🔄 Flujo de Decisión ante Fallos de Envío

```
                                  ENVÍO DEL FORMULARIO
                                           │
                                  ¿Ocurrió un error?
                                           │
                        ┌──────────────────┴──────────────────┐
                       SÍ                                     NO
                        │                                      │
        ┌───────────────┴───────────────┐               [ ÉXITO 200 OK ]
        ▼                               ▼               • Confirmación en pantalla
 [ ERROR TÉCNICO / RED ]      [ ERROR VALIDACIÓN ]      • Limpieza de campos
 • Sin cobertura / Timeout    • Falta campo o RGPD      • Registro en Neon
 • Fallo temporal en Neon     • Teléfono erróneo
        │                               │
        ▼                               ▼
 [ PRESERVAR DATOS ]          [ FEEDBACK EN CAMPO ]
 • NUNCA borrar el form       • Señalar campo exacto
 • Banner visible de aviso
        │
   ¿Persiste el fallo?
        │
        ▼
 [ FALLBACK INMEDIATO ]
 • Botón "¿Enviar por WhatsApp?"
   con el texto ya pre-redactado
```

---

## 2. 📋 Protocolo de Actuación en 4 Niveles de Resiliencia

### 🛡️ Nivel 1: Preservación Absoluta de Datos (Regla de Oro UX)
* **Prohibición de Reseteo:** Bajo ninguna circunstancia se debe ejecutar `form.reset()` si ocurre un fallo. El usuario suele escribir descripciones de 200 a 400 caracteres sobre su terreno o necesidades de maquinaria; si la página borra su texto, el abandono es prácticamente seguro. Todos los campos y el pin en el mapa de Leaflet se **mantienen intactos**.
* **Estado de Carga en el Botón:** Al pulsar *Enviar*, el botón pasa a estado inhabilitado (`disabled`) con la leyenda `"Enviando solicitud..."`. Esto previene envíos duplicados provocados por clics nerviosos.

---

### 🚨 Nivel 2: Diagnóstico y Mensajería Transparente
Se evita mostrar códigos técnicos incomprensibles (como *CORS error*, *504 Gateway Timeout* o *Connection Refused*). La interfaz categoriza el problema:

1. **Pérdida de Conexión / Modo Offline:**
   > *"Parece que has perdido la conexión a internet. Comprueba tu cobertura y vuelve a pulsar 'Reintentar envío'."*
2. **Caída del Servidor o Base de Datos (Error 500/Timeout):**
   > *"No hemos podido conectar con el servidor temporalmente. Por favor, inténtalo de nuevo en unos segundos."*
3. **Validación Insuficiente (Error 400):**
   > *"Por favor, revisa el número de teléfono o asegúrate de haber aceptado la política de privacidad."*

---

### 📲 Nivel 3: El Plan de Rescate (Fallback Comercial con WhatsApp)
Si la base de datos no responde tras el reintento o la cobertura móvil del usuario en el campo es extremadamente baja, el sistema despliega una vía directa de escape comercial:

> **Banner Destacado:**  
> *"¿Problemas con el envío de tu solicitud? Envíanosla directamente por WhatsApp"*

Al pulsar este botón, se abre la aplicación de WhatsApp con **todos los datos del formulario ya redactados en el mensaje**:

```text
Hola Quintanamur, intenté solicitar valoración desde la web pero tuve un problema de conexión.
Mis datos son:
- Nombre: Finca El Campillo (Julián)
- Teléfono: +34 612 34 56 78
- Sector: Servicios Agrícolas
- Municipio: Jumilla (a 28.4 km de Yecla)
- Trabajo: Despedregado de 15 hectáreas con rulo.
```

**Resultado de Negocio:** Se rescata la oportunidad comercial en el 100% de los casos, independientemente del estado de la infraestructura técnica.

---

### 💾 Nivel 4: Respaldo Local en el Navegador (`localStorage`)
* Si la petición de red falla por completo, la web guarda una copia temporal de la solicitud en `localStorage` (`quintanamur_lead_draft`).
* Si el cliente recarga la página por frustración o recupera cobertura minutos después, la web le ofrece restaurar el borrador con un solo clic: *"Hemos recuperado tu solicitud pendiente. ¿Deseas enviarla ahora?"*.

---

### 💻 Ejemplo de Implementación en Código (`contacto.astro`)

```javascript
// Manejo robusto del envío con captura de errores y fallback
try {
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<span>Enviando solicitud...</span>';

  const response = await fetch('/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const resData = await response.json();

  if (response.ok && resData.success) {
    // Éxito: limpiar respaldo local y mostrar confirmación
    localStorage.removeItem('quintanamur_lead_draft');
    mostrarMensajeExito("¡Solicitud enviada! Te contactaremos en menos de 24h.");
    form.reset();
  } else {
    throw new Error(resData.error || 'Error en el procesamiento del servidor.');
  }

} catch (error) {
  // 1. Guardar copia en el navegador del usuario
  localStorage.setItem('quintanamur_lead_draft', JSON.stringify(payload));

  // 2. Mostrar alerta visual y activar botón alternativo de WhatsApp
  mostrarErrorConFallbackWhatsApp({
    errorMsg: error.message,
    whatsappUrl: generarEnlaceWhatsAppConDatos(payload)
  });

} finally {
  btnSubmit.disabled = false;
  btnSubmit.innerHTML = '<span>Reintentar Envío</span>';
}
```

---

## 3. ⚖️ Análisis Crítico de Inconvenientes y Soluciones (*Trade-Offs*)

Toda solución de contingencia técnica implica compromisos. A continuación se detallan los 5 inconvenientes reales identificados y la estrategia recomendada para mitigarlos:

### 1. 🕳️ Brecha en la Base de Datos y en la Analítica (*Data Gap*)
* **El problema:** Si el formulario falla y el cliente recurre al botón de **WhatsApp**, el mensaje va directo al teléfono del comercial, **pero no se registra automáticamente en Neon PostgreSQL**.
* **Impacto en el negocio:**
  * Ese lead no existirá en la tabla `raw_leads` ni llegará a BigQuery ni a Power BI.
  * Los informes analíticos mostrarán menos solicitudes de las reales, falseando las tasas de conversión y el mapa de demanda territorial.
* **Mitigación:** Disparar un evento ligero a la tabla `raw_web_events` (ej. `'whatsapp_fallback_click'`) que registre que un cliente utilizó la vía de rescate. Complementariamente, el equipo comercial debe dar de alta manualmente el lead en el CRM.

---

### 2. 👥 Riesgo de Leads Duplicados (*Falta de Idempotencia*)
* **El problema:** Si la base de datos de Neon sí insertó el registro, pero la conexión del cliente era tan inestable que la confirmación HTTP sufrió un *Timeout*, el cliente creerá que falló y pulsará de nuevo *"Reintentar envío"*.
* **Impacto en el negocio:**
  * Se crearán dos filas idénticas en la base de datos con pocos segundos de diferencia.
  * El equipo comercial podría llamar dos veces a la misma persona generando una imagen descoordinada.
* **Mitigación:** Implementar una regla de deduplicación en el endpoint: si entra una solicitud con el mismo número de teléfono y sector en una ventana de **5 minutos**, se actualiza el registro existente en lugar de crear uno nuevo.

---

### 3. 💻 Fricción de WhatsApp en Ordenadores de Escritorio (*Desktop*)
* **El problema:** En smartphones, el enlace a WhatsApp abre la app de inmediato. En ordenadores de sobremesa (habitual en promotoras o constructoras de obra civil), puede ocurrir que el usuario no tenga instalada la app de escritorio ni tenga la sesión web iniciada.
* **Impacto en el negocio:**
  * El enlace exigirá escanear un código QR con el móvil, introduciendo fricción y aumentando el abandono.
* **Mitigación:** En ordenadores, la tarjeta de rescate debe mostrar una alternativa mixta: el botón de WhatsApp y el **teléfono comercial en texto grande con enlace `tel:+34...`** para marcado rápido.

---

### 4. 🔒 Privacidad y Datos Obsoletos en `localStorage`
* **El problema:** Guardar el borrador en el almacenamiento del navegador conlleva dos riesgos:
  1. **Privacidad en equipos compartidos:** Si el agricultor usa un equipo en una cooperativa agraria o locutorio, sus datos quedan en la memoria del navegador.
  2. **Borradores desfasados:** Si el cliente regresa 1 mes después por otro motivo, el formulario podría rellenarse con una solicitud antigua que ya fue atendida.
* **Mitigación:** Establecer una política de caducidad (*Time-To-Live - TTL*): si el borrador guardado en `localStorage` tiene más de **24 horas**, se elimina automáticamente.

---

### ⏱️ 5. Los "Cold Starts" (Arranques en Frío de la Nube Gratuita)
* **El problema:** En planes gratuitos de Neon y servicios serverless, tras periodos de inactividad, la base de datos entra en suspensión para ahorrar recursos.
* **Impacto en el negocio:**
  * El primer usuario que envía un formulario tras horas sin tráfico puede experimentar una demora de **3 a 5 segundos** mientras la base de datos se activa.
  * Sin una respuesta visual clara, el usuario podría pensar que la web se ha congelado.
* **Mitigación:** Ajustar la leyenda del botón durante el envío a `"Conectando de forma segura... (un momento)"` y configurar un *timeout* amplio de al menos **10 segundos** antes de declarar un error de red.

---

## 4. 📊 Matriz Resumen de Decisión Técnica

| Inconveniente | Nivel de Severidad | Solución de Mitigación Implementada |
| :--- | :--- | :--- |
| **El lead de WhatsApp no entra en la BBDD** | Medio | Registro de evento en `raw_web_events` y alta asistida |
| **Leads duplicados por reintentos** | Bajo | Control de duplicados por teléfono en ventana de 5 minutos |
| **WhatsApp incómodo en ordenadores PC** | Medio | Mostrar número telefónico directo visible en pantalla |
| **Persistencia en `localStorage`** | Bajo | Borrado automático con caducidad (TTL) a las 24 horas |
| **Demora por arranque en frío de Neon** | Medio | Mensajería de espera transparente y timeout de 10 segundos |
