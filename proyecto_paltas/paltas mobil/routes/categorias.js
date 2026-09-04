const express = require('express');

module.exports = function crearRouterCategorias({ Categoria }) {
  const router = express.Router();

  router.get('/categorias', async (req, res) => {
    const categorias = await Categoria.findAll({ attributes: ['id', 'nombre'] });
    res.json(categorias);
  });

  return router;
};
