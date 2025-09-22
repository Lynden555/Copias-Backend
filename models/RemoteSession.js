const mongoose = require("mongoose");

const RemoteSessionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // Código único
    status: {
      type: String,
      enum: ["pending", "connected", "closed"],
      default: "pending",
    },
    tecnicoId: { type: String },  // opcional: ID del técnico
    clienteId: { type: String },  // opcional: ID del cliente
  },
  { timestamps: true } // createdAt, updatedAt
);

module.exports = mongoose.model("RemoteSession", RemoteSessionSchema);