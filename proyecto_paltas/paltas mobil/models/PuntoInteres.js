const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Categoria = require('./categoria');

// Definimos la tabla PuntoInteres
const PuntoInteres = sequelize.define('PuntoInteres', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT
  },
  latitud: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  longitud: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  imagenUrl: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

// DEFINIMOS LA RELACIÓN:
// Un punto de interés pertenece a una categoría, y una categoría tiene muchos puntos.
PuntoInteres.belongsTo(Categoria, { foreignKey: 'categoriaId', as: 'categoria' });
Categoria.hasMany(PuntoInteres, { foreignKey: 'categoriaId', as: 'puntos' });

module.exports = PuntoInteres;