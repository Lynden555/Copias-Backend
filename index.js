const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
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



const ticketSchema = new mongoose.Schema({
  clienteNombre: String,
  empresa: String,
  area: String,
  telefono: String,
  impresora: String,
  descripcionFalla: String,
  fotos: [String],
  fotosTecnico: {type: [String],default: [],},
  estado: { type: String, default: 'Pendiente' },
  tecnicoAsignado: { type: String, default: null },
  fechaCreacion: { type: Date, default: Date.now },
  ciudad: String,
  latitud: Number,
  longitud: Number,
  clienteId: String,
  tecnicoId: String,
  tecnicoFoto: String, // ✅ nuevo campo
  empresaId: String,
  comentarioTecnico: String,
});

const Ticket = mongoose.model('Ticket', ticketSchema);

const tonerSchema = new mongoose.Schema({
  clienteNombre: String,
  empresa: String,
  area: String,
  telefono: String,
  impresora: String,
  estado: { type: String, default: 'Pendiente' },
  tecnicoAsignado: { type: String, default: null },
  fechaCreacion: { type: Date, default: Date.now },
  ciudad: String,
  clienteId: String,
  tecnicoId: String,
  tecnicoFoto: String, // ✅ nuevo campo
  empresaId: String,
});
const Toner = mongoose.model('Toner', tonerSchema,);


const tecnicoSchema = new mongoose.Schema({
  nombre: String,
  fotoUrl: String,
  tecnicoId: String,
  ciudad: String,
  empresaId: String,
  lat: Number,
  lng: Number
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
      body: `Gracias por reportar: ${descripcionFalla}`,
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

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, updateData, { new: true });

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

    const tecnicos = await Tecnico.find(query);
    res.json(tecnicos);
  } catch (error) {
    console.error('Error al obtener técnicos:', error);
    res.status(500).json({ error: 'Error al obtener técnicos' });
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

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const uploadResult = await cloudinary.uploader.upload(base64, {
          folder: 'fotos_tecnico',
        });
        nuevasFotos.push(uploadResult.secure_url);
      }
    }

    // 🛠️ Guardar comentario y fotos en campos separados
    ticket.fotosTecnico.push(...nuevasFotos);
    ticket.comentarioTecnico = comentario;
    ticket.estado = 'Terminado';

    await ticket.save();

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
  
});

