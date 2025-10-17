const express = require('express');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const PDFTable = require('pdfkit-table');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcrypt');
const { Expo } = require('expo-server-sdk');
const expo = new Expo();
const cloudinary = require('./cloudinary'); // 👈 Importación al inicio
// 🔧 Cálculo de distancia en km entre dos coordenadas
const obtenerDistanciaKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

app.use((req, res, next) => {
  req.clienteNombre = req.headers['cliente-nombre'] || null;
  next();
});

 

app.post('/suscribirse', async (req, res) => {
  const { subscription, tecnicoId } = req.body;

  if (!subscription || !tecnicoId) {
    return res.status(400).json({ error: 'Faltan datos: subscription o tecnicoId' });
  }

  // Validar si el técnico existe
  const tecnico = await Tecnico.findOne({ tecnicoId });
  if (!tecnico) {
    return res.status(404).json({ error: 'Técnico no encontrado' });
  }

  try {
    // Elimina suscripciones duplicadas de ese técnico
    await WebPushSubscription.deleteMany({ tecnicoId });

    const nuevaSuscripcion = new WebPushSubscription({
      tecnicoId,
      subscription
    });

    await nuevaSuscripcion.save();
    res.status(201).json({ message: '✅ Suscripción registrada correctamente' });
  } catch (error) {
    console.error('❌ Error al guardar suscripción:', error);
    res.status(500).json({ error: 'Error al guardar suscripción' });
  }
});



const enviarNotificacionATecnico = async ({ tecnicoId, title, body }) => {

console.log(`intentando conectar con: ${tecnicoId}`);

  try {
    const tokensData = await PushToken.find({ tecnicoId, appType: 'tecnico' }); // 👈 Busca TODOS los tokens
console.log(`tokens encontrados: ${tokensData.length}`);
    const tokensValidos = tokensData
      .map(t => t.expoPushToken)
      .filter(token => Expo.isExpoPushToken(token));

    if (tokensValidos.length === 0) {
      console.log(`❌ No hay tokens válidos para tecnocoId: ${tecnicoId}`);
      return;
    }

    // Crear mensajes para todos los tokens
    const mensajes = tokensValidos.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: { tipo: 'tecnico', tecnicoId },
    }));

    await expo.sendPushNotificationsAsync(mensajes);
    console.log(`📤 Notificación enviada a ${tokensValidos.length} dispositivo(s) del tecnico: ${tecnicoId}`);
  } catch (error) {
    console.error('❌ Error al enviar notificación a tecnico', error);
  }
};

const enviarNotificacionACliente = async ({ clienteId, title, body }) => {
  try {
    const tokensData = await PushToken.find({ clienteId, appType: 'cliente' }); // 👈 Busca TODOS los tokens

    const tokensValidos = tokensData
      .map(t => t.expoPushToken)
      .filter(token => Expo.isExpoPushToken(token));

    if (tokensValidos.length === 0) {
      console.log(`❌ No hay tokens válidos para clienteId: ${clienteId}`);
      return;
    }

    // Crear mensajes para todos los tokens
    const mensajes = tokensValidos.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: { tipo: 'cliente', clienteId },
    }));

    await expo.sendPushNotificationsAsync(mensajes);
    console.log(`📤 Notificación enviada a ${tokensValidos.length} dispositivo(s) del cliente: ${clienteId}`);
  } catch (error) {
    console.error('❌ Error al enviar notificación a cliente:', error);
  }
};



