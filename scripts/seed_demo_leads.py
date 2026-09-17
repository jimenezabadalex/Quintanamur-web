"""
Script de generación y sembrado de leads de demostración realistas para Quintanamur S.L.
Inserta ~60 solicitudes geolocalizadas en Neon PostgreSQL para alimentar Google BigQuery y Power BI.
"""

import os
import sys
import random
from datetime import datetime, timedelta
import psycopg2
from dotenv import load_dotenv

# Asegurar codificación UTF-8 en Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Cargar variables de entorno desde .env
load_dotenv()

NEON_URI = os.getenv("NEON_DATABASE_URL")
if not NEON_URI:
    raise ValueError("ERROR: NEON_DATABASE_URL no está configurada en .env")

# Coordenadas base de Quintanamur (Yecla)
YECLA_BASE_LAT = 38.6136
YECLA_BASE_LNG = -1.1166

# Pool de municipios reales de la zona de influencia con sus coordenadas centrales aproximadas
MUNICIPALITIES = [
    {"name": "Yecla (Finca La Loma)", "lat": 38.6250, "lng": -1.1020, "dist": 4.2},
    {"name": "Yecla (Las Atalayas)", "lat": 38.5850, "lng": -1.1450, "dist": 6.8},
    {"name": "Yecla (Los Hitos)", "lat": 38.6410, "lng": -1.0820, "dist": 7.5},
    {"name": "Jumilla (Finca El Campillo)", "lat": 38.5120, "lng": -1.2850, "dist": 23.4},
    {"name": "Jumilla (Valle del Carche)", "lat": 38.4420, "lng": -1.2310, "dist": 28.1},
    {"name": "Jumilla (Polígono Los Mármoles)", "lat": 38.4810, "lng": -1.3320, "dist": 29.5},
    {"name": "Villena (La Solana)", "lat": 38.6510, "lng": -0.8820, "dist": 22.8},
    {"name": "Villena (Paraje Las Tiesas)", "lat": 38.6210, "lng": -0.8410, "dist": 25.6},
    {"name": "Caudete (Los Molinos)", "lat": 38.7120, "lng": -0.9950, "dist": 16.8},
    {"name": "Caudete (Polígono Los Villares)", "lat": 38.6920, "lng": -0.9720, "dist": 18.2},
    {"name": "Almansa (El Mugrón)", "lat": 38.8410, "lng": -1.1250, "dist": 32.4},
    {"name": "Almansa (Polígono El Saladar)", "lat": 38.8750, "lng": -1.0820, "dist": 36.1},
    {"name": "Pinoso (Encebras)", "lat": 38.4120, "lng": -1.0650, "dist": 31.0},
    {"name": "Pinoso (Raspay)", "lat": 38.4610, "lng": -1.1120, "dist": 21.5},
    {"name": "Sax (La Hoya)", "lat": 38.5420, "lng": -0.8250, "dist": 37.0},
    {"name": "Elda (Sector Torreta)", "lat": 38.4820, "lng": -0.7850, "dist": 43.5},
    {"name": "Monóvar (Hondón)", "lat": 38.4210, "lng": -0.8520, "dist": 41.2},
    {"name": "Cieza (La Torre)", "lat": 38.2510, "lng": -1.4120, "dist": 54.0},
    {"name": "Hellín (Agramón)", "lat": 38.4850, "lng": -1.6850, "dist": 66.2},
    {"name": "Tobarra (Sierra de las Cabras)", "lat": 38.6120, "lng": -1.7120, "dist": 62.8},
    {"name": "Ontinyent (Sector Industrial)", "lat": 38.8310, "lng": -0.6120, "dist": 71.4},
    {"name": "Alicante (Polígono Las Atalayas)", "lat": 38.3520, "lng": -0.5420, "dist": 82.0},
    {"name": "Murcia (Polígono Oeste)", "lat": 37.9620, "lng": -1.1950, "dist": 86.5},
    {"name": "Albacete (Campollano)", "lat": 38.9950, "lng": -1.8620, "dist": 94.0}
]

