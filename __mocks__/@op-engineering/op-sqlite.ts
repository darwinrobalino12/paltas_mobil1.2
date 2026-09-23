// Mock manual de @op-engineering/op-sqlite para Jest (es un módulo JSI/C++,
// no existe fuera de un dispositivo real). Jest lo aplica automáticamente a
// cualquier `import ... from '@op-engineering/op-sqlite'` sin necesitar
// jest.mock() en cada archivo de prueba.
//
// Solo existe para que nada truene al importar src/storage/sqlite/db.ts de
// forma transitiva (por ejemplo desde AuthContext o App.test.tsx). Las
// pruebas de pantallas mockean el *repositorio* (puntosRepository, etc.), no
// esta base de datos falsa — por eso alcanza con devolver resultados vacíos.

function crearEjecutor() {
  return jest.fn(async () => ({ rows: [] as unknown[] }));
}

export function open() {
  return {
    execute: crearEjecutor(),
    transaction: jest.fn(async (callback: (tx: { execute: jest.Mock }) => Promise<void>) => {
      await callback({ execute: crearEjecutor() });
    }),
  };
}

export type DB = ReturnType<typeof open>;