mongoose
  .connect('mongodb+srv://DiegoLLera:666bonus@cluster0.l40i6a0.mongodb.net/copiadoras?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('✅ Conectado a MongoDB Atlas correctamente'))
  .catch((err) => console.error('❌ Error al conectar a MongoDB Atlas:', err));



// ✅ Estados válidos en todo el sistema
const ESTADOS = ['Pendiente', 'Asignado', 'Terminado', 'Reagendado', 'Cancelado'];

/* ====================== TICKETS ====================== */
const ticketSchema = new mongoose.Schema(
  {
    clienteNombre: String,
    empresa: String,
    area: String,
    telefono: String,
    impresora: String,
    descripcionFalla: String,
    fotos: [String],
    fotosTecnico: { type: [String], default: [] },
    estado: { type: String, enum: ESTADOS, default: 'Pendiente', index: true },
    tecnicoAsignado: { type: String, default: null, index: true },
    tecnicoId: { type: String, index: true },
    tecnicoFoto: String,
    ciudad: { type: String, index: true },
    empresaId: { type: String, index: true },
    latitud: Number,
    longitud: Number,
    clienteId: { type: String, index: true },
    fechaCreacion: { type: Date, default: Date.now, index: true }, 
    fechaAsignacion: { type: Date, default: null, index: true },
    fechaFinalizacion: { type: Date, default: null, index: true },
    fechaReagendo: { type: Date, default: null, index: true },
    fechaCancelacion: { type: Date, default: null, index: true },
    fechaPrimerAsignado: { type: Date, default: null, index: true },
    tecnicoPrimerAsignadoId: { type: String, default: null, index: true },
    tecnicoPrimerAsignadoNombre: { type: String, default: null, index: true },

    tecnicoReagendoId: { type: String, default: null, index: true },
    tecnicoReagendoNombre: { type: String, default: null, index: true },

    comentarioTecnico: String,
  },
  { timestamps: true } 
);

const Ticket = mongoose.model('Ticket', ticketSchema);

const tonerSchema = new mongoose.Schema(
  {
    clienteNombre: String,
    empresa: String,
    area: String,
    telefono: String,
    impresora: String,
    estado: { type: String, enum: ESTADOS, default: 'Pendiente', index: true },
    tecnicoAsignado: { type: String, default: null, index: true },
    tecnicoId: { type: String, index: true },
    tecnicoFoto: String,
    ciudad: { type: String, index: true },
    empresaId: { type: String, index: true },
    clienteId: { type: String, index: true },
    fechaCreacion: { type: Date, default: Date.now, index: true },
    fechaAsignacion: { type: Date, default: null, index: true },
    fechaFinalizacion: { type: Date, default: null, index: true },
    fechaReagendo: { type: Date, default: null, index: true },
    fechaCancelacion: { type: Date, default: null, index: true },
    fechaPrimerAsignado: { type: Date, default: null, index: true },
    tecnicoPrimerAsignadoId: { type: String, default: null, index: true },
    tecnicoPrimerAsignadoNombre: { type: String, default: null, index: true },

    tecnicoReagendoId: { type: String, default: null, index: true },
    tecnicoReagendoNombre: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

const Toner = mongoose.model('Toner', tonerSchema);


const tecnicoSchema = new mongoose.Schema({
  nombre: String,
  fotoUrl: String,
  tecnicoId: String,
  ciudad: String,
  empresaId: String,
  lat: Number,
  lng: Number,
  calificaciones: [{
    ticketId: String,
    estrellas: Number,
    fecha: { type: Date, default: Date.now }
  }],
  totalEstrellas: { type: Number, default: 0 },
  cantidadCalificaciones: { type: Number, default: 0 },
  promedioEstrellas: { type: Number, default: 0 }
});

const Tecnico = mongoose.model('Tecnico', tecnicoSchema);

const usuarioSchema = new mongoose.Schema({
  email: String,
  password: String,
  activo: Boolean,
  empresaId: String,
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

const pushTokenSchema = new mongoose.Schema({
  clienteId: { type: String, default: null },
  tecnicoId: { type: String, default: null },
  expoPushToken: { type: String, required: true },
  appType: { type: String, enum: ['cliente', 'tecnico'], required: true } // 👈 Nuevo campo
});
const PushToken = mongoose.model('PushToken', pushTokenSchema);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({ storage: memoryStorage });


                      //////////////////////////////////////////////////////////////////////////////////////////////
                      //////////////////////////////////////////////////////////////////////////////////////////////
                      ///////////////////////////////....MONITOREO DE IMPRESORAS....////////////////////////////////
                      //////////////////////////////////////////////////////////////////////////////////////////////
                      //////////////////////////////////////////////////////////////////////////////////////////////
                      //////////////////////////////////////////////////////////////////////////////////////////////

const empresaSchema = new mongoose.Schema({
  nombre:   { type: String, required: true },
  apiKey:   { type: String, required: true, unique: true },
  empresaId:{ type: String, required: true },  
  ciudad:   { type: String, required: true },   
  createdAt:{ type: Date, default: Date.now }
});
empresaSchema.index({ empresaId: 1, ciudad: 1, createdAt: -1 });

const Empresa = mongoose.model('Empresa', empresaSchema);

const impresoraSchema = new mongoose.Schema({
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', index: true, required: true },
  // para alinear con tu drag&drop actual mientras migras a "sucursal/site"
  ciudad: { type: String, default: null, index: true },

  host: { type: String, required: true },         // IP o hostname
  serial: { type: String, default: null },
  sysName: { type: String, default: null },
  sysDescr: { type: String, default: null },
  model: { type: String, default: null },
  printerName: { type: String, default: null },   // nombre amigable si lo tienes
  createdAt: { type: Date, default: Date.now }
}, { strict: true });

impresoraSchema.index({ empresaId: 1, serial: 1 }, { unique: true, sparse: true });
impresoraSchema.index({ empresaId: 1, host: 1 }, { unique: true }); // fallback si no hay serial

const Impresora = mongoose.model('Impresora', impresoraSchema);

const impresoraLatestSchema = new mongoose.Schema({
  printerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Impresora', unique: true },

  ultimoCorteId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CortesMensuales', 
    default: null 
  },

  lastCutDate: { type: Date, default: null },
  lastPageCount: { type: Number, default: null },   // total general (ya existente)
  lastPageMono:  { type: Number, default: null },   // NUEVO: total B/N
  lastPageColor: { type: Number, default: null },   // NUEVO: total Color

  lastSupplies: [{
    name: String,
    level: Number, // nivel actual
    max: Number    // capacidad (si la conoces)
  }],
  lastSeenAt: { type: Date, default: null },
  lowToner: { type: Boolean, default: false },
  online: { type: Boolean, default: true }
}, { strict: true });


const ImpresoraLatest = mongoose.model('ImpresoraLatest', impresoraLatestSchema);

// //SCHEMA PARA CORTES MENSUALES /////

const cortesMensualesSchema = new mongoose.Schema({
  printerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Impresora', 
    required: true,
    index: true 
  },
  empresaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Empresa', 
    required: true,
    index: true 
  },
  
  // 📅 Fechas y período
  fechaCorte: { type: Date, default: Date.now },
  mes: { type: Number, required: true },
  año: { type: Number, required: true },
  
  // 🔢 CONTADORES GENERALES (SOLO USAMOS ESTOS)
  contadorInicioGeneral: { type: Number, default: 0 },
  contadorFinGeneral: { type: Number, required: true },
  
  // 📈 TOTAL CALCULADO
  totalPaginasGeneral: { type: Number, required: true },
  
  // 🖨️ ESTADO DE TONER
  suppliesInicio: [{ name: String, level: Number, max: Number }],
  suppliesFin: [{ name: String, level: Number, max: Number }],
  
  // 📄 PDF GENERADO
  pdfPath: { type: String, default: null },
  
  // 🏷️ METADATOS
  nombreImpresora: { type: String, default: '' },
  modeloImpresora: { type: String, default: '' },
  periodo: { type: String, default: '' }
}, { 
  strict: true,
  timestamps: true
});

// Índices para búsquedas rápidas
cortesMensualesSchema.index({ printerId: 1, fechaCorte: -1 });
cortesMensualesSchema.index({ empresaId: 1, mes: 1, año: 1 });

const CortesMensuales = mongoose.model('CortesMensuales', cortesMensualesSchema);

// 🎨 FUNCIÓN PARA GENERAR PDF PROFESIONAL 
async function generarPDFProfesional(corte, impresora) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 20,
        size: 'A4'
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      const pageHeight = doc.page.height;
      const bottomMargin = 20; // margen inferior seguro

      // ========== ENCABEZADO PROFESIONAL ==========
      doc.rect(0, 0, doc.page.width, 100)
         .fillColor('#1e3a8a')
         .fill();

      doc.fillColor('white')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('REPORTE DE CONSUMO', 0, 35, { align: 'center' });

      doc.fontSize(12)
         .font('Helvetica')
         .text('Sistema de Gestión de Impresoras', 0, 65, { align: 'center' });

      // ========== INFORMACIÓN GENERAL ==========
      let yPosition = 120;

      doc.rect(20, yPosition, doc.page.width - 40, 80)
         .fillColor('#f8fafc')
         .fill()
         .strokeColor('#e2e8f0')
         .stroke();

      const col1 = 30;
      const col2 = doc.page.width / 2;

      doc.fillColor('#1e293b')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('INFORMACIÓN GENERAL', col1, yPosition + 15);

      doc.font('Helvetica')
         .fillColor('#475569')
         .fontSize(9);

      doc.text(`Empresa: ${impresora.empresaId?.nombre || 'N/A'}`, col1, yPosition + 35);
      doc.text(`Impresora: ${impresora.printerName || impresora.sysName || impresora.host}`, col1, yPosition + 50);
      doc.text(`Modelo: ${impresora.model || impresora.sysDescr || 'N/A'}`, col1, yPosition + 65);

      doc.text(`Número de Serie: ${impresora.serial || 'No disponible'}`, col2, yPosition + 35);
      doc.text(`Ubicación: ${impresora.ciudad || 'N/A'}`, col2, yPosition + 50);
      doc.text(`Período: ${corte.periodo || 'No especificado'}`, col2, yPosition + 65);

      // ========== ESTADÍSTICAS PRINCIPALES ==========
      yPosition += 100;

      const statWidth = (doc.page.width - 60) / 3;

      const stats = [
        { label: 'INICIO PERÍODO', value: corte.contadorInicioGeneral?.toLocaleString() || '0', bg: '#f0f9ff', stroke: '#bae6fd', color: '#0c4a6e', fontSize: 18 },
        { label: 'FIN PERÍODO', value: corte.contadorFinGeneral.toLocaleString(), bg: '#f0fdf4', stroke: '#bbf7d0', color: '#15803d', fontSize: 18 },
        { label: 'CONSUMO TOTAL', value: corte.totalPaginasGeneral.toLocaleString(), bg: '#fef7ed', stroke: '#fed7aa', color: '#c2410c', fontSize: 22 }
      ];

      stats.forEach((stat, i) => {
        const x = 20 + i * (statWidth + 10);
        doc.rect(x, yPosition, statWidth, 80)
           .fillColor(stat.bg)
           .fill()
           .strokeColor(stat.stroke)
           .stroke();

        doc.fillColor('#0369a1')
           .fontSize(11)
           .font('Helvetica-Bold')
           .text(stat.label, x, yPosition + 15, { width: statWidth, align: 'center' });

        doc.fillColor(stat.color)
           .fontSize(stat.fontSize)
           .font('Helvetica-Bold')
           .text(stat.value, x, yPosition + 35, { width: statWidth, align: 'center' });

        doc.fillColor('#64748b')
           .fontSize(8)
           .font('Helvetica')
           .text('PÁGINAS', x, yPosition + 60, { width: statWidth, align: 'center' });
      });

      // ========== ESTADO DE TONER/SUMINISTROS ==========
      yPosition += 100;
      doc.fillColor('#1e293b')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('ESTADO DE SUMINISTROS', 20, yPosition);

      const supplies = corte.suppliesFin || [];

      if (supplies.length > 0) {
        const supplyWidth = (doc.page.width - 60) / Math.min(supplies.length, 4);
        let supplyX = 20;

        supplies.forEach((supply, index) => {
          if (index >= 4) return;
          const level = supply.level || 0;
          const max = supply.max || 100;
          const percentage = max > 0 ? (level / max) * 100 : level;

          let color = '#22c55e';
          if (percentage <= 20) color = '#ef4444';
          else if (percentage <= 50) color = '#f59e0b';

          doc.rect(supplyX, yPosition + 25, supplyWidth - 10, 60)
             .fillColor('#f8fafc')
             .fill()
             .strokeColor('#e2e8f0')
             .stroke();

          doc.fillColor('#475569')
             .fontSize(8)
             .font('Helvetica-Bold')
             .text((supply.name || `Supply ${index + 1}`).toUpperCase(), supplyX + 5, yPosition + 35, { width: supplyWidth - 20, align: 'center' });

          const barWidth = supplyWidth - 30;
          const barHeight = 8;
          const barX = supplyX + 5;
          const barY = yPosition + 50;

          doc.rect(barX, barY, barWidth, barHeight)
             .fillColor('#e2e8f0')
             .fill();

          doc.rect(barX, barY, (percentage / 100) * barWidth, barHeight)
             .fillColor(color)
             .fill();

          doc.fillColor('#1e293b')
             .fontSize(7)
             .font('Helvetica-Bold')
             .text(`${Math.round(percentage)}%`, barX, barY + 12, { width: barWidth, align: 'center' });

          doc.fillColor('#64748b')
             .fontSize(7)
             .font('Helvetica')
             .text(`${level}${max > 0 ? `/${max}` : ''}`, barX, barY + 25, { width: barWidth, align: 'center' });

          supplyX += supplyWidth;
        });
      } else {
        doc.fillColor('#94a3b8')
           .fontSize(10)
           .font('Helvetica')
           .text('No hay datos de suministros disponibles', 20, yPosition + 40);
      }

      // ========== DETALLES ADICIONALES ==========
      yPosition += 100;
      doc.rect(20, yPosition, doc.page.width - 40, 60)
         .fillColor('#f8fafc')
         .fill()
         .strokeColor('#e2e8f0')
         .stroke();

      doc.fillColor('#1e293b')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('INFORMACIÓN ADICIONAL', 30, yPosition + 15);

      doc.fillColor('#475569')
         .fontSize(8)
         .font('Helvetica')
         .text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 30, yPosition + 35);

      doc.text(`ID del reporte: ${corte._id || 'N/A'}`, 30, yPosition + 50);

      // ========== PIE DE PÁGINA PROFESIONAL ==========
      doc.rect(0, pageHeight - 40 - bottomMargin, doc.page.width, 40)
         .fillColor('#1e293b')
         .fill();

      doc.fillColor('white')
         .fontSize(7)
         .font('Helvetica')
         .text('Sistema de Monitoreo de Impresoras • Reporte generado automáticamente', 20, pageHeight - 25 - bottomMargin, { align: 'left' });

      doc.text(`Página 1 de 1 • ${new Date().getFullYear()}`, 0, pageHeight - 25 - bottomMargin, { align: 'center' });

      doc.end();

    } catch (error) {
      console.error('Error detallado en generación PDF:', error);
      reject(error);
    }
  });
}



