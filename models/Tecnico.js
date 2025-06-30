const mongoose = require('mongoose');

const tecnicoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    fotoUrl: { type: String, required: false },
    activo: { type: Boolean, default: true }
});

const Tecnico = mongoose.model('Tecnico', tecnicoSchema);

module.exports = Tecnico;
