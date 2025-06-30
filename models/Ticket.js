const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    clienteNombre: { type: String, required: true },
    empresa: { type: String, required: true },
    area: { type: String, required: false },
    telefono: { type: String, required: false },
    descripcionFalla: { type: String, required: true },
    fotos: [String], // Aquí se guardarán URLs de fotos si luego implementamos esa parte
    estado: { type: String, enum: ['Pendiente', 'Asignado', 'Terminado', 'Cancelado'], default: 'Pendiente' },
    tecnicoAsignado: { type: String, default: null }, // Nombre o ID del técnico asignado
    fechaCreacion: { type: Date, default: Date.now },
    fechaActualizacion: { type: Date, default: Date.now }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