// Función para generar ApiKey aleatoria
function generarApiKey() {
  return 'emp_' + Math.random().toString(36).substring(2, 12) +
         Math.random().toString(36).substring(2, 12);
}

// ⏱️ Si la última lectura es más vieja que esto => Offline
const ONLINE_STALE_MS = Number(process.env.ONLINE_STALE_MS || 2 * 60 * 1000);

// Helper: decide online por lastSeenAt y bandera online del latest
function computeDerivedOnline(latest, now = Date.now()) {
  if (!latest || !latest.lastSeenAt) return false;
  if (latest.online === false) return false; // respetamos apagado explícito
  const ts = new Date(latest.lastSeenAt).getTime();
  if (!Number.isFinite(ts)) return false;
  const age = now - ts;
  return age <= ONLINE_STALE_MS;
}

// 🧮 HELPER PARA CÁLCULOS DE CORTES - PEGAR DESPUÉS DE computeDerivedOnline
function calcularPeriodoCorte(ultimoCorte, contadoresActuales) {
  const contadorActual = contadoresActuales.lastPageCount || 0;

  if (!ultimoCorte) {
    // Primer corte - no hay período anterior
    return {
      contadorInicioGeneral: 0,
      contadorFinGeneral: contadorActual,
      totalPaginasGeneral: contadorActual,
      periodo: 'Desde instalación',
      esPrimerCorte: true
    };
  }

  // Cálculo para cortes subsiguientes
  const contadorInicioGeneral = ultimoCorte.contadorFinGeneral || 0;
  const totalPaginasGeneral = Math.max(0, contadorActual - contadorInicioGeneral);

  // Formatear período para el PDF
  const fechaInicio = new Date(ultimoCorte.fechaCorte);
  const fechaFin = new Date();
  const periodo = `${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()}`;

  return {
    contadorInicioGeneral,
    contadorFinGeneral: contadorActual,
    totalPaginasGeneral,
    periodo,
    esPrimerCorte: false
  };
}
// 📊 HELPER PARA DETECTAR CAMBIOS DE TONER - PEGAR INMEDIATAMENTE DESPUÉS
function analizarCambiosToner(suppliesInicio, suppliesFin) {
  const cambios = [];
  
  if (!suppliesInicio || !suppliesFin) return cambios;

  suppliesInicio.forEach((supplyInicio, index) => {
    const supplyFin = suppliesFin[index];
    if (!supplyFin) return;

    const nombre = supplyInicio.name || `Consumible ${index + 1}`;
    const nivelInicio = supplyInicio.level;
    const nivelFin = supplyFin.level;
    
    // Detectar si hubo reinicio (nivel aumentó significativamente)
    if (nivelFin > nivelInicio + 10) { // Margen del 10% para evitar fluctuaciones
      cambios.push({
        nombre,
        tipo: 'reinicio',
        anterior: nivelInicio,
        nuevo: nivelFin,
        fecha: new Date().toISOString()
      });
    }
    // Detectar si bajo críticamente
    else if (nivelFin <= 20 && nivelInicio > 20) {
      cambios.push({
        nombre,
        tipo: 'bajo',
        anterior: nivelInicio,
        nuevo: nivelFin,
        fecha: new Date().toISOString()
      });
    }
  });

  return cambios;
}



