const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

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
  try {
    const tokenData = await PushToken.findOne({ tecnicoId });
    if (!tokenData || !Expo.isExpoPushToken(tokenData.expoPushToken)) {
      console.log(`❌ Token inválido o no encontrado para tecnicoId: ${tecnicoId}`);
      return;
    }

    const mensaje = [{
      to: tokenData.expoPushToken,
      sound: 'default',
      title,
      body,
      data: { tipo: 'tecnico', tecnicoId }, // 👈 Etiqueta para filtrar en app
    }];

    await expo.sendPushNotificationsAsync(mensaje);
    console.log('📤 Notificación enviada a técnico:', tecnicoId);
  } catch (error) {
    console.error('❌ Error al enviar notificación a técnico:', error);
  }
};

const enviarNotificacionACliente = async ({ clienteId, title, body }) => {
  try {
    const tokensData = await PushToken.find({ clienteId }); // 👈 Busca TODOS los tokens

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
  estado: { type: String, default: 'Pendiente' },
  tecnicoAsignado: { type: String, default: null },
  fechaCreacion: { type: Date, default: Date.now },
  clienteId: String,
  tecnicoId: String
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
  clienteId: String,
  tecnicoId: String
});
const Toner = mongoose.model('Toner', tonerSchema,);


const tecnicoSchema = new mongoose.Schema({
  nombre: String,
  fotoUrl: String,
  tecnicoId: String
});

const Tecnico = mongoose.model('Tecnico', tecnicoSchema);

const usuarioSchema = new mongoose.Schema({
  email: String,
  password: String,
  activo: Boolean,
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

const pushTokenSchema = new mongoose.Schema({
  clienteId: { type: String, default: null },
  tecnicoId: { type: String, default: null },
  expoPushToken: { type: String, required: true },
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

app.post('/tickets', upload.array('fotos'), async (req, res) => {
  try {
    const { clienteNombre, empresa, area, telefono, impresora, descripcionFalla, clienteId } = req.body;
    const fotos = req.files?.map(file => `https://copias-backend-production.up.railway.app/uploads/${file.filename}`) || [];

    const nuevoTicket = new Ticket({
      clienteNombre,
      empresa,
      area,
      telefono,
      impresora,
      descripcionFalla,
      clienteId,
      fotos
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
    const { clienteNombre, empresa, area, telefono, impresora, clienteId } = req.body;

    const nuevoToner = new Toner({
      clienteNombre,
      empresa,
      area,
      telefono,
      impresora,
      clienteId
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

// ✅ Ruta para actualizar estado o técnico del TÓNER
app.patch('/toners/:id', async (req, res) => {
  try {
    const tonerAnterior = await Toner.findById(req.params.id);
    const toner = await Toner.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!toner) return res.status(404).json({ error: 'Tóner no encontrado' });

  
if (!tonerAnterior.tecnicoAsignado && toner.tecnicoAsignado) {
  await enviarNotificacionACliente({
    clienteId: toner.clienteId,
    title: '👨‍🔧 Técnico asignado a tu pedido de tóner',
    body: `Técnico ${toner.tecnicoAsignado} ha sido asignado a tu pedido en ${toner.empresa} - ${toner.area}.`,
  });


  await enviarNotificacionATecnico({
  tecnicoId: toner.tecnicoId,
  title: '📦 Nuevo pedido de tóner',
  body: `Tienes un pedido en ${toner.empresa} - ${toner.area}`
});}

    res.json(toner);
  } catch (error) {
    console.error('❌ Error al actualizar tóners:', error);
    res.status(500).json({ error: 'Error al actualizar tóners' });
  }
});
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
    const clienteNombre = req.headers['cliente-nombre'];
    let tickets;

    if (clienteNombre) {
      tickets = await Ticket.find({ clienteNombre });
    } else {
      tickets = await Ticket.find();
    }

    res.json(tickets);
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
});


app.get('/toners', async (req, res) => {
  try {
    const clienteId = req.headers['cliente-id'];
    const query = clienteId ? { clienteId } : {};

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

app.patch('/tickets/:id', async (req, res) => {
  try {
    const ticketAnterior = await Ticket.findById(req.params.id);
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    // ✅ Notificación cuando se asigna un técnico
if (!ticketAnterior.tecnicoAsignado && ticket.tecnicoAsignado) {
    await enviarNotificacionACliente({
    clienteId: ticket.clienteId,
    title: '👨‍🔧 Técnico asignado a tu ticket',
    body: `Técnico ${ticket.tecnicoAsignado} ha sido asignado a tu ticket en ${ticket.empresa} - ${ticket.area}.`,
    });

    await enviarNotificacionATecnico({
    tecnicoId: ticket.tecnicoId,
    title: '📥 Nuevo ticket asignado',
    body: `Tienes un ticket en ${ticket.empresa} - ${ticket.area}`
});
}

    res.json(ticket);
  } catch (error) {
    console.error('Error al actualizar ticket:', error);
    res.status(500).json({ error: 'Error al actualizar ticket' });
  }
});

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
    const tecnicos = await Tecnico.find();
    res.json(tecnicos);
  } catch (error) {
    console.error('Error al obtener técnicos:', error);
    res.status(500).json({ error: 'Error al obtener técnicos' });
  }
});

// ✅ NUEVA RUTA PARA AGREGAR TÉCNICOS
app.post('/tecnicos', async (req, res) => {
  try {
   const { nombre, fotoUrl, tecnicoId } = req.body;

    const nuevoTecnico = new Tecnico({
      nombre,
      fotoUrl,
      tecnicoId
    });

    await nuevoTecnico.save();

    res.status(201).json({ message: 'Técnico agregado correctamente', tecnico: nuevoTecnico });
  } catch (error) {
    console.error('Error al agregar técnico:', error);
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
  const { email, password } = req.body;
  try {
    const usuario = await Usuario.findOne({ email });
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
  const { clienteId, tecnicoId, expoPushToken } = req.body;

  if ((!clienteId && !tecnicoId) || !expoPushToken) {
    return res.status(400).json({ error: '❌ Datos incompletos' });
  }

  if (!expoPushToken.startsWith('ExponentPushToken')) {
    return res.status(400).json({ error: '❌ Token inválido' });
  }

  try {
    // 1️⃣ Verificar si el token ya existe para este dispositivo
    const tokenExistente = await PushToken.findOne({ expoPushToken });
    
    if (tokenExistente) {
      // Actualizar los IDs si es el mismo dispositivo
      tokenExistente.clienteId = clienteId || tokenExistente.clienteId;
      tokenExistente.tecnicoId = tecnicoId || tokenExistente.tecnicoId;
      await tokenExistente.save();
    } else {
      // 2️⃣ Crear nuevo registro si no existe
      const nuevoToken = new PushToken({ clienteId, tecnicoId, expoPushToken });
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

app.post('/tickets/:id/finalizar', upload.array('fotosTecnico'), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    const comentario = req.body.comentario || '';
    const nuevasFotos = req.files?.map(file => `https://copias-backend-production.up.railway.app/uploads/${file.filename}`) || [];

ticket.estado = 'Terminado';

    ticket.fotos.push(...nuevasFotos);
    // ticket.comentarioTecnico = comentario; // Si decides guardar comentarios en el modelo

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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  
});

