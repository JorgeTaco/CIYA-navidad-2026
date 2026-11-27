window.CIYA_DATA = {
  evento: {
    nombre: 'CIYA 4.0 Ingenio que Ilumina la Navidad 2026',
    lema: '5 carreras, 1 energía solidaria',
    fecha: 'Viernes 4 de diciembre de 2026',
    fechaISO: '2026-12-04',
    lugar: 'Hall Principal e instalaciones de la Facultad CIYA',
    plataforma: 'Aplicación Web Responsive CIYA Navidad 2026'
  },
  carreras: [
    { id: 'electricidad', nombre: 'Electricidad', sigla: 'EL', icono: '⚡', color: '#ffd166', aula: '20 a la 26' },
    { id: 'electromecanica', nombre: 'Electromecánica', sigla: 'EM', icono: '⚙', color: '#ff8c42', aula: '9 a la 13' },
    { id: 'industrial', nombre: 'Industrial', sigla: 'IN', icono: '🏭', color: '#ef476f', aula: '15 a la 19' },
    { id: 'hidraulica', nombre: 'Hidráulica', sigla: 'HI', icono: '💧', color: '#4cc9f0', aula: '1 a la 4' },
    { id: 'sistemas', nombre: 'Sistemas y Software', sigla: 'SY', icono: '💻', color: '#06d6a0', aula: '5 a la 8' }
  ],
  ciclos: [
    { id: 'nivelacion', nombre: 'Nivelación' },
    { id: 'ciclo1', nombre: '1er ciclo' },
    { id: 'ciclo2', nombre: '2do ciclo' },
    { id: 'ciclo3', nombre: '3er ciclo' },
    { id: 'ciclo4', nombre: '4to ciclo' },
    { id: 'ciclo5', nombre: '5to ciclo' },
    { id: 'ciclo6', nombre: '6to ciclo' },
    { id: 'ciclo7', nombre: '7mo ciclo' },
    { id: 'ciclo8', nombre: '8vo ciclo' }
  ],
  categoriasVillancicos: [
    'Acústico / Rock Navideño',
    'Villancico Parodia CIYA',
    'Coro de Carrera'
  ],
  criteriosVillancicos: [
    { id: 'creatividad', nombre: 'Creatividad e identidad CIYA', detalle: 'Originalidad en arreglos, adaptación de textos y vinculación temática con la ingeniería.', peso: 30 },
    { id: 'musical', nombre: 'Afinación, ritmo y desempeño musical', detalle: 'Calidad vocal, precisión rítmica, acople instrumental y dominio técnico escénico.', peso: 30 },
    { id: 'escena', nombre: 'Puesta en escena y vestuario', detalle: 'Coordinación dinámica, indumentaria festiva y proyección estética del conjunto.', peso: 20 },
    { id: 'aplauso', nombre: 'Respuesta del público (Aplausómetro)', detalle: 'Intensidad del respaldo medida objetivamente mediante decibelímetro en tiempo real.', peso: 20 }
  ],
  criteriosPuertas: [
    { id: 'creatividad', nombre: 'Creatividad e identidad de carrera', detalle: 'Coherencia entre símbolos navideños y elementos de la carrera.', peso: 30 },
    { id: 'sostenibilidad', nombre: 'Sostenibilidad y uso de reciclaje', detalle: 'Aprovechamiento de materiales reciclados o de bajo impacto ambiental.', peso: 30 },
    { id: 'estetica', nombre: 'Estética, impacto visual y acabado', detalle: 'Prolijidad técnica, armonía del diseño y volumen visual.', peso: 25 },
    { id: 'equipo', nombre: 'Trabajo en equipo y cumplimiento de normas', detalle: 'Colaboración en la ejecución y observancia de las reglas de seguridad.', peso: 15 }
  ],
  secuenciaEncendido: ['industrial', 'hidraulica', 'electromecanica', 'sistemas', 'electricidad'],
  frasesLinterna: [
    'Feliz Navidad CIYA',
    'Orgullo Industrial',
    'Compilando el 2027',
    '5 carreras, 1 energía',
    'Ingenio que ilumina',
    'Cero errores, mucha luz'
  ],
  mensajesQR: [
    {
      id: 'mensaje-general',
      titulo: 'Mensaje general',
      ubicacion: 'Entrada / Hall',
      texto: '¡Feliz Navidad, futuro ingeniero! Si sobreviviste a los parciales, a los informes de madrugada y al tráfico, mereces un buen chocolate caliente hoy. ¡Nos vemos desde las 17:00 en el hall para la acreditación!'
    },
    {
      id: 'mensaje-electricidad',
      titulo: 'Electricidad',
      ubicacion: 'Pasillos y laboratorios',
      texto: 'Que esta Navidad tu vida tenga alto voltaje de alegría, cero cortocircuitos en tus proyectos y una buena puesta a tierra para el estrés del semestre.'
    },
    {
      id: 'mensaje-electromecanica',
      titulo: 'Electromecánica',
      ubicacion: 'Pasillos y laboratorios',
      texto: 'Que en 2027 todos tus engranajes encajen a la perfección, tu torque profesional siga subiendo y nunca te falte energía para mover el mundo.'
    },
    {
      id: 'mensaje-industrial',
      titulo: 'Industrial',
      ubicacion: 'Pasillos y laboratorios',
      texto: 'Eficiencia del 100% en abrazos, cero cuellos de botella en tus metas y mejora continua para este nuevo año. ¡Orgullo Industrial!'
    },
    {
      id: 'mensaje-hidraulica',
      titulo: 'Hidráulica',
      ubicacion: 'Pasillos y laboratorios',
      texto: 'Que tus planes fluyan siempre en régimen laminar, sin pérdidas de carga y con la presión justa para llegar a lo más alto.'
    },
    {
      id: 'mensaje-sistemas',
      titulo: 'Sistemas y Software',
      ubicacion: 'Pasillos y laboratorios',
      texto: 'Que tu 2027 compile a la primera, sin errores en producción y con while(vida) { disfrutar(); }. ¡Felices fiestas!'
    },
    {
      id: 'mensaje-solidario',
      titulo: 'Mensaje solidario',
      ubicacion: 'Cerca de los contenedores',
      texto: 'Ese juguete o funda de caramelos que trajiste hoy es el mejor proyecto de ingeniería del semestre: estás diseñando una sonrisa real.'
    }
  ],
  trivias: [
    {
      id: 'trivia-gradas',
      ubicacion: 'Gradas',
      pregunta: 'Si Santa Claus tuviera que entregar regalos a todos los niños del mundo en una noche, ¿qué rama de CIYA le salvaría primero la logística?',
      opciones: ['Hidráulica', 'Industrial', 'Sistemas'],
      correcta: 1,
      remate: '¡Exacto! Optimización de rutas y cero cuellos de botella en el trineo.'
    },
    {
      id: 'trivia-bar',
      ubicacion: 'Bar / Cafetería',
      pregunta: '¿Cuál es el verdadero combustible oficial que mantiene encendidos los laboratorios de CIYA en semana de exámenes?',
      opciones: ['Energía solar', 'Café cargado y fe', '220V trifásico'],
      correcta: 1,
      remate: 'Dato científicamente comprobado. ¡Ve por tu chocolate caliente hoy a las 19:25!'
    },
    {
      id: 'trivia-laboratorios',
      ubicacion: 'Laboratorios',
      pregunta: 'En el encendido de hoy, ¿cuál es el orden exacto de la reacción en cadena "5 Carreras, 1 Energía"?',
      opciones: ['Electricidad → Software → Industrial', 'Industrial → Hidráulica → Electromecánica → Software → Electricidad', 'Todos a la vez y que sea lo que Dios quiera'],
      correcta: 1,
      remate: '¡Aprobado! No te pierdas el acto central de 18:25 a 18:55 en el hall.'
    },
    {
      id: 'trivia-sistemas',
      ubicacion: 'Pasillo Sistemas',
      pregunta: '¿Qué significa el error HTTP 404 aplicado a tu cuenta bancaria en diciembre?',
      opciones: ['Servidor sobrecargado', 'Aguinaldo Not Found', 'Conexión exitosa'],
      correcta: 1,
      remate: 'Por suerte hoy el evento y la chocolatada son a costo $0.'
    },
    {
      id: 'trivia-banos',
      ubicacion: 'Baños / Espejo',
      pregunta: '¿Cuántos metros mide el árbol navideño reciclado que armó la facultad este año?',
      opciones: ['2 metros', '4 metros', 'Lo que aguante la estructura'],
      correcta: 1,
      remate: '¡4 metros de puro ingenio CIYA! Pasa a tomarte tu foto en el Rincón Instagrameable.'
    }
  ],
  memes: [
    {
      id: 'meme-cheems',
      plantilla: 'El perro Cheems (Antes vs. Ahora)',
      texto: 'Ingeniero diseñando el mecanismo 5 en 1 con Arduino, sensores y relés. | Yo intentando desenredar las luces del árbol de mi casa.'
    },
    {
      id: 'meme-drake',
      plantilla: 'Drake diciendo No / Sí',
      texto: 'Comprar adornos caros en el centro comercial. | Armar un árbol de 4 metros con cartón reciclado, cable UTP y botellas PET a costo $0.'
    },
    {
      id: 'meme-botones',
      plantilla: 'Dos botones rojos',
      texto: 'Estudiar para el examen final. | Ir al concurso de villancicos por el Comodín de Prórroga de 24 horas.'
    },
    {
      id: 'meme-spiderman',
      plantilla: 'Spider-Man señalándose (5 Spider-Mans)',
      texto: 'Las 5 carreras de CIYA viendo quién recolectó más juguetes y caramelos para ganar la Copa Solidaria.'
    },
    {
      id: 'meme-gato',
      plantilla: 'Gato en la mesa / Mujer gritando',
      texto: '¡Te dije que el código de la ruleta debía funcionar sin Wi-Fi! | En mi compu sí compilaba.'
    }
  ],
  cronograma: [
    { fase: 'previo', hora: '08:00 – 17:45', bloque: 'Recepción Solidaria, Donaciones y Canje de QR', detalle: 'Recepción de bienes y canje de QR. Acreditación del sorteo de 17:00 a 17:45.' },
    { fase: 'previo', hora: '15:00', bloque: 'Cierre de montaje de Puertas Decoradas', detalle: 'Término del plazo formal para las cinco carreras.' },
    { fase: 'previo', hora: '15:30 – 16:45', bloque: 'Evaluación de Puertas Decoradas', detalle: 'Recorrido formal de inspección del jurado calificador.' },
    { id: 'villancicos', fase: 'escenario', hora: '17:45 – 18:25', bloque: 'Concurso de Villancicos "CIYA tiene Talento"', detalle: 'Presentaciones sobre escenario, límite de 3 minutos por intervención.' },
    { fase: 'escenario', hora: '18:25 – 18:55', bloque: 'Mensaje Institucional, Mar de Linternas y Encendido', detalle: 'Acto central y encendido sincronizado del Árbol Navideño CIYA 2026. El QR del Mar de Linternas se proyecta a las 18:20.' },
    { fase: 'escenario', hora: '18:55 – 19:25', bloque: 'Premiación y Gran Sorteo Digital', detalle: 'Adjudicación de reconocimientos y ejecución de la Ruleta Digital.' },
    { fase: 'cierre', hora: '19:25 – 20:15', bloque: 'Estación de Recarga Térmica y Cierre', detalle: 'Distribución de alimentos tradicionales, registro fotográfico y conclusión.' }
  ]
};
