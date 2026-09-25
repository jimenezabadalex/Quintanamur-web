import { spawn } from 'child_process';

const targetArg = process.argv[2];
const PORT = 4321;
const BASE_URL = targetArg ? targetArg.replace(/\/$/, '') : `http://127.0.0.1:${PORT}`;
const isLocalSpawn = !targetArg;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/`);
      if (res.status === 200) {
        return true;
      }
    } catch {
      await sleep(500);
    }
  }
  return false;
}

async function runAudit() {
  let astroProcess = null;

  if (isLocalSpawn) {
    console.log('🚀 Iniciando servidor Astro local para auditoría de endpoints...');
    astroProcess = spawn('npx.cmd', ['astro', 'dev', '--port', String(PORT), '--host', '127.0.0.1'], {
      cwd: process.cwd(),
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    console.log('⏳ Esperando a que el servidor local esté listo...');
    const isReady = await waitForServer(40);

    if (!isReady) {
      console.error('❌ No se pudo conectar al servidor local tras 20 segundos.');
      astroProcess.kill();
      process.exit(1);
    }
  } else {
    console.log(`🌐 Auditando servidor remoto en: ${BASE_URL}`);
  }

  astroProcess.stdout.on('data', (d) => {
    const msg = d.toString();
    if (msg.includes('ready in') || msg.includes('Local')) {
      console.log(`📡 [Astro Dev] Servidor listo en ${BASE_URL}`);
    }
  });

  astroProcess.stderr.on('data', (d) => {
    // console.error('[Astro err]', d.toString());
  });

  console.log('⏳ Esperando a que el servidor esté listo...');
  const isReady = await waitForServer(40);

  if (!isReady) {
    console.error('❌ No se pudo conectar al servidor local tras 20 segundos.');
    astroProcess.kill();
    process.exit(1);
  }

  console.log(`\n=================================================================`);
  console.log(`🎯 AUDITORÍA DE CONEXIONES Y CÓDIGOS DE ESTADO (HTTP STATUS)`);
  console.log(`=================================================================\n`);

  const tests = [
    // Páginas estáticas (esperado: 200 OK)
    { group: 'VISTAS Y RUTAS WEB', name: 'Inicio (Home)', url: '/', method: 'GET', expected: [200] },
    { group: 'VISTAS Y RUTAS WEB', name: 'Contacto', url: '/contacto', method: 'GET', expected: [200] },
    { group: 'VISTAS Y RUTAS WEB', name: 'Maquinaria', url: '/maquinaria', method: 'GET', expected: [200] },
    { group: 'VISTAS Y RUTAS WEB', name: 'Servicios', url: '/servicios', method: 'GET', expected: [200] },
    { group: 'VISTAS Y RUTAS WEB', name: 'Sobre Nosotros', url: '/sobre-nosotros', method: 'GET', expected: [200] },

    // Assets multimedia críticos (esperado: 200 OK)
    { group: 'ASSETS MULTIMEDIA', name: 'Card Servicios Obra Civil (actualizado)', url: '/images/home/servicios-obra-civil.webp', method: 'GET', expected: [200] },
    { group: 'ASSETS MULTIMEDIA', name: 'Card Servicios Agrícolas', url: '/images/home/servicios-agricolas.webp', method: 'GET', expected: [200] },
    { group: 'ASSETS MULTIMEDIA', name: 'Favicon SVG', url: '/favicon.svg', method: 'GET', expected: [200] },

    // Rutas no existentes (esperado: 404 controlado)
    { group: 'CONTROL DE ERRORES 404', name: 'Ruta inexistente /ruta-aleatoria-test', url: '/ruta-aleatoria-test', method: 'GET', expected: [404] },

    // Endpoint API /api/lead (Pruebas de seguridad y respuestas controladas)
    { 
      group: 'SEGURIDAD DE ENDPOINT /api/lead',
      name: 'GET sin clave administrativa (Modo Sigilo / Stealth)', 
      url: '/api/lead', 
      method: 'GET', 
      expected: [404] 
    },
    { 
      group: 'SEGURIDAD DE ENDPOINT /api/lead',
      name: 'POST cuerpo vacío (400 Bad Request controlado)', 
      url: '/api/lead', 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      expected: [400],
      checkBody: (b) => b.success === false && typeof b.error === 'string'
    },
    { 
      group: 'SEGURIDAD DE ENDPOINT /api/lead',
      name: 'POST validación de teléfono erróneo (400 controlado)', 
      url: '/api/lead', 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Alejandro Test',
        client_phone: '12345',
        service_category: 'agricola',
        message_text: 'Solicitud de presupuesto para despedregado.',
        privacy_consent_accepted: true
      }),
      expected: [400],
      checkBody: (b) => b.success === false && b.error.includes('teléfono')
    },
    { 
      group: 'SEGURIDAD DE ENDPOINT /api/lead',
      name: 'POST rechazo sin consentimiento RGPD (400 controlado)', 
      url: '/api/lead', 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Alejandro Test',
        client_phone: '612345678',
        service_category: 'agricola',
        message_text: 'Solicitud de presupuesto para despedregado.',
        privacy_consent_accepted: false
      }),
      expected: [400],
      checkBody: (b) => b.success === false && b.error.includes('política de privacidad')
    },
    { 
      group: 'SEGURIDAD DE ENDPOINT /api/lead',
      name: 'POST Honeypot Anti-Bot activado (200 Tarpit Silencioso)', 
      url: '/api/lead', 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_website: 'http://bot-attack.com',
        client_name: 'Spam Crawler',
        client_phone: '600000000',
        message_text: 'Spam message'
      }),
      expected: [200],
      checkBody: (b) => b.success === true && b.lead_id === 0
    }
  ];

  let currentGroup = '';
  let passedCount = 0;
  let failedCount = 0;

  for (const t of tests) {
    if (t.group !== currentGroup) {
      currentGroup = t.group;
      console.log(`\n📌 [${currentGroup}]`);
    }

    const tStart = Date.now();
    try {
      const res = await fetch(`${BASE_URL}${t.url}`, {
        method: t.method,
        headers: t.headers || {},
        body: t.body || undefined
      });
      const elapsed = Date.now() - tStart;
      const statusOk = t.expected.includes(res.status);

      let bodyOk = true;
      let bodyData = null;
      const cType = res.headers.get('content-type') || '';
      if (cType.includes('application/json')) {
        try {
          bodyData = await res.json();
          if (t.checkBody && !t.checkBody(bodyData)) {
            bodyOk = false;
          }
        } catch {
          bodyOk = false;
        }
      }

      if (statusOk && bodyOk) {
        console.log(`  ✅ Código HTTP ${res.status} | ${t.method.padEnd(4)} ${t.url.padEnd(42)} -> ${t.name} (${elapsed}ms)`);
        passedCount++;
      } else {
        console.error(`  ❌ Código HTTP ${res.status} (Esperado: ${t.expected.join('/')}) | ${t.name}`);
        if (!bodyOk && bodyData) {
          console.error(`     Respuesta devuelta:`, JSON.stringify(bodyData));
        }
        failedCount++;
      }
    } catch (err) {
      console.error(`  ❌ ERROR CONEXIÓN: ${t.name} -> ${err.message}`);
      failedCount++;
    }
  }

  console.log(`\n=================================================================`);
  console.log(`📊 BALANCE FINAL: ${passedCount} pruebas correctas | ${failedCount} fallos`);
  console.log(`=================================================================\n`);

  // Finalizar servidor local si se levantó
  if (astroProcess) {
    astroProcess.kill();
  }
  process.exit(failedCount > 0 ? 1 : 0);
}

runAudit();
