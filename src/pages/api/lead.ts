import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { env as cfEnv } from 'cloudflare:workers';

export const prerender = false; // Ejecución dinámica en servidor

// =============================================================================
// 1. Tipos e Interfaces
// =============================================================================
interface TelegramLeadPayload {
    leadId: number | string;
    clientName: string;
    clientPhone: string;
    serviceCategory: string;
    municipalityName?: string | null;
    distanceKm?: number | null;
    messageText: string;
    userLat?: number | null;
    userLng?: number | null;
    isUpdate?: boolean;
}

// =============================================================================
// 2. Helper de Utilidad: Escapar HTML para mensajes seguros
// =============================================================================
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

interface TelegramEnv {
    botToken?: string;
    chatId?: string;
}

interface TelegramResult {
    sent: boolean;
    error?: string;
}

// =============================================================================
// 3. Helper: Notificación Instantánea a Telegram
// =============================================================================
async function sendTelegramNotification(payload: TelegramLeadPayload, env?: TelegramEnv): Promise<TelegramResult> {
    const botToken = env?.botToken || cfEnv?.TELEGRAM_BOT_TOKEN || import.meta.env.TELEGRAM_BOT_TOKEN || process.env?.TELEGRAM_BOT_TOKEN;
    const chatId = env?.chatId || cfEnv?.TELEGRAM_CHAT_ID || import.meta.env.TELEGRAM_CHAT_ID || process.env?.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        const missing = [!botToken && 'TELEGRAM_BOT_TOKEN', !chatId && 'TELEGRAM_CHAT_ID'].filter(Boolean).join(', ');
        console.warn(`[Telegram] Variables no configuradas: ${missing}. Omitiendo notificación.`);
        return { sent: false, error: `Variables no configuradas en Cloudflare: ${missing}` };
    }

    const categoryLabels: Record<string, string> = {
        agricola: '🌾 Servicios Agrícolas',
        civil: '🏗️ Obra Civil / Excavación',
        otro: '🚜 Otro Servicio'
    };
    const categoryStr = categoryLabels[payload.serviceCategory] || payload.serviceCategory;

    const distanceStr = payload.distanceKm
        ? ` (a ~${Math.round(payload.distanceKm)} km de Yecla)`
        : '';

    const locationStr = payload.municipalityName
        ? `${payload.municipalityName}${distanceStr}`
        : (payload.distanceKm ? `Zona Yecla${distanceStr}` : 'No indicada');

    const header = payload.isUpdate
        ? '🔄 <b>¡SOLICITUD ACTUALIZADA EN LA WEB!</b>'
        : '🚜 <b>¡NUEVA SOLICITUD DE VALORACIÓN!</b>';

    const dateFormatted = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

    const text = `${header}
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>Cliente:</b> ${escapeHtml(payload.clientName)}
📞 <b>Teléfono:</b> <a href="tel:+34${payload.clientPhone}">+34 ${payload.clientPhone}</a>
⚙️ <b>Sector:</b> ${categoryStr}
📍 <b>Ubicación:</b> ${escapeHtml(locationStr)}
📝 <b>Resumen:</b>
<i>"${escapeHtml(payload.messageText)}"</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 <b>ID Lead:</b> #${payload.leadId} | ⏰ ${dateFormatted}`;

    const whatsappSummary = payload.messageText.length > 70
        ? payload.messageText.slice(0, 70) + '...'
        : payload.messageText;

    const whatsappMsg = `Hola ${payload.clientName}, soy de Quintanamur. He recibido tu solicitud para "${whatsappSummary}". ¿Hablamos?`;
    const whatsappUrl = `https://wa.me/34${payload.clientPhone}?text=${encodeURIComponent(whatsappMsg)}`;

    const inlineKeyboard: Array<Array<{ text: string; url: string }>> = [
        [
            { text: '💬 Abrir WhatsApp con Cliente', url: whatsappUrl }
        ]
    ];

    if (payload.userLat && payload.userLng) {
        inlineKeyboard.push([
            { text: '📍 Ver Finca en Google Maps', url: `https://www.google.com/maps?q=${payload.userLat},${payload.userLng}` }
        ]);
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
        const res = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: inlineKeyboard
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (!res.ok) {
            const errBody = await res.text();
            console.warn(`[Telegram] Respuesta no OK (Status ${res.status}):`, errBody);
            return { sent: false, error: `Telegram HTTP ${res.status}: ${errBody}` };
        } else {
            console.log(`[Telegram] Notificación enviada con éxito para lead #${payload.leadId}`);
            return { sent: true };
        }
    } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn('[Telegram] Excepción al despachar notificación:', err?.message || err);
        return { sent: false, error: err?.message || String(err) };
    }
}