CLIENT_FIRST_NAMES = [
    "Antonio", "Francisco", "José", "Manuel", "Juan", "Pedro", "Javier", "Carlos", 
    "Miguel", "Alejandro", "Vicente", "Fernando", "Joaquín", "Salvador", "Gabriel"
]
CLIENT_LAST_NAMES = [
    "Navarro", "García", "Martínez", "López", "Sánchez", "Fernández", "Ruiz", 
    "Castillo", "Jiménez", "Molina", "Soriano", "Palao", "Marco", "Ortuño", "Forte"
]
COMPANIES_SUFFIX = [
    "S.L.", "C.B.", "Agrícola", "Explotaciones", "Hermanos", "Finca", "Viñedos"
]

SERVICES = [
    {
        "category": "agricola",
        "machinery": "Rulos Despedregadores",
        "messages": [
            "Despedregado intensivo de 18 ha con rulo pesado antes de implantar almendro en regadío.",
            "Retirada y triturado de piedra caliza en parcela de viñedo monastrell de 12 ha.",
            "Despedregado tras subsolado profundo en bancales para nueva plantación de olivar.",
            "Necesitamos pasar rulo despedregador en 25 hectáreas llanas."
        ]
    },
    {
        "category": "agricola",
        "machinery": "Tractor Fendt con Autoguiado GPS",
        "messages": [
            "Plantación GPS de 30 ha de pistachos con marco 7x6 en terreno compactado.",
            "Subsolado a 80 cm y nivelación para siembra de cereal en 40 ha.",
            "Preparación integral de suelo agrícola con rulo compactador para viña.",
            "Plantación mecanizada de precisión con tractor y apero guiado por satélite RTK."
        ]
    },
    {
        "category": "civil",
        "machinery": "Excavadora de Cadenas",
        "messages": [
            "Excavación y vaciado para cimentación de nave logística de 2.500 m2.",
            "Apertura de zanjas para canalización de saneamiento y pluviales en polígono.",
            "Vaciado en roca para vaso de piscina comunitaria y cimentación de muros de contención.",
            "Movimiento de tierras y zanjeo para tendido de línea de media tensión."
        ]
    },
    {
        "category": "civil",
        "machinery": "Bulldozer Cat D6",
        "messages": [
            "Desmonte y desbroce de terreno rocoso para explanada de acopio de áridos.",
            "Compactación de terraplén y formación de taludes para balsa de riego de 15.000 m3.",
            "Nivelación masiva de terreno con bulldozer para ampliación de instalaciones industriales.",
            "Empuje de tierras y desmonte de bancales para obra civil."
        ]
    },
    {
        "category": "civil",
        "machinery": "Motoniveladora con Láser",
        "messages": [
            "Refino y rasanteo con niveladora guiada por láser para solera de hormigón pulido.",
            "Arreglo de camino rural de acceso a finca de 3,5 km con zahorras compactadas.",
            "Nivelación de precisión milimétrica para explanada de viales de parque fotovoltaico.",
            "Perfilado de cunetas y rasanteo previo al asfaltado de vial comarcal."
        ]
    },
    {
        "category": "otro",
        "machinery": "Trituradora Forestal",
        "messages": [
            "Desbroce forestal de masa de pinar y monte bajo en perímetro de prevención de incendios.",
            "Arranque y trituración in situ de 8 ha de frutales viejos no productivos.",
            "Limpieza de cauce de rambla y triturado de maleza invasora en lindero de finca."
        ]
    }
]