// 📌 Endpoint para crear empresa y devolver ApiKey
app.post('/api/empresas', async (req, res) => {
  try {
    const { nombre, empresaId, ciudad } = req.body;
    if (!nombre || nombre.trim().length < 3) {
      return res.status(400).json({ ok: false, error: 'Nombre inválido' });
    }
        if (!empresaId || !ciudad) {
      return res.status(400).json({ ok: false, error: 'empresaId y ciudad son obligatorios' });
    }

    // Verificar que no exista ya
// dentro de POST /api/empresas
    const existe = await Empresa.findOne({
      nombre: nombre.trim(),
      empresaId,         // 👈 incluye scope
      ciudad
    });
    if (existe) {
      return res.status(400).json({ ok: false, error: 'La empresa ya existe en este scope' });
    }

    const apiKey = generarApiKey();
    const nueva = new Empresa({
      nombre: nombre.trim(),
      apiKey,
      empresaId,
      ciudad
    });
    await nueva.save();

    res.json({
      ok: true,
      empresaId: nueva._id,
      apiKey: nueva.apiKey
    });
  } catch (err) {
    console.error('❌ Error creando empresa:', err);
    res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

app.get('/api/empresas', async (req, res) => {
  try {
    const { empresaId, ciudad } = req.query;

    // 🧠 filtrar por el scope del login (ambos son strings en tu schema)
    const q = {};
    if (empresaId) q.empresaId = String(empresaId);
    if (ciudad)    q.ciudad    = String(ciudad);

    // 👇 usa q (antes estabas usando {})
    const empresas = await Empresa
      .find(q, { _id: 1, nombre: 1 })   // si quieres, añade ciudad:1 para debug
      .sort({ createdAt: -1 })
      .lean();

    res.json({ ok: true, data: empresas });
  } catch (err) {
    console.error('❌ GET /api/empresas:', err);
    res.status(500).json({ ok: false, error: 'Error listando empresas' });
  }
});

app.get('/api/empresas/:empresaId/impresoras', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { ciudad } = req.query;

    const q = { empresaId };
    if (ciudad) q.ciudad = ciudad;

    const impresoras = await Impresora.find(q).lean();
    const ids = impresoras.map(i => i._id);
    const latest = await ImpresoraLatest.find({ printerId: { $in: ids } }).lean();
    const mapLatest = new Map(latest.map(l => [String(l.printerId), l]));

    const now = Date.now();
    const data = impresoras.map(i => {
      const l = mapLatest.get(String(i._id)) || null;

      // ✅ Estado derivado robusto
      const derivedOnline = computeDerivedOnline(l, now);

      // opcional: útiles para UI/debug
      const lastSeenTs = l?.lastSeenAt ? new Date(l.lastSeenAt).getTime() : null;
      const ageMs = lastSeenTs ? Math.max(0, now - lastSeenTs) : null;

      // también marcamos en el objeto latest para compatibilidad
      const latestWithDerived = l ? { ...l, derivedOnline, ageMs } : null;

      return {
        ...i,
        // Campo plano para que el front lo use directo
        online: derivedOnline,
        // Conservamos el subobjeto latest con metadata adicional
        latest: latestWithDerived
      };
    });

    res.json({ ok: true, data });
  } catch (err) {
    console.error('❌ GET /api/empresas/:empresaId/impresoras:', err);
    res.status(500).json({ ok: false, error: 'Error listando impresoras' });
  }
});

// ---------- POST /api/metrics/impresoras ----------
// Ingesta desde el Agente. Usa Authorization: Bearer <apiKey de Empresa>
app.post('/api/metrics/impresoras', async (req, res) => {
  try {
    // 1) Autenticación por ApiKey (Empresa)
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, error: 'Falta ApiKey' });

    const empresa = await Empresa.findOne({ apiKey: token }).lean();
    if (!empresa) return res.status(403).json({ ok: false, error: 'ApiKey inválida' });

    // 2) Payload esperado
    // host: string (IP/hostname)
    // pageCount: number (opcional)
    // supplies: [{name, level, max}]
    // sysName, sysDescr, printerName, serial, model (opcionales)
    // ciudad (opcional, para alinear con tu filtro actual)
    const {
      host,
      pageCount,
      pageCountMono = null,   // 👈 nuevo
      pageCountColor = null,
      supplies = [],
      sysName = null,
      sysDescr = null,
      printerName = null,
      serial = null,
      model = null,
      ciudad = null,
      ts = new Date().toISOString(),
      agentVersion = '1.0.0'
    } = req.body || {};

    if (!host) {
      return res.status(400).json({ ok: false, error: 'host requerido' });
    }

    // 3) Upsert de Impresora (tolerante a cambio de clave)
    const claveOr = serial
      ? { $or: [{ serial }, { host }] }
      : { host };

    const setBase = {
      empresaId: empresa._id,
      ciudad: ciudad || null,
      host,
      serial,
      sysName,
      sysDescr,
      printerName,
      model
    };

    // 👇 Busca por (empresaId + serial) O (empresaId + host) y actualiza el MISMO doc
    const impresora = await Impresora.findOneAndUpdate(
      { empresaId: empresa._id, ...claveOr },
      {
        $set: setBase,
        $setOnInsert: { createdAt: new Date() }
      },
      { new: true, upsert: true }
    );

      // 4) Actualiza Latest (marcar online SOLO si la lectura trae datos reales)
      const lastSeenAt = new Date(ts);

      // ¿La lectura SNMP fue válida?
      const snmpOk =
        (typeof pageCount === 'number' && !Number.isNaN(pageCount)) ||
        (Array.isArray(supplies) && supplies.length > 0) ||
        !!sysName || !!sysDescr || !!serial || !!model;

      // Si hay supplies, calcula lowToner; si no, será false
      const lowToner = Array.isArray(supplies) && supplies.some(s => {
        const lvl = Number(s?.level);
        const max = Number(s?.max);
        if (isFinite(lvl) && isFinite(max) && max > 0) return (lvl / max) * 100 <= 20;
        return isFinite(lvl) && lvl <= 20;
      });

    // Guarda latest. OJO: online = snmpOk
    await ImpresoraLatest.findOneAndUpdate(
      { printerId: impresora._id },
      {
        $set: {
          lastPageCount: (typeof pageCount === 'number' && !Number.isNaN(pageCount)) ? Number(pageCount) : null,
          lastPageMono:  (typeof pageCountMono === 'number' && !Number.isNaN(pageCountMono)) ? Number(pageCountMono) : null,   // 👈
          lastPageColor: (typeof pageCountColor === 'number' && !Number.isNaN(pageCountColor)) ? Number(pageCountColor) : null, // 👈
          lastSupplies: Array.isArray(supplies) ? supplies : [],
          lastSeenAt,
          lowToner,
          online: snmpOk,          // 👈 si lectura vacía => offline
        }
      },
      { new: true, upsert: true }
    );

    res.json({ ok: true, printerId: impresora._id, empresaId: empresa._id, agentVersion });
  } catch (err) {
    console.error('❌ POST /api/metrics/impresoras:', err);
    res.status(500).json({ ok: false, error: 'Error ingesta impresoras' });
  }
});


