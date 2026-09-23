import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { CrearPuntoScreen } from '../CrearPuntoScreen';
import { ApiError } from '../../api/client';
import { crearPunto } from '../../api/puntos';
import { insertarPuntoPendiente } from '../../storage/sqlite/puntosRepository';
import { encolarOperacion } from '../../storage/sqlite/outboxRepository';

// RequireAuth exige NavigationContainer + AuthContext real — no es lo que
// esta prueba quiere verificar (eso ya lo cubriría una prueba de RequireAuth
// aparte), así que se sustituye por un passthrough.
jest.mock('../../navigation/RequireAuth', () => ({
  RequireAuth: ({ children }: { children: React.ReactNode }) => children,
}));

// useSync empieza "en línea"; el test de la rama offline lo cambia con
// mockReturnValueOnce (el nombre debe empezar con "mock" para que Jest lo
// deje referenciar dentro del factory de jest.mock, por el hoisting).
const mockUseSync = jest.fn(() => ({ isOnline: true, refrescarContador: jest.fn() }));
jest.mock('../../context/SyncContext', () => ({
  useSync: () => mockUseSync(),
}));

jest.mock('../../storage/sqlite/categoriasRepository', () => ({
  listarCategoriasLocales: jest.fn(() => Promise.resolve([{ id: 1, nombre: 'Natural' }])),
  sincronizarCategorias: jest.fn(() => Promise.resolve([{ id: 1, nombre: 'Natural' }])),
}));

jest.mock('../../api/puntos', () => ({
  crearPunto: jest.fn(),
  crearPuntoConFoto: jest.fn(),
}));

// Rama offline (cobertura): antes sin cubrir. Se mockean por separado de
// categoriasRepository/puntosRepository de lectura para poder aserttar
// exactamente con qué se llama al guardar localmente.
jest.mock('../../storage/sqlite/puntosRepository', () => ({
  insertarPuntoPendiente: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../storage/sqlite/outboxRepository', () => ({
  encolarOperacion: jest.fn(() => Promise.resolve()),
}));

const navigation = { navigate: jest.fn() } as any;
const crearPuntoMock = crearPunto as jest.Mock;
const insertarPuntoPendienteMock = insertarPuntoPendiente as jest.Mock;
const encolarOperacionMock = encolarOperacion as jest.Mock;

async function renderFormulario() {
  await render(<CrearPuntoScreen navigation={navigation} route={{} as any} />);
  // Espera a que carguen las categorías (useEffect asíncrono) antes de interactuar.
  await waitFor(() => expect(screen.getByText('Natural')).toBeOnTheScreen());
}

async function llenarNombreYDescripcion(nombre: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('Ej. Mirador El Shiriculapo'), nombre);
  await fireEvent.changeText(
    screen.getByPlaceholderText('Describe brevemente el lugar'),
    'Una descripción válida.'
  );
}

async function presionarGuardar() {
  await fireEvent.press(screen.getByText('Guardar punto de interés'));
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('CrearPuntoScreen — el formulario impide el envío de datos inválidos', () => {
  it('nombre vacío: no envía y muestra el mensaje de campo obligatorio', async () => {
    await renderFormulario();

    await presionarGuardar();

    await waitFor(() => expect(screen.getByText('El nombre es obligatorio.')).toBeOnTheScreen());
    expect(crearPuntoMock).not.toHaveBeenCalled();
  });

  it('nombre demasiado corto: no envía y muestra el mensaje de mínimo', async () => {
    await renderFormulario();
    await llenarNombreYDescripcion('ab');

    await presionarGuardar();

    await waitFor(() =>
      expect(screen.getByText('El nombre debe tener al menos 3 caracteres.')).toBeOnTheScreen()
    );
    expect(crearPuntoMock).not.toHaveBeenCalled();
  });

  it('sin categoría seleccionada: no envía y muestra el mensaje correspondiente', async () => {
    await renderFormulario();
    await llenarNombreYDescripcion('Mirador válido');

    await presionarGuardar();

    await waitFor(() => expect(screen.getByText('Debes seleccionar una categoría.')).toBeOnTheScreen());
    expect(crearPuntoMock).not.toHaveBeenCalled();
  });
});

describe('CrearPuntoScreen — mapeo de errores del servidor', () => {
  it('422: el mensaje del servidor se asocia al campo correcto, no como error genérico', async () => {
    crearPuntoMock.mockRejectedValueOnce(
      new ApiError(422, { errors: [{ field: 'nombre', message: 'Ya existe un punto con ese nombre.' }] })
    );
    await renderFormulario();
    await llenarNombreYDescripcion('Mirador repetido');
    await fireEvent.press(screen.getByText('Natural'));

    await presionarGuardar();

    await waitFor(() =>
      expect(screen.getByText('Ya existe un punto con ese nombre.')).toBeOnTheScreen()
    );
    // No debe aparecer además el mensaje genérico de traducirError.
    expect(screen.queryByText('Los datos enviados no son válidos.')).not.toBeOnTheScreen();
  });

  it('500: usa el mensaje genérico de traducirError, no intenta mapear a un campo', async () => {
    crearPuntoMock.mockRejectedValueOnce(new ApiError(500, {}));
    await renderFormulario();
    await llenarNombreYDescripcion('Mirador con error de servidor');
    await fireEvent.press(screen.getByText('Natural'));

    await presionarGuardar();

    await waitFor(() =>
      expect(screen.getByText('El servidor tuvo un problema. Intenta de nuevo más tarde.')).toBeOnTheScreen()
    );
  });
});

// Rama que la cobertura reveló sin cubrir (ver docs/semana15-pruebas-observabilidad.md):
// el camino offline de onSubmit nunca pasaba por ninguna prueba.
describe('CrearPuntoScreen — sin conexión', () => {
  afterEach(() => {
    // mockReturnValueOnce no alcanza acá: el useEffect que carga categorías
    // causa un segundo render (y una segunda llamada a useSync) antes de que
    // el usuario llegue a enviar el formulario, así que hay que fijar el
    // valor para TODA la prueba y restaurarlo explícitamente después.
    mockUseSync.mockReturnValue({ isOnline: true, refrescarContador: jest.fn() });
  });

  it('guarda el punto localmente y lo encola, sin llamar a crearPunto', async () => {
    mockUseSync.mockReturnValue({ isOnline: false, refrescarContador: jest.fn() });

    await renderFormulario();
    await llenarNombreYDescripcion('Mirador sin conexión');
    await fireEvent.press(screen.getByText('Natural'));

    await presionarGuardar();

    await waitFor(() =>
      expect(
        screen.getByText('Sin conexión: el punto se guardó localmente y se enviará automáticamente al reconectar.')
      ).toBeOnTheScreen()
    );

    expect(insertarPuntoPendienteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Mirador sin conexión',
        categoriaId: 1,
        categoriaNombre: 'Natural',
      })
    );
    expect(encolarOperacionMock).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'punto_interes', operation: 'create' })
    );
    expect(crearPuntoMock).not.toHaveBeenCalled();
  });
});
