// Reglas derivadas 1:1 del contrato del backend (ver validarPunto en
// proyecto_paltas/paltas mobil/routes/puntos.js y docs/contrato-puntos-interes.md).
// Compatibles con las `rules` de react-hook-form.
export const reglasNombre = {
  required: 'El nombre es obligatorio.',
  minLength: { value: 3, message: 'El nombre debe tener al menos 3 caracteres.' },
  maxLength: { value: 100, message: 'El nombre no puede superar los 100 caracteres.' },
};

export const reglasDescripcion = {
  maxLength: { value: 500, message: 'La descripción no puede superar los 500 caracteres.' },
};

export const reglasCategoriaId = {
  required: 'Debes seleccionar una categoría.',
};
