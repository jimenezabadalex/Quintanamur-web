import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';

export const prerender = false; // Ejecución dinámica en servidor

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();

        // 1. Validación de seguridad y consentimiento RGPD estricto
        if (!data.client_name || !data.client_phone || data.privacy_consent_accepted !== true) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Debes completar tu nombre, teléfono y aceptar la política de privacidad.'
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const connectionString = import.meta.env.NEON_DATABASE_URL || process.env.NEON_DATABASE_URL;
        if (!connectionString) {
            throw new Error('La variable de entorno NEON_DATABASE_URL no está configurada o el servidor necesita reinicio.');
        }

        const sql = neon(connectionString);

        // 2. Control de Idempotencia: Verificar si existe un envío idéntico en los últimos 5 minutos
        const recentDuplicate = await sql`
      SELECT lead_id FROM raw_leads
      WHERE client_phone = ${data.client_phone}
        AND created_at > NOW() - INTERVAL '5 minutes'
      LIMIT 1;
    `;

        if (recentDuplicate.length > 0) {
            // Actualizamos el mensaje si aportó más detalles en lugar de duplicar
            await sql`
        UPDATE raw_leads
        SET message_text = COALESCE(${data.message_text}, message_text)
        WHERE lead_id = ${recentDuplicate[0].lead_id};
      `;
            return new Response(
                JSON.stringify({
                    success: true,
                    lead_id: recentDuplicate[0].lead_id,
                    message: 'Solicitud actualizada correctamente.'
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 3. Inserción protegida contra SQL Injection
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
        ${data.client_name},
        ${data.client_phone},
        ${data.client_email || null},
        ${data.service_category || 'agricola'},
        ${data.machinery_interest || null},
        ${data.municipality_name || null},
        ${data.user_lat || null},
        ${data.user_lng || null},
        ${data.distance_to_base_km || null},
        ${data.distance_to_base_km <= 100 ? 'ZONA_PRIORITARIA' : 'GRAN_PROYECTO'},
        ${data.message_text || null},
        TRUE,
        NOW(),
        ${data.lead_source || 'WEB_FORM'}
      )
      RETURNING lead_id;
    `;

        return new Response(
            JSON.stringify({
                success: true,
                lead_id: result[0].lead_id,
                message: 'Solicitud registrada correctamente.'
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