def generate_seed_data(total_records=60):
    records = []
    now = datetime.now()

    for i in range(total_records):
        # 1. Municipio y coordenadas con ligera dispersión realista (+- 0.005°)
        muni = random.choice(MUNICIPALITIES)
        lat = muni["lat"] + (random.random() - 0.5) * 0.01
        lng = muni["lng"] + (random.random() - 0.5) * 0.01
        dist = max(2.0, round(muni["dist"] + (random.random() - 0.5) * 2.0, 1))

        # 2. Cliente y nombre
        first = random.choice(CLIENT_FIRST_NAMES)
        last1 = random.choice(CLIENT_LAST_NAMES)
        last2 = random.choice(CLIENT_LAST_NAMES)
        
        if random.random() < 0.35:
            # 35% de los leads son empresas / fincas
            prefix = random.choice(COMPANIES_SUFFIX)
            client_name = f"{prefix} {last1} y {last2}"
        else:
            client_name = f"{first} {last1} {last2}"

        # Teléfono español válido
        prefix_digit = random.choice(['6', '7', '9'])
        client_phone = prefix_digit + "".join([str(random.randint(0, 9)) for _ in range(8)])

        # Email (el 65% de los usuarios aporta email, subiendo su Lead Quality Score)
        has_email = random.random() < 0.65
        client_email = f"{first.lower()}.{last1.lower()}@gmail.com" if has_email else None

        # 3. Servicio y máquina
        serv = random.choice(SERVICES)
        category = serv["category"]
        machinery = serv["machinery"]
        msg = random.choice(serv["messages"])

        # 4. Fecha entre hoy y hace 180 días
        days_ago = random.randint(1, 180)
        created_at = now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))

        # 5. Cobertura
        coverage = "ZONA_PRIORITARIA" if dist <= 60.0 else "GRAN_PROYECTO"

        records.append({
            "created_at": created_at,
            "client_name": client_name,
            "client_phone": client_phone,
            "client_email": client_email,
            "service_category": category,
            "machinery_interest": machinery,
            "municipality_name": muni["name"],
            "user_lat": round(lat, 6),
            "user_lng": round(lng, 6),
            "distance_to_base_km": dist,
            "coverage_status": coverage,
            "message_text": msg,
            "privacy_consent_accepted": True,
            "privacy_consent_timestamp": created_at,
            "lead_source": "WEB_FORM",
            "lead_status": random.choice(["NUEVO", "CONTACTADO", "PRESUPUESTADO", "CONVERTIDO"])
        })

    return records

def seed_database():
    print(f"🌾 Conectando a Neon PostgreSQL para inyectar datos de prueba...")
    conn = psycopg2.connect(NEON_URI)
    cur = conn.cursor()

    # Comprobar registros actuales
    cur.execute("SELECT COUNT(*) FROM raw_leads;")
    count_before = cur.fetchone()[0]
    print(f"📊 Registros existentes en raw_leads: {count_before}")

    records = generate_seed_data(65)

    insert_sql = """
    INSERT INTO raw_leads (
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
        privacy_consent_timestamp,
        lead_source,
        lead_status
    ) VALUES (
        %(created_at)s,
        %(client_name)s,
        %(client_phone)s,
        %(client_email)s,
        %(service_category)s,
        %(machinery_interest)s,
        %(municipality_name)s,
        %(user_lat)s,
        %(user_lng)s,
        %(distance_to_base_km)s,
        %(coverage_status)s,
        %(message_text)s,
        %(privacy_consent_accepted)s,
        %(privacy_consent_timestamp)s,
        %(lead_source)s,
        %(lead_status)s
    );
    """

    print(f"🚀 Insertando {len(records)} leads geolocalizados verosímiles...")
    for r in records:
        cur.execute(insert_sql, r)

    conn.commit()

    cur.execute("SELECT COUNT(*) FROM raw_leads;")
    count_after = cur.fetchone()[0]
    conn.close()

    print(f"✅ Sembrado completado con éxito. Total registros en Neon: {count_after} (Insertados: {count_after - count_before})")

if __name__ == "__main__":
    seed_database()