// ENDPOINT PARA REGISTRAR CORTE ////
app.post('/api/impresoras/:id/registrar-corte', async (req, res) => {
  try {
    const printerId = req.params.id;
    
    // 1. Buscar impresora y sus datos latest
    const impresora = await Impresora.findById(printerId).lean();
    if (!impresora) {
      return res.status(404).json({ ok: false, error: 'Impresora no encontrada' });
    }

    const latest = await ImpresoraLatest.findOne({ printerId }).lean();
    if (!latest) {
      return res.status(404).json({ ok: false, error: 'Datos de impresora no encontrados' });
    }

    // 2. Buscar último corte y calcular período automáticamente
    let ultimoCorte = null;
    if (latest.ultimoCorteId) {
      ultimoCorte = await CortesMensuales.findById(latest.ultimoCorteId).lean();
    }

    // 3. Usar helper para cálculos automáticos
    const ahora = new Date();
    const calculos = calcularPeriodoCorte(ultimoCorte, latest);
    const cambiosToner = analizarCambiosToner(
      ultimoCorte?.suppliesFin || [], 
      latest.lastSupplies || []
    );

        // 🐛 DEBUG: Ver qué datos estamos recibiendo
    console.log('🔍 DEBUG CORTE:', {
      printerId,
      tieneUltimoCorte: !!ultimoCorte,
      ultimoCorteId: latest.ultimoCorteId,
      contadoresActuales: {
        lastPageMono: latest.lastPageMono,
        lastPageColor: latest.lastPageColor, 
        lastPageCount: latest.lastPageCount
      },
      calculosResultado: calculos
    });


    const nuevoCorte = new CortesMensuales({
      printerId,
      empresaId: impresora.empresaId,
      fechaCorte: ahora,
      mes: ahora.getMonth() + 1,
      año: ahora.getFullYear(),
      
      // 🆕 SOLO CONTADORES GENERALES
      contadorInicioGeneral: calculos.contadorInicioGeneral,
      contadorFinGeneral: calculos.contadorFinGeneral,
      totalPaginasGeneral: calculos.totalPaginasGeneral,
      periodo: calculos.periodo,
      
      suppliesInicio: ultimoCorte?.suppliesFin || [],
      suppliesFin: latest.lastSupplies || [],
      
      nombreImpresora: impresora.printerName || impresora.sysName || impresora.host,
      modeloImpresora: impresora.model || impresora.sysDescr || ''
    });

    const corteGuardado = await nuevoCorte.save();

    
await ImpresoraLatest.findOneAndUpdate(
  { printerId },
  { 
    $set: { 
      ultimoCorteId: corteGuardado._id,
      lastCutDate: ahora // 🆕 GUARDAR LA FECHA DEL ÚLTIMO CORTE
    } 
  }
);

    res.json({
      ok: true,
      corteId: corteGuardado._id,
      mensaje: 'Corte registrado correctamente',
      datos: {
        periodo: `${calculos.contadorInicioMono + calculos.contadorInicioColor} → ${latest.lastPageCount || 0}`,
        totalPaginas: calculos.totalPaginasGeneral,
        fecha: ahora.toLocaleDateString()
      }
    });

  } catch (err) {
    console.error('❌ Error registrando corte:', err);
    res.status(500).json({ ok: false, error: 'Error interno registrando corte' });
  }
});


// 📄 ENDPOINT PARA GENERAR /////
app.get('/api/impresoras/:id/generar-pdf', async (req, res) => {
  try {
    const printerId = req.params.id;
    
    // 1. Verificar que existe un corte registrado
    const latest = await ImpresoraLatest.findOne({ printerId })
      .populate('ultimoCorteId')
      .lean();

    if (!latest || !latest.ultimoCorteId) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Primero debe registrar un corte para generar el PDF' 
      });
    }

    const corte = latest.ultimoCorteId;
    const impresora = await Impresora.findById(printerId)
      .populate('empresaId')
      .lean();

    // 2. Calcular período para el PDF
    let ultimoCorteAnterior = null;
    if (corte.ultimoCorteId) {
      ultimoCorteAnterior = await CortesMensuales.findById(corte.ultimoCorteId).lean();
    }
    
    const calculosPeriodo = calcularPeriodoCorte(ultimoCorteAnterior, latest);
    
    // Preparar datos para el PDF
    const datosPDF = {
      ...corte,
      periodo: calculosPeriodo.periodo
    };

    // 3. Generar PDF profesional
    const pdfBuffer = await generarPDFProfesional(datosPDF, impresora);

    // 4. Enviar PDF como respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-${impresora.printerName || impresora.host}-${Date.now()}.pdf"`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('❌ Error generando PDF:', err);
    res.status(500).json({ ok: false, error: 'Error interno generando PDF: ' + err.message });
  }
});

app.delete('/api/empresas/:id', async (req, res) => {
  try {
    const empresa = await Empresa.findByIdAndDelete(req.params.id);
    if (!empresa) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });

    // TODO opcional: borrar impresoras, latest, etc., pertenecientes a esa empresa
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ DELETE /api/empresas/:id', err);
    res.status(500).json({ ok: false, error: 'Error eliminando empresa' });
  }
});

app.get('/api/online-policy', (_req, res) => {
  res.json({
    ok: true,
    ONLINE_STALE_MS,
    note: 'Impresora se considera offline si lastSeenAt es más viejo que este umbral.'
  });
});



                      /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                      /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                      /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                      /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                      /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




app.post('/tickets', upload.array('fotos'), async (req, res) => {
  try {
    const { clienteNombre, empresa, area, telefono, impresora, descripcionFalla, clienteId, ciudad, empresaId } = req.body;
    const fotos = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const upload = await cloudinary.uploader.upload(file.path, {
          folder: 'tickets',
        });
        fotos.push(upload.secure_url);
      }
    }

    const latitud = req.body.latitud;
    const longitud = req.body.longitud;

    const nuevoTicket = new Ticket({
      clienteNombre,
      empresa,
      area,
      telefono,
      impresora,
      descripcionFalla,
      clienteId,
      fotos,
      latitud,
      longitud,
      ciudad,
      empresaId,
    });

    await nuevoTicket.save();

    await enviarNotificacionACliente({
      clienteId,
      title: '📢 Ticket creado',
      body: `Gracias por reportar`,
    });

    res.json(nuevoTicket);
  } catch (error) {
    console.error('Error al crear ticket:', error);
    res.status(500).json({ error: 'Error al crear ticket' });
  }
});

