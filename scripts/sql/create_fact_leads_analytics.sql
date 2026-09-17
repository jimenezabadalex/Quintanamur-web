-- =============================================================================
-- Modelo Dimensional en Estrella (Star Schema) - Quintanamur S.L.
-- Tabla de Hechos: fact_leads_analytics
-- Motor: Google BigQuery
-- =============================================================================

CREATE OR REPLACE TABLE `quintanamur_warehouse.fact_leads_analytics` AS
SELECT 
    lead_id,
    created_at AS lead_timestamp,
    DATE(created_at) AS lead_date,
    EXTRACT(YEAR FROM created_at) AS lead_year,
    EXTRACT(MONTH FROM created_at) AS lead_month,
    FORMAT_DATE('%B', DATE(created_at)) AS lead_month_name,
    service_category,
    COALESCE(machinery_interest, 'Sin especificar') AS machinery_interest,
    COALESCE(municipality_name, 'Desconocido') AS municipality_name,
    user_lat,
    user_lng,
    distance_to_base_km,
    coverage_status,
    COALESCE(lead_status, 'NUEVO') AS lead_status,
    lead_source,

    -- 1. Segmentación de Negocio y Prioridad Comercial
    CASE 
        WHEN service_category = 'civil' THEN 'Ticket Alto (Obra Civil)'
        WHEN service_category = 'agricola' AND distance_to_base_km <= 50 THEN 'Ticket Recurrente Local'
        ELSE 'Ticket Estándar'
    END AS business_segment,

    -- 2. Lead Quality Score (0 a 100) ponderado
    CASE 
        WHEN client_email IS NOT NULL AND LENGTH(message_text) > 25 THEN 100
        WHEN client_email IS NOT NULL OR LENGTH(message_text) > 15 THEN 75
        ELSE 45
    END AS lead_quality_score,

    -- 3. Coste estimado de transporte en góndola (Ida + Vuelta a 1.85 €/km)
    ROUND(distance_to_base_km * 2 * 1.85, 2) AS estimated_logistics_cost_eur

FROM `quintanamur_warehouse.raw_leads_sync`;
