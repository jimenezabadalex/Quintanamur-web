export interface ServicioSlide {
  tipo: "image" | "video";
  src: string;
  badge: string;
  titulo: string;
  duracion?: number; // en milisegundos (para imágenes)
}

export interface ServicioPaso {
  numero: number;
  titulo: string;
  icono: string;
  esVideo?: boolean;
}

export interface Servicio {
  id: string;
  numero: string;
  categoria: "agricola" | "obra-civil";
  badgeCategoria: string;
  titulo: string;
  fraseCorta: string;
  descripcionLarga: string;
  icono: string;
  maquinaria: string;
  maquinariaDetalle: string;
  ctaTexto: string;
  pasos: ServicioPaso[];
  slides: ServicioSlide[];
}

export const SERVICIOS: Servicio[] = [
  // ==========================================
  // SECTOR AGRÍCOLA
  // ==========================================
  {
    id: "despedregado",
    numero: "01",
    categoria: "agricola",
    badgeCategoria: "Preparación de Suelo",
    titulo: "Despedregado de Fincas y Trituración de Piedra",
    fraseCorta:
      "Trituramos roca in situ hasta 35 cm de profundidad para transformar terrenos pedregosos en tierras 100% fértiles y cultivables.",
    descripcionLarga:
      "Transformamos terrenos pedregosos en parcelas óptimas para el cultivo. Nuestra maquinaria de alta potencia tritura la piedra superficial y subsuperficial directamente en el terreno, mejorando la estructura edáfica, la retención de humedad y evitando el desgaste de aperos sin necesidad de retirar material de la finca.",
    icono: "precision_manufacturing",
    maquinaria: "Fresadora FI-IVAN + Fendt 933",
    maquinariaDetalle: "Tractor Fendt 933 Vario (330 CV) + Fresadora trituradora de piedra FI-IVAN",
    ctaTexto: "Solicitar presupuesto de despedregado",
    pasos: [
      {
        numero: 1,
        titulo: "Estado Inicial: Parcela con alta pedregosidad",
        icono: "landscape",
      },
      {
        numero: 2,
        titulo: "Equipo Especializado: Fresadora trituradora FI-IVAN",
        icono: "precision_manufacturing",
      },
      {
        numero: 3,
        titulo: "Trituración y Molienda In Situ de Roca",
        icono: "play_circle",
        esVideo: true,
      },
      {
        numero: 4,
        titulo: "Resultado Final: Finca acondicionada y cultivable",
        icono: "check_circle",
      },
    ],
    slides: [
      {
        tipo: "image",
        src: "/images/servicios/agricola/despedregado/parcela-piedra-antes.webp",
        badge: "Paso 1: Parcela Inicial",
        titulo: "Terreno rocoso antes de la intervención",
        duracion: 4500,
      },
      {
        tipo: "image",
        src: "/images/servicios/agricola/despedregado/tractor-fresadora.webp",
        badge: "Paso 2: Fresadora Trituradora",
        titulo: "Fresadora trituradora pesada FI-IVAN para molienda en profundidad",
        duracion: 4500,
      },
      {
        tipo: "video",
        src: "/images/servicios/agricola/despedregado/tractor-moler-piedra.mp4",
        badge: "Paso 3: Molienda de Roca en Acción (Vídeo)",
        titulo: "Trituración continua de piedra hasta 35 cm de profundidad",
      },
      {
        tipo: "image",
        src: "/images/servicios/agricola/despedregado/parcela-piedra-despues.webp",
        badge: "Paso 4: Finca Limpia y Lista",
        titulo: "Terreno acondicionado, libre de piedras y listo para cultivo",
        duracion: 4500,
      },
    ],
  },
  {
    id: "plantacion-gps",
    numero: "02",
    categoria: "agricola",
    badgeCategoria: "Plantación de Precisión",
    titulo: "Plantación con Guiado por Satélite GPS",
    fraseCorta:
      "Alineación milimétrica por satélite y colocación de tutores en una sola pasada para viñedo, almendro, olivar y frutales.",
    descripcionLarga:
      "Servicio integral de plantación mecanizada con posicionamiento RTK por satélite. Garantizamos alineaciones exactas en cualquier marco de plantación, apertura del hoyo, colocación de la planta y clavado de tutor en un único proceso continuo, reduciendo drásticamente costes de mano de obra y tiempos de ejecución.",
    icono: "satellite_alt",
    maquinaria: "Plantadora TOPCOM con GPS",
    maquinariaDetalle: "Plantadora guiada por satélite GPS Topcon RTK de alta precisión",
    ctaTexto: "Consultar disponibilidad de plantación",
    pasos: [
      {
        numero: 1,
        titulo: "Replanteo y diseño topográfico del marco",
        icono: "map",
      },
      {
        numero: 2,
        titulo: "Plantación y tutelado en una sola pasada",
        icono: "satellite_alt",
      },
      {
        numero: 3,
        titulo: "Líneas de plantación homogéneas y alineadas",
        icono: "check_circle",
      },
    ],
    slides: [
      {
        tipo: "image",
        src: "/images/servicios/agricola/plantacion-gps-vinedo.webp",
        badge: "Paso 1: Guiado Satelital en Acción",
        titulo: "Plantación de viñedo con guiado RTK",
        duracion: 5000,
      },
    ],
  },
  {
    id: "desfonde",
    numero: "03",
    categoria: "agricola",
    badgeCategoria: "Acondicionamiento",
    titulo: "Desfonde de Tierras y Arado Profundo",
    fraseCorta:
      "Rotura de horizontes compactados y suela de labor para maximizar el drenaje y desarrollo radicular en nuevas plantaciones.",
    descripcionLarga:
      "Labor pesada de desfonde para roturar capas endurecidas del subsuelo que impiden la penetración del agua y el desarrollo de las raíces. Mediante aperos de volteo y descompactación profunda preparamos el perfil del suelo para que los nuevos cultivos aprovechen el 100% de los nutrientes y reservas hídricas.",
    icono: "landscape",
    maquinaria: "Arado de volteo profundo",
    maquinariaDetalle: "Arado de vertedera profunda + Tractor de tiro pesado",
    ctaTexto: "Pedir valoración para desfonde",
    pasos: [
      {
        numero: 1,
        titulo: "Diagnóstico de compactación de perfil",
        icono: "layers",
      },
      {
        numero: 2,
        titulo: "Rotura de suela de labor a gran profundidad",
        icono: "agriculture",
      },
      {
        numero: 3,
        titulo: "Oxigenación y preparación del horizonte de plantación",
        icono: "check_circle",
      },
    ],
    slides: [
      {
        tipo: "image",
        src: "/images/servicios/agricola/despedregado-trituracion.webp",
        badge: "Paso 1: Labor de Descompactación",
        titulo: "Preparación profunda de suelo agrícola",
        duracion: 5000,
      },
    ],
  },
  {
    id: "arranque-cultivos",
    numero: "04",
    categoria: "agricola",
    badgeCategoria: "Reestructuración",
    titulo: "Arranque de Viña y Limpieza de Cultivos",
    fraseCorta:
      "Desarraigo mecánico de cepas y arbolado improductivo, retirada de restos y nivelación completa para nueva siembra.",
    descripcionLarga:
      "Eliminación integral y mecanizada de plantaciones leñosas, viñedos viejos y frutales improductivos. Arrancamos de raíz el sistema radicular sin fragmentar cepas, acopiamos el ramaje y dejamos la parcela completamente despejada y allanada para su próxima siembra o reestructuración de viñedo.",
    icono: "yard",
    maquinaria: "Tractor John Deere + Extractor + Pala",
    maquinariaDetalle: "Tractor John Deere 7710 + Apero extractor de raíz + Pala cargadora",
    ctaTexto: "Pedir precio por hectárea para arranque",
    pasos: [
      {
        numero: 1,
        titulo: "Estado Inicial: Parcela con viñedo improductivo",
        icono: "yard",
      },
      {
        numero: 2,
        titulo: "Equipo de Tiro: Tractor John Deere de gran potencia",
        icono: "agriculture",
      },
      {
        numero: 3,
        titulo: "Arranque Profundo de Raíz",
        icono: "play_circle",
        esVideo: true,
      },
      {
        numero: 4,
        titulo: "Recogida y Despeje Mecánico",
        icono: "play_circle",
        esVideo: true,
      },
      {
        numero: 5,
        titulo: "Resultado Final: Finca limpia y allanada",
        icono: "check_circle",
      },
    ],
    slides: [
      {
        tipo: "image",
        src: "/images/servicios/agricola/arranque/cultivo-antes-arranque.webp",
        badge: "Paso 1: Parcela Inicial",
        titulo: "Finca de viña antes de la intervención",
        duracion: 4500,
      },
      {
        tipo: "image",
        src: "/images/servicios/agricola/arranque/tractor-aranque-cultivos.webp",
        badge: "Paso 2: Equipo de Tiro en Campo",
        titulo: "Tractor John Deere 7710 preparado con apero extractor",
        duracion: 4500,
      },
      {
        tipo: "video",
        src: "/images/servicios/agricola/arranque/tractor-arranque-cultivo.mp4",
        badge: "Paso 3: Arranque de Raíz (Vídeo)",
        titulo: "Extracción continua del cepellón radicular",
      },
      {
        tipo: "video",
        src: "/images/servicios/agricola/arranque/recogida-aranque-cultivos.mp4",
        badge: "Paso 4: Recogida y Acopio (Vídeo)",
        titulo: "Despeje mecánico y acopio de sarmientos",
      },
      {
        tipo: "image",
        src: "/images/servicios/agricola/arranque/cultivo-despues-arranque.webp",
        badge: "Paso 5: Finca Limpia y Lista",
        titulo: "Terreno acondicionado y nivelado",
        duracion: 4500,
      },
    ],
  },

  // ==========================================
  // SECTOR OBRA CIVIL Y EXCAVACIONES
  // ==========================================
  {
    id: "excavaciones",
    numero: "05",
    categoria: "obra-civil",
    badgeCategoria: "Movimiento de Tierras",
    titulo: "Excavaciones, Cimentaciones y Nivelaciones",
    fraseCorta:
      "Vaciados de tierra, zanjas para canalizaciones y grandes explanaciones para naves industriales, balsas y edificación.",
    descripcionLarga:
      "Ejecución precisa de excavaciones para cimentaciones profundas, zanjas de acometidas y canalizaciones técnicas, y grandes movimientos de tierra para preparación de plataformas industriales y nivelaciones topográficas con maquinaria pesada propia.",
    icono: "engineering",
    maquinaria: "Retropala TrinityB 432",
    maquinariaDetalle: "Retropala mixta con cazos de zanja, limpieza y martillo demoledor",
    ctaTexto: "Consultar servicios de excavación",
    pasos: [
      {
        numero: 1,
        titulo: "Estudio geotécnico y replanteo de cotas",
        icono: "straighten",
      },
      {
        numero: 2,
        titulo: "Vaciado y zanjeo con retropala mixta",
        icono: "engineering",
      },
      {
        numero: 3,
        titulo: "Plataforma nivelada y lista para cimentar",
        icono: "check_circle",
      },
    ],
    slides: [
      {
        tipo: "image",
        src: "/images/servicios/obra-civil/excavaciones-movimiento.webp",
        badge: "Paso 1: Excavación y Movimiento",
        titulo: "Retropala mixta trabajando en cimentación",
        duracion: 5000,
      },
    ],
  },
  {
    id: "caminos-rurales",
    numero: "06",
    categoria: "obra-civil",
    badgeCategoria: "Restauración de Firmes",
    titulo: "Arreglo y Trituración de Caminos Rurales",
    fraseCorta:
      "Rehabilitamos pistas y caminos triturando la piedra in situ para conseguir firmes lisos y duraderos sin aportar zahorras.",
    descripcionLarga:
      "Acondicionamiento y recuperación integral de caminos rurales, agrícolas y pistas forestales mediante trituración de piedra in situ. Convertimos firmes pedregosos y degradados en superficies compactas y transitables de una sola pasada, sin necesidad de aportar áridos externos ni retirar escombros.",
    icono: "alt_route",
    maquinaria: "Fresadora de caminos FI-IVAN + Fendt",
    maquinariaDetalle: "Fresadora especializada de caminos FI-IVAN 2T S2 + Fendt",
    ctaTexto: "Solicitar arreglo de camino rural",
    pasos: [
      {
        numero: 1,
        titulo: "Escarificado y descompactación del firme",
        icono: "alt_route",
      },
      {
        numero: 2,
        titulo: "Trituración in situ de piedra y baches",
        icono: "precision_manufacturing",
      },
      {
        numero: 3,
        titulo: "Rasante plana, firme homogéneo y transitable",
        icono: "check_circle",
      },
    ],
    slides: [
      {
        tipo: "image",
        src: "/images/servicios/obra-civil/trituracion-reciclaje.webp",
        badge: "Paso 1: Recuperación de Camino",
        titulo: "Fresadora triturando y nivelando pista rural",
        duracion: 5000,
      },
    ],
  },
  {
    id: "desbroce-forestal",
    numero: "07",
    categoria: "obra-civil",
    badgeCategoria: "Desbroce Pesado",
    titulo: "Trituración de Arbolado y Desbroce Integral",
    fraseCorta:
      "Desbroce pesado y trituración de maleza densa o arbolado en parcelas forestales, solares urbanos y plantas solares.",
    descripcionLarga:
      "Limpieza profunda de fincas forestales, parcelas industriales y solares urbanizables eliminando arbolado y maleza densa con trituradoras forestales de martillos fijos de gran capacidad. Acondicionamiento óptimo para prevención de incendios, infraestructuras y parques solares.",
    icono: "forest",
    maquinaria: "Trituradora Forestal TFT Cancela",
    maquinariaDetalle: "Trituradora forestal pesada de rotor con martillos de carburo de tungsteno",
    ctaTexto: "Solicitar desbroce forestal",
    pasos: [
      {
        numero: 1,
        titulo: "Apeo y trituración de masa vegetal leñosa",
        icono: "forest",
      },
      {
        numero: 2,
        titulo: "Mulching superficial e incorporación al suelo",
        icono: "recycling",
      },
      {
        numero: 3,
        titulo: "Finca despejada con riesgo de incendio neutralizado",
        icono: "check_circle",
      },
    ],
    slides: [
      {
        tipo: "image",
        src: "/images/servicios/obra-civil/desbroce-forestal.webp",
        badge: "Paso 1: Desbroce Pesado Forestal",
        titulo: "Trituradora forestal triturando arbolado y matorral",
        duracion: 5000,
      },
    ],
  },
];