app.post('/toner', upload.none(), async (req, res) => {
  try {
    const { clienteNombre, empresa, area, telefono, impresora, clienteId, ciudad, empresaId } = req.body;

    const latitud = req.body.latitud;
    const longitud = req.body.longitud;

    const nuevoToner = new Toner({
      clienteNombre,
      empresa,
      area,
      telefono,
      impresora,
      clienteId,
      ciudad,
      empresaId,
      latitud,
      longitud
    });

    await nuevoToner.save();
    console.log('✅ Pedido de tóner guardado:', nuevoToner);

    await enviarNotificacionACliente({
      clienteId,
      title: '🟣 Pedido registrado',
      body: `Tu pedido de tóner fue recibido correctamente.`,
    });

    res.status(201).json({ message: 'Pedido de tóner registrado correctamente', toner: nuevoToner });
  } catch (error) {
    console.error('❌ Error al registrar pedido de tóner:', error);
    res.status(500).json({ error: 'Error al registrar pedido de tóner' });
  }
});
//////////////////////////////
// ✅ Ruta para actualizar estado o técnico del TÓNER
app.patch('/toners/:id', async (req, res) => {
  try {
    const tonerAnterior = await Toner.findById(req.params.id);
    const updateData = req.body;
    
    // 👇 NUEVO CÓDIGO AQUÍ (BUSCAR TÉCNICO POR NOMBRE)
    let tecnico = null;
    if (updateData.tecnicoAsignado) {
      tecnico = await Tecnico.findOne({ nombre: updateData.tecnicoAsignado });
      if (tecnico) {
        updateData.tecnicoId = tecnico.tecnicoId;
         updateData.tecnicoFoto = tecnico.fotoUrl; // ✅ esta línea nueva
      } else {
        console.warn(`⚠️ Técnico no encontrado: ${updateData.tecnicoAsignado}`);
      }
    }
    // 👆 FIN DEL NUEVO CÓDIGO

    const ahora = new Date();

    if (updateData.estado === 'Asignado' && !tonerAnterior.fechaPrimerAsignado) {
      updateData.fechaPrimerAsignado = updateData.fechaAsignacion ? new Date(updateData.fechaAsignacion) : ahora;
      updateData.tecnicoPrimerAsignadoId = tonerAnterior.tecnicoId || (tecnico?.tecnicoId ?? null);
      updateData.tecnicoPrimerAsignadoNombre = tonerAnterior.tecnicoAsignado || updateData.tecnicoAsignado || null;
    }

    if (updateData.estado === 'Reagendado') {
      updateData.fechaReagendo = ahora;
      if (tonerAnterior.tecnicoId || tonerAnterior.tecnicoAsignado) {
        updateData.tecnicoReagendoId = tonerAnterior.tecnicoId || null;
        updateData.tecnicoReagendoNombre = tonerAnterior.tecnicoAsignado || null;
      }
    }

    if (updateData.estado === 'Terminado')  updateData.fechaFinalizacion = ahora;
    if (updateData.estado === 'Reagendado') updateData.fechaReagendo     = ahora;
    if (updateData.estado === 'Cancelado')  updateData.fechaCancelacion  = ahora;

    const toner = await Toner.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!toner) return res.status(404).json({ error: 'Tóner no encontrado' });

    if (!tonerAnterior.tecnicoAsignado && toner.tecnicoAsignado) {
      await enviarNotificacionACliente({
        clienteId: toner.clienteId,
        title: '👨‍🔧 Técnico asignado a tu pedido de tóner',
        body: `Técnico ${toner.tecnicoAsignado} ha sido asignado a tu pedido en ${toner.empresa} - ${toner.area}.`,
      });

      // 👇 USAR EL TÉCNICO ENCONTRADO PARA LAS NOTIFICACIONES
      if (tecnico) {
        await enviarNotificacionATecnico({
          tecnicoId: tecnico.tecnicoId,
          title: '📦 Nuevo pedido de tóner',
          body: `Tienes un pedido en ${toner.empresa} - ${toner.area}`
        });
      } else {
        console.error('❌ No se pudo enviar notificación al técnico: Objeto técnico no encontrado');
      }
    }

        if (updateData.estado === 'Reagendado') {
      await enviarNotificacionACliente({
        clienteId: toner.clienteId,
        title: '📆 Pedido reagendado',
        body: `Tu Pedido fue reagendado. Pronto nos pondremos en contacto para reprogramar la visita.`,
      });
    }

    res.json(toner);
  } catch (error) {
    console.error('❌ Error al actualizar tóners:', error);
    res.status(500).json({ error: 'Error al actualizar tóners' });
  }
});

//////////////////////////////////


app.delete('/toners/:id', async (req, res) => {
  try {
    await Toner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tóner eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar tóner:', error);
    res.status(500).json({ error: 'Error al eliminar tóner' });
  }
});

app.get('/tickets', async (req, res) => {
  try {
    const { empresaId, ciudad } = req.query;
    const clienteNombre = req.headers['cliente-nombre'];

    const query = {};

    if (empresaId) query.empresaId = empresaId;
    if (ciudad) query.ciudad = ciudad;
    if (clienteNombre) query.clienteNombre = clienteNombre;

    const tickets = await Ticket.find(query);
    res.json(tickets);
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
});


app.get('/toners', async (req, res) => {
  try {
    const { empresaId, ciudad } = req.query;
    const clienteId = req.headers['cliente-id'];

    const query = {};

    if (clienteId) query.clienteId = clienteId;
    if (empresaId) query.empresaId = empresaId;
    if (ciudad) query.ciudad = ciudad;

    const toners = await Toner.find(query);
    res.json(toners);
  } catch (error) {
    console.error('❌ Error al obtener tóners:', error);
    res.status(500).json({ error: 'Error al obtener tóners' });
  }
});

app.get('/tickets/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });
    res.json(ticket);
  } catch (error) {
    console.error('Error al obtener ticket:', error);
    res.status(500).json({ error: 'Error al obtener ticket' });
  }
});


app.get('/toners/:id', async (req, res) => {
  try {
    const toner = await Toner.findById(req.params.id);
    if (!toner) return res.status(404).json({ error: 'Tóner no encontrado' });
    res.json(toner);
  } catch (error) {
    console.error('Error al obtener toner:', error);
    res.status(500).json({ error: 'Error al obtener toner' });
  }
});

////////////////////////

app.patch('/tickets/:id', async (req, res) => {
  try {
    const ticketAnterior = await Ticket.findById(req.params.id);
    const updateData = req.body;
    
    // 👇 NUEVO CÓDIGO AQUÍ (BUSCAR TÉCNICO POR NOMBRE)
    let tecnico = null;
    if (updateData.tecnicoAsignado) {
      tecnico = await Tecnico.findOne({ nombre: updateData.tecnicoAsignado });
    if (tecnico) {
      updateData.tecnicoId = tecnico.tecnicoId;
      updateData.tecnicoFoto = tecnico.fotoUrl; // ✅ esta línea nueva
    }     else {
        console.warn(`⚠️ Técnico no encontrado: ${updateData.tecnicoAsignado}`);
      }
    }
    // 👆 FIN DEL NUEVO CÓDIGO

    const ahora = new Date();

    if (updateData.estado === 'Asignado' && !ticketAnterior.fechaPrimerAsignado) {
      updateData.fechaPrimerAsignado = updateData.fechaAsignacion ? new Date(updateData.fechaAsignacion) : ahora;
      updateData.tecnicoPrimerAsignadoId = ticketAnterior.tecnicoId || (tecnico?.tecnicoId ?? null);
      updateData.tecnicoPrimerAsignadoNombre = ticketAnterior.tecnicoAsignado || updateData.tecnicoAsignado || null;
    }

    if (updateData.estado === 'Reagendado') {
      updateData.fechaReagendo = ahora;
      if (ticketAnterior.tecnicoId || ticketAnterior.tecnicoAsignado) {
        updateData.tecnicoReagendoId = ticketAnterior.tecnicoId || null;
        updateData.tecnicoReagendoNombre = ticketAnterior.tecnicoAsignado || null;
      }
    }

    if (updateData.estado === 'Terminado')  updateData.fechaFinalizacion = ahora;
    if (updateData.estado === 'Reagendado') updateData.fechaReagendo     = ahora;
    if (updateData.estado === 'Cancelado')  updateData.fechaCancelacion  = ahora;

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true, });

    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });


    // ✅ Notificación cuando se asigna un técnico
    if (!ticketAnterior.tecnicoAsignado && ticket.tecnicoAsignado) {
      await enviarNotificacionACliente({
        clienteId: ticket.clienteId,
        title: '👨‍🔧 Técnico asignado a tu ticket',
        body: `Técnico ${ticket.tecnicoAsignado} ha sido asignado a tu ticket en ${ticket.empresa} - ${ticket.area}.`,
      });

      // 👇 USAR EL TÉCNICO ENCONTRADO PARA LAS NOTIFICACIONES
      if (tecnico) {
        await enviarNotificacionATecnico({
          tecnicoId: tecnico.tecnicoId,
          title: '📥 Nuevo ticket asignado',
          body: `Tienes un ticket en ${ticket.empresa} - ${ticket.area}`
        });
      } else {
        console.error('❌ No se pudo enviar notificación al técnico: Objeto técnico no encontrado');
      }
    }

    if (updateData.estado === 'Reagendado') {
      await enviarNotificacionACliente({
        clienteId: ticket.clienteId,
        title: '📆 Ticket reagendado',
        body: `Tu ticket fue reagendado. Pronto nos pondremos en contacto para reprogramar la visita.`,
      });
    }


        if (updateData.estado === 'Terminado') {
      await enviarNotificacionACliente({
        clienteId: ticket.clienteId,
        title: '✅ Finalizó tu Ticket',
        body: `Califica a tu Técnico ${ticket.tecnicoAsignado}`,
      });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error al actualizar ticket:', error);
    res.status(500).json({ error: 'Error al actualizar ticket' });
  }
});

