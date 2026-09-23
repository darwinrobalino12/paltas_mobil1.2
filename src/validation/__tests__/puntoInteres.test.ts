import { reglasNombre, reglasDescripcion, reglasCategoriaId } from '../puntoInteres';

// Estas reglas son las que react-hook-form usa en CrearPuntoScreen para
// impedir el envío de datos inválidos (ver CrearPuntoScreen.test.tsx para la
// prueba de integración con el formulario real). Acá se fija el contrato:
// los valores exactos deben calzar con proyecto_paltas/paltas mobil/routes/puntos.js.
describe('reglasNombre', () => {
  it('es obligatorio', () => {
    expect(reglasNombre.required).toBe('El nombre es obligatorio.');
  });

  it('exige un mínimo de 3 caracteres', () => {
    expect(reglasNombre.minLength.value).toBe(3);
    expect(reglasNombre.minLength.message).toBe('El nombre debe tener al menos 3 caracteres.');
  });

  it('permite hasta 100 caracteres', () => {
    expect(reglasNombre.maxLength.value).toBe(100);
    expect(reglasNombre.maxLength.message).toBe('El nombre no puede superar los 100 caracteres.');
  });
});

describe('reglasDescripcion', () => {
  it('es opcional (no tiene required) y permite hasta 500 caracteres', () => {
    expect('required' in reglasDescripcion).toBe(false);
    expect(reglasDescripcion.maxLength.value).toBe(500);
    expect(reglasDescripcion.maxLength.message).toBe('La descripción no puede superar los 500 caracteres.');
  });
});

describe('reglasCategoriaId', () => {
  it('es obligatoria', () => {
    expect(reglasCategoriaId.required).toBe('Debes seleccionar una categoría.');
  });
});
