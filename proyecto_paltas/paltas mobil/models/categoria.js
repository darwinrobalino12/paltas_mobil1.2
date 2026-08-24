const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Definimos la tabla Categoria
const Categoria = sequelize.define('Categoria', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, { 
  timestamps: false // Esto evita que Sequelize cree columnas automáticas de fecha
});

module.exports = Categoria;