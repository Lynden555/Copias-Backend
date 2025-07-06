const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const webpush = require('web-push'); // ✅ Nuevo
const { publicKey, privateKey } = require('./vapidkeys'); // ✅ Nuevo
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

// ✅ Configuración de web-push
webpush.setVapidDetails(
  'mailto:soporte@tuservidor.com',
  publicKey,
  privateKey
);

// ✅ Almacén temporal de suscripciones (puedes mover esto a base de datos)
let suscripciones = [];

app.post('/suscribirse', (req, res) => {
  const suscripcion = req.body;
  suscripciones.push(suscripcion);
  res.status(201).json({ message: '✅ Suscripción registrada' });
});

// ✅ Función para enviar notificaciones a todos
const enviarNotificacion = (payload) => {
  suscripciones.forEach(sub =>
    webpush.sendNotification(sub, JSON.stringify(payload)).catch(err => console.error('❌ Error al enviar noti:', err))
  );
};

const enviarNotificacionExpo = async ({ title, body }) => {
  try {
    const tokensDB = await PushToken.find();

    const mensajes = tokensDB
      .filter(t => Expo.isExpoPushToken(t.expoPushToken))
      .map(t => ({
        to: t.expoPushToken,
        sound: 'default',
        title,
        body,
      }));

    const chunks = expo.chunkPushNotifications(mensajes);

    if (mensajes.length === 0) {
  console.log('📭 No hay tokens válidos para notificar');
  return;
}
    for (let chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log('📤 Notificaciones Expo enviadas');
  } catch (error) {
    console.error('❌ Error al enviar notificaciones Expo:', error);
  }
};

const enviarNotificacionACliente = async ({ clienteId, title, body }) => {
  try {
    const tokenData = await PushToken.findOne({ clienteId });
    if (!tokenData || !Expo.isExpoPushToken(tokenData.expoPushToken)) {
      console.log(`❌ Token inválido o no encontrado para clienteId: ${clienteId}`);
      return;
    }

    const mensaje = [{
      to: tokenData.expoPushToken,
      sound: 'default',
      title,
      body,
    }];

    await expo.sendPushNotificationsAsync(mensaje);
    console.log('📤 Notificación enviada a cliente:', clienteId);
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
  clienteId: String
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
  clienteId: String
});
const Toner = mongoose.model('Toner', tonerSchema,);


const tecnicoSchema = new mongoose.Schema({
  nombre: String,
  fotoUrl: String,
});
const Tecnico = mongoose.model('Tecnico', tecnicoSchema);

const usuarioSchema = new mongoose.Schema({
  email: String,
  password: String,
  activo: Boolean,
});
const Usuario = mongoose.model('Usuario', usuarioSchema);

const pushTokenSchema = new mongoose.Schema({
  clienteId: { type: String, required: true },
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
    const fotos = req.files?.map(file => `http://localhost:3000/uploads/${file.filename}`) || [];

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

    // ✅ Enviar notificación push
    enviarNotificacion({
      title: '📢 Nuevo Ticket',
      body: `${empresa} - ${area}: ${descripcionFalla}`,
    });

    enviarNotificacionExpo({
  title: '📢 Nuevo Ticket',
  body: `${empresa} - ${area}: ${descripcionFalla}`,
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

    // ✅ Enviar notificación push
    enviarNotificacion({
      title: '🟣 Nuevo pedido de tóner',
      body: `${empresa} - ${area} ha solicitado un tóner`,
    });

    enviarNotificacionExpo({
  title: '🟣 Nuevo pedido de tóner',
  body: `${empresa} - ${area} ha solicitado un tóner`,
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

    // ✅ Notificación cuando se asigna un técnico
if (!tonerAnterior.tecnicoAsignado && toner.tecnicoAsignado) {
  enviarNotificacionACliente({
    clienteId: toner.clienteId,
    title: '👨‍🔧 Técnico asignado a tu pedido de tóner',
    body: `Técnico ${toner.tecnicoAsignado} ha sido asignado a tu pedido en ${toner.empresa} - ${toner.area}.`,
  });
}

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
  enviarNotificacionACliente({
    clienteId: ticket.clienteId,
    title: '👨‍🔧 Técnico asignado a tu ticket',
    body: `Técnico ${ticket.tecnicoAsignado} ha sido asignado a tu ticket en ${ticket.empresa} - ${ticket.area}.`,
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
    const { nombre, fotoUrl } = req.body;

    const nuevoTecnico = new Tecnico({
      nombre,
      fotoUrl,
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
      const fotoUrl = `http://localhost:3000/uploads/${req.file.filename}`;
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
  const { clienteId, expoPushToken } = req.body;

  if (!clienteId || !expoPushToken) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  try {
    const existente = await PushToken.findOne({ clienteId });

    if (existente) {
      existente.expoPushToken = expoPushToken;
      await existente.save();
    } else {
      const nuevo = new PushToken({ clienteId, expoPushToken });
      await nuevo.save();
    }

    res.status(200).json({ message: '✅ Token registrado correctamente' });
  } catch (error) {
    console.error('❌ Error al guardar token push:', error);
    res.status(500).json({ error: 'Error interno al guardar token' });
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
    const nuevasFotos = req.files?.map(file => `http://localhost:3000/uploads/${file.filename}`) || [];

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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  
});

