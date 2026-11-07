/* ==========================================================================
   CampuShare - Mock data (simulated, in memory)
   There is no database: every page load starts from this seed data and
   changes are lost when the page is refreshed, as required by the project
   statement ("simular la interacción de manera creíble").
   ========================================================================== */
(function () {
  "use strict";

  // Proximity of each campus with respect to the student's campus (HU030).
  const CAMPUS_DISTANCE = {
    Monterrico: { Monterrico: "near", "San Isidro": "mid", Villa: "far", "San Miguel": "mid" },
    "San Isidro": { Monterrico: "mid", "San Isidro": "near", Villa: "far", "San Miguel": "mid" },
    Villa: { Monterrico: "far", "San Isidro": "far", Villa: "near", "San Miguel": "far" },
    "San Miguel": { Monterrico: "mid", "San Isidro": "mid", Villa: "far", "San Miguel": "near" }
  };

  const PROXIMITY_LABEL = { near: "Misma sede", mid: "Sede cercana", far: "Otra sede" };

  const users = {
    u1: { id: "u1", name: "Andrea Rojas", initials: "AR", career: "Ing. Industrial", cycle: "8.º ciclo", rating: 4.8, ratings: 23, deals: 23, onTime: 22, incidents: 0 },
    u2: { id: "u2", name: "Diego Gómez", initials: "DG", career: "Ing. Civil", cycle: "6.º ciclo", rating: 4.6, ratings: 14, deals: 15, onTime: 14, incidents: 0 },
    u3: { id: "u3", name: "Lucía Paredes", initials: "LP", career: "Medicina", cycle: "4.º ciclo", rating: 4.9, ratings: 31, deals: 31, onTime: 31, incidents: 0 },
    u4: { id: "u4", name: "Marco Torres", initials: "MT", career: "Arquitectura", cycle: "7.º ciclo", rating: 4.7, ratings: 9, deals: 10, onTime: 9, incidents: 1 },
    u5: { id: "u5", name: "Kevin Mendoza", initials: "KM", career: "Biología", cycle: "3.er ciclo", rating: 4.7, ratings: 12, deals: 12, onTime: 12, incidents: 0 },
    u6: { id: "u6", name: "Sofía León", initials: "SL", career: "Ing. de Sistemas", cycle: "5.º ciclo", rating: 4.5, ratings: 7, deals: 8, onTime: 7, incidents: 0 },
    u7: { id: "u7", name: "Renato Quispe", initials: "RQ", career: "Ing. Electrónica", cycle: "2.º ciclo", rating: 3.9, ratings: 5, deals: 6, onTime: 4, incidents: 2 }
  };

  // status: available | reserved | on-loan | paused | withdrawn
  // modality: loan | donation | exchange
  const materials = [
    { id: "m1", title: "Calculadora Casio fx-991", course: "Cálculo I", code: "MA262", faculty: "Ingeniería", category: "Calculadoras", campus: "Monterrico", point: "Biblioteca – Sede Monterrico", status: "available", modality: "loan", condition: "Buen estado", ownerId: "u1", maxDays: 60, until: "15/12/2026", description: "Calculadora científica con 417 funciones. Incluye estuche y manual. La usé un ciclo para Cálculo I y Física I." },
    { id: "m2", title: "Stewart Cálculo 7.ª ed.", course: "Cálculo I", code: "MA262", faculty: "Ingeniería", category: "Libros", campus: "Monterrico", point: "Biblioteca – Sede Monterrico", status: "available", modality: "loan", condition: "Buen estado", ownerId: "u2", maxDays: 45, until: "20/12/2026", description: "Libro de texto del curso con algunos resaltados a lápiz. Sin hojas faltantes." },
    { id: "m3", title: "Guía de ejercicios Cálculo", course: "Cálculo I", code: "MA262", faculty: "Ingeniería", category: "Libros", campus: "San Isidro", point: "Cafetería – Sede San Isidro", status: "available", modality: "donation", condition: "Con desgaste", ownerId: "u3", maxDays: 0, until: "30/11/2026", description: "Guía resuelta de prácticas calificadas. La dono porque ya aprobé el curso." },
    { id: "m4", title: "Calculadora gráfica TI-84", course: "Cálculo I", code: "MA262", faculty: "Ingeniería", category: "Calculadoras", campus: "Villa", point: "Biblioteca – Sede Villa", status: "reserved", modality: "loan", condition: "Buen estado", ownerId: "u4", maxDays: 30, until: "10/12/2026", description: "Calculadora gráfica con cable USB. Reservada hasta el viernes." },
    { id: "m5", title: "Formulario de derivadas", course: "Cálculo I", code: "MA262", faculty: "Ingeniería", category: "Libros", campus: "San Isidro", point: "Biblioteca – Sede San Isidro", status: "available", modality: "exchange", condition: "Nuevo", ownerId: "u5", maxDays: 0, wanted: "Formulario de integrales", until: "15/12/2026", description: "Formulario plastificado. Lo cambio por uno de integrales." },
    { id: "m6", title: "Física Serway Vol. 1", course: "Física I", code: "FI101", faculty: "Ingeniería", category: "Libros", campus: "San Isidro", point: "Biblioteca – Sede San Isidro", status: "available", modality: "loan", condition: "Buen estado", ownerId: "u2", maxDays: 60, until: "18/12/2026", description: "Edición en español, tapa dura. Incluye solucionario impreso." },
    { id: "m7", title: "Kit de disección", course: "Biología Celular", code: "BI110", faculty: "Ciencias de la Salud", category: "Laboratorio", campus: "Monterrico", point: "Biblioteca – Sede Monterrico", status: "available", modality: "loan", condition: "Buen estado", ownerId: "me", maxDays: 20, until: "05/12/2026", description: "Kit completo con pinzas, tijeras y bisturí. Desinfectado después de cada uso." },
    { id: "m8", title: "Escalímetro y escuadras", course: "Dibujo Técnico", code: "AR120", faculty: "Arquitectura", category: "Dibujo", campus: "Villa", point: "Cafetería – Sede Villa", status: "available", modality: "loan", condition: "Con desgaste", ownerId: "u4", maxDays: 30, until: "12/12/2026", description: "Escalímetro triangular y juego de escuadras de 30 cm." },
    { id: "m9", title: "Bata de laboratorio talla M", course: "Química General", code: "QU101", faculty: "Ciencias de la Salud", category: "Laboratorio", campus: "Monterrico", point: "Biblioteca – Sede Monterrico", status: "available", modality: "donation", condition: "Buen estado", ownerId: "u3", maxDays: 0, until: "30/12/2026", description: "Bata blanca de algodón, lavada y lista para usar." },
    { id: "m10", title: "Lentes de seguridad", course: "Química General", code: "QU101", faculty: "Ciencias de la Salud", category: "Laboratorio", campus: "San Miguel", point: "Biblioteca – Sede San Miguel", status: "available", modality: "loan", condition: "Nuevo", ownerId: "u6", maxDays: 60, until: "20/12/2026", description: "Lentes de seguridad sin uso, con funda." },
    { id: "m11", title: "Estadística de Triola", course: "Estadística", code: "MA147", faculty: "Negocios", category: "Libros", campus: "Monterrico", point: "Cafetería – Pabellón C", status: "available", modality: "loan", condition: "Buen estado", ownerId: "u6", maxDays: 45, until: "15/12/2026", description: "12.ª edición. Ideal para Estadística Aplicada I y II." },
    // Materials published by the logged-in student ("me")
    { id: "m13", title: "Stewart Cálculo 8.ª ed.", course: "Cálculo II", code: "MA263", faculty: "Ingeniería", category: "Libros", campus: "Monterrico", point: "Biblioteca – Sede Monterrico", status: "reserved", modality: "loan", condition: "Buen estado", ownerId: "me", maxDays: 45, until: "20/12/2026", description: "Libro de texto con solucionario. Tiene mi nombre en la primera página." },
    { id: "m14", title: "Escalímetro de 30 cm", course: "Dibujo Técnico", code: "AR120", faculty: "Arquitectura", category: "Dibujo", campus: "Monterrico", point: "Cafetería – Pabellón C", status: "paused", modality: "loan", condition: "Con desgaste", ownerId: "me", maxDays: 30, until: "15/12/2026", description: "Escalímetro triangular de aluminio." },
    { id: "m15", title: "Química General – Chang", course: "Química General", code: "QU101", faculty: "Ciencias de la Salud", category: "Libros", campus: "Monterrico", point: "Biblioteca – Sede Monterrico", status: "on-loan", modality: "loan", condition: "Buen estado", ownerId: "me", maxDays: 30, until: "30/12/2026", description: "10.ª edición en español." },
    // Materials the student has borrowed from others
    { id: "m16", title: "Calculadora Casio fx-570", course: "Física I", code: "FI101", faculty: "Ingeniería", category: "Calculadoras", campus: "Monterrico", point: "Biblioteca – Sede Monterrico", status: "on-loan", modality: "loan", condition: "Buen estado", ownerId: "u1", maxDays: 30, until: "15/12/2026", description: "Calculadora científica con funciones de estadística." },
    { id: "m17", title: "Física Serway Vol. 2", course: "Física II", code: "FI102", faculty: "Ingeniería", category: "Libros", campus: "San Isidro", point: "Biblioteca – Sede San Isidro", status: "on-loan", modality: "loan", condition: "Buen estado", ownerId: "u2", maxDays: 60, until: "18/12/2026", description: "Segundo tomo, tapa dura." },
    { id: "m12", title: "Juego de compases", course: "Dibujo Técnico", code: "AR120", faculty: "Arquitectura", category: "Dibujo", campus: "Monterrico", point: "Biblioteca – Sede Monterrico", status: "available", modality: "exchange", condition: "Buen estado", ownerId: "u7", maxDays: 0, wanted: "Escalímetro", until: "10/12/2026", description: "Juego de compases metálicos con estuche. Lo cambio por un escalímetro." }
  ];

  // Safe, signposted delivery points by campus (HU016)
  const safePoints = {
    Monterrico: ["Biblioteca – Sede Monterrico", "Cafetería – Pabellón C", "Hall del Pabellón A"],
    "San Isidro": ["Biblioteca – Sede San Isidro", "Cafetería – Sede San Isidro"],
    Villa: ["Biblioteca – Sede Villa", "Cafetería – Sede Villa"],
    "San Miguel": ["Biblioteca – Sede San Miguel", "Patio central – Sede San Miguel"]
  };

  // Free time slots of each student, based on their class schedule (HU017)
  const freeSlots = {
    me: ["Lun 12:00–13:00", "Mar 18:00–19:00", "Mié 10:00–11:00", "Jue 12:00–13:00", "Vie 16:00–17:00"],
    u1: ["Lun 12:00–13:00", "Mar 18:00–19:00", "Jue 12:00–13:00", "Vie 16:00–17:00"],
    u2: ["Mar 18:00–19:00", "Mié 10:00–11:00", "Vie 16:00–17:00"],
    u3: ["Lun 12:00–13:00", "Mié 10:00–11:00", "Jue 12:00–13:00"],
    u4: ["Mar 18:00–19:00", "Jue 12:00–13:00"],
    u5: ["Lun 12:00–13:00", "Mar 18:00–19:00", "Vie 16:00–17:00"],
    u6: ["Mié 10:00–11:00", "Jue 12:00–13:00", "Vie 16:00–17:00"],
    u7: ["Lun 12:00–13:00", "Vie 16:00–17:00"]
  };

  window.CampuShareData = {
    safePoints: safePoints,
    freeSlots: freeSlots,
    users: users,
    materials: materials,
    campusDistance: CAMPUS_DISTANCE,
    proximityLabel: PROXIMITY_LABEL,
    modalityLabel: { loan: "Préstamo", donation: "Donación", exchange: "Intercambio" },
    statusLabel: { available: "Disponible", reserved: "Reservado", "on-loan": "En préstamo", paused: "Pausada", withdrawn: "Retirada" }
  };
})();
