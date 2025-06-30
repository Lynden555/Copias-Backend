const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

mongoose
  .connect('mongodb+srv://DiegoLLera:666bonus@cluster0.l40i6a0.mongodb.net/copiadoras?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('✅ Conectado a MongoDB Atlas correctamente'))
  .catch((err) => console.error('❌ Error al conectar a MongoDB Atlas:', err));

const usuarioSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

(async () => {
  try {
    const passwordHash = await bcrypt.hash('admin123', 10); // 👈 contraseña que pondrás luego en el login

    const admin = new Usuario({
      email: 'admin@miapp.com',
      password: passwordHash,
    });

    await admin.save();
    console.log('✅ Usuario admin creado con email admin@miapp.com y contraseña admin123');
    process.exit();
  } catch (error) {
    console.error('❌ Error al crear admin:', error);
    process.exit(1);
  }
})();