/////////////////////

app.delete('/tickets/:id', async (req, res) => {
  try {
    await Ticket.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ticket eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar ticket:', error);
    res.status(500).json({ error: 'Error al eliminar ticket' });
  }
});


app.get('/tecnicos', async (req, res) => {
  try {
    const { empresaId, ciudad } = req.query;
    const query = {};
    
    if (empresaId) query.empresaId = empresaId;
    if (ciudad) query.ciudad = ciudad;

  
    const tecnicos = await Tecnico.find(query)
      .populate('calificaciones') 
      .exec();

    res.json(tecnicos);
  } catch (error) {
    console.error('Error al obtener técnicos:', error);
    res.status(500).json({ error: 'Error al obtener técnicos' });
  }
});

app.get('/tecnicos/:id', async (req, res) => {
  try {
    const tecnico = await Tecnico.findById(req.params.id);
    if (!tecnico) {
      return res.status(404).json({ error: 'Técnico no encontrado' });
    }
    res.json(tecnico);
  } catch (error) {
    console.error('Error al obtener técnico por ID:', error);
    res.status(500).json({ error: 'Error al obtener técnico' });
  }
});

// ✅ NUEVA RUTA PARA AGREGAR TÉCNICOS
app.post('/tecnicos', uploadMemory.single('foto'), async (req, res) =>{
  try {
    const { nombre, tecnicoId, ciudad, empresaId } = req.body;
    let fotoUrl = '';

    if (req.file) {
      const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const uploadResult = await cloudinary.uploader.upload(fileBase64, {
        folder: 'tecnicos',
      });
      fotoUrl = uploadResult.secure_url;
    }

    const nuevoTecnico = new Tecnico({
      nombre,
      fotoUrl,
      tecnicoId,
      ciudad,
      empresaId
    });

    await nuevoTecnico.save();

    res.status(201).json({ message: 'Técnico agregado correctamente', tecnico: nuevoTecnico });
  } catch (error) {
    console.error('❌ Error al agregar técnico:', error);
    res.status(500).json({ error: 'Error al agregar técnico' });
  }
});

