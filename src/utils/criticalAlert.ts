import { env as cfEnv } from 'cloudflare:workers';

// =============================================================================
// Cache en memoria para Throttling defensivo (Máx 1 alerta del mismo tipo / 5 min)
// =============================================================================
const lastAlertTimestamp: Record<string, number> = {};
const THROTTLE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos

interface TelegramEnv {
    botToken?: string;
    chatId?: string;
}

interface CriticalAlertOptions {
    eventCode: 'CRIT-01' | 'CRIT-02' | 'CRIT-04' | string;
    title: string;
    detail: string;
    technicalInfo?: string;
    origin?: string;
    env?: TelegramEnv;
}

/**
 * Sanitiza cualquier texto para eliminar contraseñas, URLs de conexión o tokens
 * y escapa caracteres HTML para no romper el parser de Telegram.
 */
export function sanitizeLog(text: string): string {
    if (!text) return '';
    return text
        // Ocultar credenciales en cadenas de PostgreSQL
        .replace(/postgres(?:ql)?:\/\/[^:]+:[^@]+@/gi, 'postgresql://***:***@')
        // Ocultar posibles tokens de bots
        .replace(/\b\d{9,11}:[A-Za-z0-9_-]{34,36}\b/g, '[TOKEN_PROTEGIDO]')
        // Escapar caracteres HTML básicos
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Despacha una alerta crítica hacia el bot existente de Telegram
 * únicamente si supera el umbral de enfriamiento (Zero-Spam).
 */
export async function sendCriticalAlert(options: CriticalAlertOptions): Promise<boolean> {
    const { eventCode, title, detail, technicalInfo, origin = 'POST /api/lead', env } = options;

    const now = Date.now();
    const lastSent = lastAlertTimestamp[eventCode] || 0;

    // Control de fatiga: Si ya se envió esta misma alerta en los últimos 5 minutos, se silencia
    if (now - lastSent < THROTTLE_COOLDOWN_MS) {
        console.warn(`[SecAlert] Alerta ${eventCode} suprimida por cooldown de 5 min.`);
        return false;
    }

    const botToken = env?.botToken || cfEnv?.TELEGRAM_BOT_TOKEN || import.meta.env?.TELEGRAM_BOT_TOKEN || process.env?.TELEGRAM_BOT_TOKEN;
    const chatId = env?.chatId || cfEnv?.TELEGRAM_CHAT_ID || import.meta.env?.TELEGRAM_CHAT_ID || process.env?.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.warn('[SecAlert] Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID. No se pudo emitir alerta crítica.');
        return false;
    }

    const timestampStr = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    const safeDetail = sanitizeLog(detail);
    const safeTechInfo = technicalInfo ? sanitizeLog(technicalInfo) : '';

    const message = `🚨 <b>[ALERTA CRÍTICA DE INFRAESTRUCTURA]</b> 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━
💥 <b>Evento:</b> <code>${eventCode}</code> - ${sanitizeLog(title)}
⏰ <b>Hora:</b> ${timestampStr}
📍 <b>Origen:</b> <code>${sanitizeLog(origin)}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 <b>DIAGNÓSTICO:</b>
${safeDetail}
${safeTechInfo ? `\n📋 <b>Detalle Técnico:</b>\n<code>${safeTechInfo}</code>` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ <i>Esta es una alerta de alta prioridad. Requiere tu revisión.</i>`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.ok) {
            lastAlertTimestamp[eventCode] = now;
            console.log(`[SecAlert] Alerta crítica ${eventCode} despachada con éxito a Telegram.`);
            return true;
        } else {
            const errBody = await res.text();
            console.warn(`[SecAlert] Telegram rechazó la alerta (Status ${res.status}):`, errBody);
            return false;
        }
    } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn('[SecAlert] Excepción al despachar alerta a Telegram:', err?.message || err);
        return false;
    }
}
