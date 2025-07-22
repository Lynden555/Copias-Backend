// backend/cloudinary.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dhcoyjimz',
  api_key: '712581995128822',
  api_secret: 'uF9EtxsVIFSYymKHba_U7WNp_w4',
});

module.exports = cloudinary;