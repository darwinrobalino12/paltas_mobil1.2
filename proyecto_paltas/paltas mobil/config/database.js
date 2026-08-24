const { Sequelize } = require('sequelize');

// Ponemos los datos directamente apuntando al puerto 3307 de Docker
const sequelize = new Sequelize(
  'ruta_paltas',      // Nombre de la base de datos
  'root',             // Usuario
  'rootpassword',     // Contraseña exacta de tu docker-compose.yml
  {
    host: 'localhost',
    port: 3307,       // <-- Obligamos a conectar por el puerto alternativo
    dialect: 'mysql',
    logging: false, 
  }
);

module.exports = sequelize;