app.delete('/tecnicos/:id', async (req, res) => {
  try {
    await Tecnico.findByIdAndDelete(req.params.id);
    res.json({ message: 'Técnico eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar técnico:', error);
    res.status(500).json({ error: 'Error al eliminar técnico' });
  }
});

app.patch('/tecnicos/:id', upload.single('foto'), async (req, res) => {
  try {
    const tecnico = await Tecnico.findById(req.params.id);
    if (!tecnico) {
      return res.status(404).json({ error: 'Técnico no encontrado' });
    }

    if (req.body.nombre) {
      tecnico.nombre = req.body.nombre;
    }

    if (req.file) {
      const fotoUrl = `https://copias-backend-production.up.railway.app/uploads/${req.file.filename}`;
      tecnico.fotoUrl = fotoUrl;
    }

    await tecnico.save();
    res.json({ message: 'Técnico actualizado correctamente', tecnico });
  } catch (error) {
    console.error('Error al actualizar técnico:', error);
    res.status(500).json({ error: 'Error al actualizar técnico' });
  }
});


app.patch('/tecnicos/:tecnicoId/calificar', async (req, res) => {
  try {
    const { tecnicoId } = req.params;
    const { estrellas, ticketId } = req.body;

    if (!estrellas || estrellas < 0 || estrellas > 5) {
      return res.status(400).json({ error: 'Número de estrellas inválido' });
    }

    const tecnico = await Tecnico.findOne({ tecnicoId });

    if (!tecnico) {
      return res.status(404).json({ error: 'Técnico no encontrado' });
    }

    const calificacionExistente = tecnico.calificaciones.find(c => c.ticketId === ticketId);
    if (calificacionExistente) {
      return res.status(400).json({ error: 'Este ticket ya fue calificado' });
    }

    tecnico.calificaciones.push({
      ticketId,
      estrellas
    });

    tecnico.totalEstrellas += estrellas;
    tecnico.cantidadCalificaciones += 1;
    tecnico.promedioEstrellas = tecnico.totalEstrellas / tecnico.cantidadCalificaciones;

    await tecnico.save();

    await Ticket.findByIdAndUpdate(ticketId, { calificado: true });

    res.json({ 
      mensaje: 'Calificación guardada exitosamente',
      promedio: tecnico.promedioEstrellas.toFixed(1)
    });
  } catch (error) {
    console.error('❌ Error al guardar calificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


app.get('/calificacion-pendiente/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    // Buscar tickets terminados no calificados
    const ticket = await Ticket.findOne({
      clienteId,
      estado: 'Terminado',
      calificado: { $ne: true }
    }).sort({ fechaCreacion: -1 }).limit(1);

    if (!ticket) {
      return res.status(404).json({ 
        tieneCalificacionPendiente: false,
        mensaje: 'No hay calificaciones pendientes'
      });
    }

    // Obtener datos del técnico
    const tecnico = await Tecnico.findOne({ tecnicoId: ticket.tecnicoId });

    res.json({
      tieneCalificacionPendiente: true,
      ticketId: ticket._id,
      tecnicoId: ticket.tecnicoId,
      tecnicoNombre: ticket.tecnicoAsignado,
      tecnicoFoto: tecnico?.fotoUrl || '',
      fecha: ticket.fechaCreacion,
      descripcion: ticket.descripcionFalla
    });
  } catch (error) {
    console.error('❌ Error al buscar calificación pendiente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});



app.post('/login', async (req, res) => {
  const { email, password, ciudad, empresaId } = req.body;
  try {
    const usuario = await Usuario.findOne({ email, ciudad, empresaId });
    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const passwordOk = await bcrypt.compare(password, usuario.password);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    if (!usuario.activo) {
      return res.status(403).json({ error: 'Licencia inactiva, contacta a soporte' });
    }

    res.json({ message: 'Login exitoso' });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en login' });
  }
});

app.post('/validar-licencia', async (req, res) => {
  const { licencia } = req.body;

  if (!licencia || licencia.trim() === '') {
    return res.status(400).json({ validado: false, error: 'Licencia vacía' });
  }

  res.json({ validado: true });
});


app.post('/registrar-token', async (req, res) => {
  const { clienteId, tecnicoId, expoPushToken, appType } = req.body;

  if ((!clienteId && !tecnicoId) || !expoPushToken || !appType) {
    return res.status(400).json({ error: '❌ Datos incompletos' });
  }

  if (!expoPushToken.startsWith('ExponentPushToken')) {
    return res.status(400).json({ error: '❌ Token inválido' });
  }

  try {
    // 1️⃣ Eliminar solo tokens DUPLICADOS para este dispositivo
    await PushToken.deleteMany({
      expoPushToken: expoPushToken,
      appType: appType
    });

    // 2️⃣ Verificar si ya existe un registro para este usuario+dispositivo
    const tokenExistente = await PushToken.findOne({
      $or: [
        { clienteId: clienteId || null },
        { tecnicoId: tecnicoId || null }
      ],
      expoPushToken: expoPushToken,
      appType: appType
    });

    // 3️⃣ Si no existe, crear nuevo registro
    if (!tokenExistente) {
      const nuevoToken = new PushToken({
        clienteId,
        tecnicoId,
        expoPushToken,
        appType
      });
      
      await nuevoToken.save();
    }

    res.status(200).json({ message: '✅ Token registrado correctamente' });
  } catch (error) {
    console.error('❌ Error al guardar token push:', error);
    res.status(500).json({ error: '❌ Error interno al guardar token' });
  }
});

app.get('/tickets-tecnico', async (req, res) => {
  const licencia = req.headers['tecnico-licencia'];

  if (!licencia) {
    return res.status(400).json({ error: 'Licencia no proporcionada' });
  }

  try {
    const tickets = await Ticket.find({ tecnicoAsignado: licencia });
    res.json(tickets);
  } catch (error) {
    console.error('Error al obtener tickets para técnico:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


app.post('/tickets/:id/finalizar', uploadMemory.array('fotosTecnico'), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    const comentario = req.body.comentario || '';
    const nuevasFotos = [];

    // Subir fotos a Cloudinary
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const uploadResult = await cloudinary.uploader.upload(base64, { folder: 'fotos_tecnico' });
        nuevasFotos.push(uploadResult.secure_url);
      }
    }

    // Asegurar arrays
    if (!Array.isArray(ticket.fotosTecnico)) ticket.fotosTecnico = [];
    ticket.fotosTecnico.push(...nuevasFotos);

    // Guardar comentario y estado
    ticket.comentarioTecnico = comentario;
    ticket.estado = 'Terminado';             // <— usa 'Finalizado' para ser consistente con tu front
    ticket.fechaFinalizacion = new Date();    // opcional, útil para panel

    await ticket.save();

    // Enviar notificación de calificación al cliente (no uses variables inexistentes)
    try {
      const tecnicoNombre =
        ticket.tecnicoNombre ||                        // si ya lo guardas directo
        ticket.nombreTecnico ||                         // otro alias posible
        (ticket.tecnicoAsignadoNombre) ||               // por si guardas nombre aparte
        (typeof ticket.tecnicoAsignado === 'string' ? ticket.tecnicoAsignado : 'tu técnico'); // fallback

      await enviarNotificacionACliente({
        clienteId: ticket.clienteId,
        title: '✅ Finalizó tu Ticket',
        body: `Califica a tu Técnico ${tecnicoNombre}`,
      });
    } catch (pushErr) {
      console.warn('Error al enviar notificación de calificación:', pushErr);
      // no rompas la respuesta al cliente si falla el push
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error al finalizar ticket:', error);
    res.status(500).json({ error: 'Error al finalizar ticket' });
  }
});


// ✅ Nueva ruta: obtener tóners asignados a un técnico
app.get('/toners-tecnico', async (req, res) => {
  const licencia = req.headers['tecnico-licencia'];

  if (!licencia) {
    return res.status(400).json({ error: 'Licencia no proporcionada' });
  }

  try {
    const toners = await Toner.find({ tecnicoAsignado: licencia });
    res.json(toners);
  } catch (error) {
    console.error('Error al obtener tóners para técnico:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/logout-token', async (req, res) => {
  const { expoPushToken } = req.body;
  if (!expoPushToken) return res.status(400).json({ error: 'Token faltante' });

  await PushToken.deleteMany({ expoPushToken });
  res.status(200).json({ message: 'Token eliminado' });
});

// ✅ Buscar el técnico más cercano a unas coordenadas
app.get('/tecnico-cercano/:lat/:lng', async (req, res) => {
  const { lat, lng } = req.params;
  const distanciaMax = parseFloat(req.query.distancia || 20); // Default 20km si no se manda

  try {
    const tecnicos = await Tecnico.find();

    const tecnicosConDistancia = tecnicos
      .map(t => {
        if (!t.lat || !t.lng) return null;
        const distancia = obtenerDistanciaKm(
          parseFloat(lat),
          parseFloat(lng),
          parseFloat(t.lat),
          parseFloat(t.lng)
        );
        return { ...t._doc, distancia };
      })
      .filter(t => t && t.distancia <= distanciaMax)
      .sort((a, b) => a.distancia - b.distancia);

    if (tecnicosConDistancia.length === 0) {
      return res.status(404).json({ mensaje: 'No hay técnicos dentro del rango especificado' });
    }

    res.json(tecnicosConDistancia[0]); // Solo el más cercano
  } catch (error) {
    console.error('❌ Error al buscar técnico cercano:', error);
    res.status(500).json({ error: 'Error interno al buscar técnico cercano' });
  }
});

app.post('/guardar-ubicacion-tecnico', async (req, res) => {
  const { tecnicoId, lat, lng } = req.body;

  console.log('📥 Recibida solicitud de ubicación');
  console.log('➡️ tecnicoId:', tecnicoId);
  console.log('📍 lat:', lat, '| lng:', lng);

  if (!tecnicoId || !lat || !lng) {
    console.warn('❌ Faltan datos en la solicitud de ubicación');
    return res.status(400).json({ error: '❌ Faltan datos: tecnicoId, lat o lng' });
  }

  try {
    const tecnico = await Tecnico.findOne({ tecnicoId });

    if (!tecnico) {
      console.warn(`❌ Técnico no encontrado con tecnicoId: ${tecnicoId}`);
      return res.status(404).json({ error: '❌ Técnico no encontrado' });
    }

    tecnico.lat = lat;
    tecnico.lng = lng;

    await tecnico.save();
    console.log(`✅ Ubicación actualizada para ${tecnico.nombre} (${tecnico.tecnicoId}):`, lat, lng);

    res.status(200).json({ message: '✅ Ubicación actualizada correctamente' });
  } catch (error) {
    console.error('❌ Error al guardar ubicación del técnico:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});



const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🗑️ Limpieza automática configurada: día 1 de cada mes a las 2:00 AM`);
  
});

