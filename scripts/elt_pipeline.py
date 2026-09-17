"""
Pipeline ELT Automatizado (Extract, Load, Transform) - Quintanamur S.L.
1. Extrae solicitudes comerciales de Neon PostgreSQL.
2. Carga en bruto en Google BigQuery (raw_leads_sync).
3. Transforma y genera la tabla de hechos analítica (fact_leads_analytics) para Power BI.
"""

import os
import sys
from pathlib import Path
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from google.cloud import bigquery
from google.oauth2 import service_account

# Asegurar codificación UTF-8 en Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Cargar variables de entorno
load_dotenv()

# Configuración del entorno
ROOT_DIR = Path(__file__).resolve().parent.parent
NEON_URI = os.getenv("NEON_DATABASE_URL")
GCP_KEY_PATH = os.getenv("GCP_KEY_PATH", str(ROOT_DIR / "gcp-key.json"))
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "quintanamur-analytics")
DATASET_ID = os.getenv("BIGQUERY_DATASET_ID", "quintanamur_warehouse")
RAW_TABLE_ID = "raw_leads_sync"

def run_elt_pipeline():
    print("=" * 70)
    print("🚜 PIPELINE ELT QUINTANAMUR: NEON POSTGRES ➔ GOOGLE BIGQUERY")
    print("=" * 70)

    # -------------------------------------------------------------------------
    # 1. Comprobación de Requisitos y Credenciales
    # -------------------------------------------------------------------------
    if not NEON_URI:
        print("❌ ERROR: La variable NEON_DATABASE_URL no está configurada en .env.")
        sys.exit(1)

    if not os.path.exists(GCP_KEY_PATH):
        print(f"⚠️ AVISO: No se ha encontrado el archivo de credenciales '{GCP_KEY_PATH}'.")
        print("   Para cargar datos en BigQuery, descarga tu clave JSON desde Google Cloud Console")
        print("   y guárdala como 'gcp-key.json' en la raíz del proyecto.")
        print("   (Consulta docs/portfolio/GUIA_MODELADO_POWER_BI.md para la guía paso a paso).")
        sys.exit(1)

    # -------------------------------------------------------------------------
    # 2. Extracción desde Neon PostgreSQL
    # -------------------------------------------------------------------------
    print("\n[Paso 1/3] 🔌 Conectando a Neon PostgreSQL y extrayendo registros...")
    try:
        # SQLAlchemy engine compatible con pandas 3.x
        engine = create_engine(NEON_URI.replace("postgresql://", "postgresql+psycopg2://"))
        query = text("""
        SELECT 
            lead_id,
            created_at,
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
            lead_source,
            lead_status
        FROM raw_leads
        ORDER BY created_at DESC;
        """)
        with engine.connect() as conn:
            df = pd.read_sql(query, conn)
        print(f"✅ Se han extraído {len(df)} leads desde Neon PostgreSQL.")
    except Exception as e:
        print(f"❌ Error al conectar o consultar Neon PostgreSQL: {e}")
        sys.exit(1)

    if df.empty:
        print("ℹ️ La tabla raw_leads está vacía. Ejecuta primero 'python scripts/seed_demo_leads.py'.")
        sys.exit(0)

    # Normalización de tipos para BigQuery
    df["created_at"] = pd.to_datetime(df["created_at"], utc=True)
    df["distance_to_base_km"] = df["distance_to_base_km"].astype(float)
    if "user_lat" in df.columns:
        df["user_lat"] = df["user_lat"].astype(float)
    if "user_lng" in df.columns:
        df["user_lng"] = df["user_lng"].astype(float)

    # -------------------------------------------------------------------------
    # 3. Carga en Google BigQuery (raw_leads_sync)
    # -------------------------------------------------------------------------
    print(f"\n[Paso 2/3] ☁️ Autenticando en Google Cloud ({GCP_PROJECT_ID})...")
    try:
        credentials = service_account.Credentials.from_service_account_file(GCP_KEY_PATH)
        client = bigquery.Client(credentials=credentials, project=GCP_PROJECT_ID)

        # Crear dataset si no existiera
        dataset_ref = bigquery.DatasetReference(GCP_PROJECT_ID, DATASET_ID)
        try:
            client.get_dataset(dataset_ref)
        except Exception:
            dataset = bigquery.Dataset(dataset_ref)
            dataset.location = "EU"
            client.create_dataset(dataset, exists_ok=True)
            print(f"📁 Dataset '{DATASET_ID}' verificado/creado en ubicación EU.")

        table_ref = f"{GCP_PROJECT_ID}.{DATASET_ID}.{RAW_TABLE_ID}"
        job_config = bigquery.LoadJobConfig(
            write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,  # Reemplazo limpio
            autodetect=True
        )

        print(f"🚀 Cargando {len(df)} filas en la tabla '{table_ref}'...")
        job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
        job.result()  # Esperar a que concluya la carga
        print(f"✅ Carga en BigQuery completada con éxito ({table_ref}).")

    except Exception as e:
        print(f"❌ Error durante la carga en Google BigQuery: {e}")
        sys.exit(1)

    # -------------------------------------------------------------------------
    # 4. Transformación y Creación del Star Schema (fact_leads_analytics)
    # -------------------------------------------------------------------------
    print("\n[Paso 3/3] 📊 Ejecutando modelo dimensional (Star Schema)...")
    sql_path = ROOT_DIR / "scripts" / "sql" / "create_fact_leads_analytics.sql"
    try:
        with open(sql_path, "r", encoding="utf-8") as f:
            raw_sql = f.read()

        # Ajustar el nombre cualificado con el Project ID real
        qualified_sql = raw_sql.replace(
            "`quintanamur_warehouse.",
            f"`{GCP_PROJECT_ID}.{DATASET_ID}."
        )

        query_job = client.query(qualified_sql)
        query_job.result()  # Esperar ejecución
        print(f"✅ Tabla de hechos '{GCP_PROJECT_ID}.{DATASET_ID}.fact_leads_analytics' generada correctamente.")
        print(f"   • Campos calculados: lead_quality_score (0-100), business_segment, estimated_logistics_cost_eur.")
    except Exception as e:
        print(f"❌ Error al ejecutar el modelo dimensional en BigQuery: {e}")
        sys.exit(1)

    print("\n" + "=" * 70)
    print("🎉 PIPELINE COMPLETADO AL 100%. DATOS LISTOS PARA POWER BI DESKTOP")
    print(f"   Tabla para conectar: {GCP_PROJECT_ID}.{DATASET_ID}.fact_leads_analytics")
    print("=" * 70)

if __name__ == "__main__":
    run_elt_pipeline()