// =============================================================================
// 4. Endpoint Principal de la API (/api/lead)
// =============================================================================
export const POST: APIRoute = async ({ request }) => {

    let data: any;
    try {
        data = await request.json();
    } catch {
        return new Response(
            JSON.stringify({
                success: false,
                error: 'El formato de los datos enviados no es válido. Por favor, revisa el formulario e inténtalo de nuevo.'
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        // 4.1. Sanitización y validación estricta simétrica
        const clientName = typeof data.client_name === 'string' ? data.client_name.trim() : '';
        const clientPhone = typeof data.client_phone === 'string' ? data.client_phone.replace(/\D/g, '') : '';
        const serviceCategory = typeof data.service_category === 'string' ? data.service_category.trim() : 'agricola';
        const municipalityName = typeof data.municipality_name === 'string' ? data.municipality_name.trim().slice(0, 50) : null;
        const messageText = typeof data.message_text === 'string' ? data.message_text.trim() : '';
        const privacyAccepted = data.privacy_consent_accepted === true;

        if (clientName.length < 3 || clientName.length > 40) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'El nombre debe contener entre 3 y 40 caracteres.'
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (clientPhone.length !== 9 || !/^[6789]\d{8}$/.test(clientPhone)) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'El teléfono debe contener exactamente 9 dígitos numéricos válidos (ej. 600123456).'
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!['agricola', 'civil', 'otro'].includes(serviceCategory)) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Por favor, selecciona un sector válido (Agrícola, Obra Civil u Otro).'
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (messageText.length < 10 || messageText.length > 200) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'El mensaje debe contener entre 10 y 200 caracteres para resumir tu necesidad técnica.'
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!privacyAccepted) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Debes aceptar la política de privacidad para enviar tu solicitud.'
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const connectionString = cfEnv?.NEON_DATABASE_URL || import.meta.env.NEON_DATABASE_URL || process.env?.NEON_DATABASE_URL;
        if (!connectionString) {
            throw new Error('La variable de entorno NEON_DATABASE_URL no está configurada o el servidor necesita reinicio.');
        }

        const telegramEnv: TelegramEnv = {
            botToken: cfEnv?.TELEGRAM_BOT_TOKEN || import.meta.env.TELEGRAM_BOT_TOKEN || process.env?.TELEGRAM_BOT_TOKEN,
            chatId: cfEnv?.TELEGRAM_CHAT_ID || import.meta.env.TELEGRAM_CHAT_ID || process.env?.TELEGRAM_CHAT_ID
        };

        const sql = neon(connectionString);

        // 4.2. Control de Idempotencia: Verificar si existe un envío idéntico en los últimos 5 minutos
        const recentDuplicate = await sql`
      SELECT lead_id FROM raw_leads
      WHERE client_phone = ${clientPhone}
        AND created_at > NOW() - INTERVAL '5 minutes'
      LIMIT 1;
    `;

        if (recentDuplicate.length > 0) {
            // Actualizamos el mensaje si aportó más detalles en lugar de duplicar fila
            await sql`
        UPDATE raw_leads
        SET message_text = ${messageText}
        WHERE lead_id = ${recentDuplicate[0].lead_id};
      `;

            // Disparo de notificación Telegram con await para garantizar que Cloudflare Workers no aborte la conexión
            const telegramResult = await sendTelegramNotification({
                leadId: recentDuplicate[0].lead_id,
                clientName,
                clientPhone,
                serviceCategory,
                municipalityName,
                distanceKm: data.distance_to_base_km || null,
                messageText,
                userLat: data.user_lat || null,
                userLng: data.user_lng || null,
                isUpdate: true
            }, telegramEnv);

            return new Response(
                JSON.stringify({
                    success: true,
                    lead_id: recentDuplicate[0].lead_id,
                    message: 'Solicitud actualizada correctamente.',
                    telegram: telegramResult
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 4.3. Inserción protegida contra SQL Injection en Neon PostgreSQL
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
        ${clientName},
        ${clientPhone},
        ${data.client_email || null},
        ${serviceCategory},
        ${data.machinery_interest || null},
        ${municipalityName},
        ${data.user_lat || null},
        ${data.user_lng || null},
        ${data.distance_to_base_km || null},
        ${data.distance_to_base_km && data.distance_to_base_km <= 100 ? 'ZONA_PRIORITARIA' : 'GRAN_PROYECTO'},
        ${messageText},
        TRUE,
        NOW(),
        ${data.lead_source || 'WEB_FORM'}
      )
      RETURNING lead_id;
    `;

        const leadId = result[0].lead_id;

        // Disparo de notificación Telegram con await para garantizar entrega en Cloudflare Workers
        const telegramResult = await sendTelegramNotification({
            leadId,
            clientName,
            clientPhone,
            serviceCategory,
            municipalityName,
            distanceKm: data.distance_to_base_km || null,
            messageText,
            userLat: data.user_lat || null,
            userLng: data.user_lng || null,
            isUpdate: false
        }, telegramEnv);

        return new Response(
            JSON.stringify({
                success: true,
                lead_id: leadId,
                message: 'Solicitud registrada correctamente.',
                telegram: telegramResult
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Error al insertar lead en Neon:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error?.message || 'Error interno del servidor al procesar la solicitud.',
                detail: String(error)
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

// =============================================================================
// 5. Endpoint GET de Diagnóstico (/api/lead) para auditar variables y conectividad
// =============================================================================
export const GET: APIRoute = async () => {
    const token = cfEnv?.TELEGRAM_BOT_TOKEN || import.meta.env.TELEGRAM_BOT_TOKEN || process.env?.TELEGRAM_BOT_TOKEN || '';
    const chatId = cfEnv?.TELEGRAM_CHAT_ID || import.meta.env.TELEGRAM_CHAT_ID || process.env?.TELEGRAM_CHAT_ID || '';
    const dbUrl = cfEnv?.NEON_DATABASE_URL || import.meta.env.NEON_DATABASE_URL || process.env?.NEON_DATABASE_URL || '';

    let telegramCheck = 'No ejecutado (faltan variables)';
    if (token && chatId) {
        try {
            const testUrl = `https://api.telegram.org/bot${token}/sendMessage`;
            const testRes = await fetch(testUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: '🛠️ <b>Test de diagnóstico desde Cloudflare Worker</b>\nSi lees este mensaje, la conexión con Telegram funciona al 100% en producción ✅',
                    parse_mode: 'HTML'
                })
            });
            const bodyText = await testRes.text();
            telegramCheck = testRes.ok
                ? 'Mensaje de prueba entregado con éxito ✅'
                : `Error de Telegram (Status ${testRes.status}): ${bodyText}`;
        } catch (e: any) {
            telegramCheck = `Excepción al conectar con Telegram: ${e?.message || e}`;
        }
    }

    return new Response(
        JSON.stringify({
            status: 'ok',
            variables: {
                has_neon_db: !!dbUrl,
                has_telegram_token: !!token,
                telegram_token_preview: token ? `${token.slice(0, 6)}...${token.slice(-4)}` : '(no configurada en Cloudflare)',
                has_telegram_chat_id: !!chatId,
                telegram_chat_id_preview: chatId ? `${chatId.slice(0, 3)}...${chatId.slice(-2)}` : '(no configurada en Cloudflare)'
            },
            telegram_test_result: telegramCheck
        }, null, 2),
        { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
};