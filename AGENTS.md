# Guía para agentes y colaboradores

Sistema de gestión de estudios NOM-STPS. Repositorio **público**. Nada de lo que se suba aquí puede ser secreto ni expediente de un cliente.

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript.
- Estilos en CSS propio (`src/app/globals.css`). La impresión oficial es HTML y `window.print()`; no hay generador de PDF en el servidor.
- Datos de la app: `MemoryStore` en `src/lib/store.ts`. El DDL de Postgres está en `src/database/schema.sql` y **no está cableado** a la aplicación.
- Catálogo inicial de normas: `src/lib/nom-catalog-data.ts`.
- Reglas de negocio puras: `src/lib/rules.ts`. Sello SHA-256: `src/lib/hash.ts`.
- Despliegue previsto en Vercel (`vercel.json`). No se despliega ni se toca Vercel sin autorización de Miguel.

## Cómo correrlo

Requisitos: Node.js 20 o superior y npm 9 o superior.

```bash
npm ci
npm run dev
```

La app queda en `http://localhost:3000`. El inicio de sesión de demostración vive en `/login`. Las contraseñas de prueba están en el README y son datos ficticios de la demo, no credenciales de producción.

## Cómo probarlo

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm test            # vitest, sobre el TypeScript real
npm run build
```

La integración continua (`.github/workflows/ci.yml`) corre install, typecheck, lint, pruebas, build y gitleaks. Tiene que quedar en verde antes de pedir revisión. Miguel autoriza el merge; un agente no fusiona, no despliega y no hace force-push a `main`.

Las pruebas históricas en Python (`tests/test_reglas_negocio.py`) reimplementan las reglas y no son la fuente de verdad. La fuente de verdad es el TypeScript de `src/lib`.

## Reglas de trabajo

- No llevar a producción, ni fusionar, ni borrar ramas, ni force-push a `main`, sin autorización explícita de Miguel.
- No commitear secretos, `.env`, llaves, tokens ni PDFs o DOCX reales de clientes. El repo es público.
- No elegir ni configurar proveedor de archivos (Blob, S3, R2) ni tocar variables de Vercel. Eso lo decide Miguel.
- Un cambio, un propósito. Sin refactors que nadie pidió.
- Los reportes de clientes se usan solo en local, fuera de git, cuando Miguel los entregue.

## Riesgos conocidos (no corregidos en el arnés)

La autenticación es de demostración y no debe tratarse como control de acceso real:

- Las contraseñas se guardan y se comparan en texto plano (`hashContrasena` en `MemoryStore` no es un hash).
- El “JWT” de `src/app/api/auth/login/route.ts` es una cadena armada en el servidor (`jwt_token_sample_…`). No hay firma ni verificación.
- `getCurrentUser` en `src/lib/auth.ts` no valida sesión: en el servidor devuelve al revisor de la empresa 1. Las rutas de `src/app/api` no exigen sesión.
- `generarSelloDigital` mezcla un salt fijo en el código (`SECRET_SALT_NOM_STPS`). No es un secreto de producción, y tampoco es un sello con valor legal.
- RN-02 (aislamiento por empresa) solo se aplica en algunos métodos del store, y el cliente manda `empresaId` por query. No hay RLS activo porque Postgres no está conectado.
- RN-08 (reintentos de correo) está simulado con `setTimeout`. No hay SMTP ni retroceso exponencial real.
- El esquema SQL, las políticas RLS y el trigger de retención de 5 años no se ejecutan en runtime.

## Reportes de referencia (NOM-033)

Fase 1, todavía sobre el `MemoryStore`. El texto del reporte se guarda con `FileStorage`.

`FILE_STORAGE` vale `memory` o `local`:

- Sin variable, vacío o `memory`: memoria. Es el valor de la demo y de Vercel. El disco de las funciones es de solo lectura (`/var/task`), y lo que está en memoria se pierde al reiniciar el proceso.
- `local`: disco en `data/referencias` (fuera de git). Solo si el entorno puede escribir.
- Cualquier otro valor detiene el arranque del almacén con un error. No hay Blob ni S3 en este código.

```bash
npm run dev
```

1. Abre `http://localhost:3000/reportes-referencia/nuevo`.
2. Deja la empresa de demostración, el centro Planta Tijuana y la NOM-033. Fecha `2025-03-15`.
3. Sube `public/fixtures/nom033-anexo-sintetico.pdf` (datos inventados, filas partidas).
4. Revisa la tabla, corrige si hace falta y marca **CONFIRMADO**.
5. Abre el estudio de prueba `EST-2026-0004` en `/estudios/4` y entra a **Comparar con referencia**.
6. La vista se imprime con el botón del navegador. No se mete al dictamen oficial.

El PDF se lee en el navegador con pdfjs-dist (`src/lib/pdf-cliente.ts`). Ahí mismo se arman las filas del Anexo 1 con la coordenada X de cada columna (`src/lib/nom033-parser.ts`): se ignora el índice, el encabezado repetido y el pie «Página N de M», y un año no cuenta como medición. Al API llegan el texto, las filas ya leídas, el nombre, el tamaño y el SHA-256. El servidor vuelve a calcular el cumplimiento y no interpreta el texto plano. Un texto que no quepa holgado en 4 MB se rechaza.

Solo un reporte en estado `CONFIRMADO` participa. `PENDIENTE`, `EXTRAIDO` y `RECHAZADO` no se comparan. Confirmar exige el estado `EXTRAIDO` y al menos un espacio; un `RECHAZADO` o un `PENDIENTE` no se confirman. El tipo escrito en la Tabla 7 y el tipo calculado con la medición se guardan por separado. Si una fila no trae las cuatro mediciones o no aparece en la Tabla 7, queda marcada para revisión y no se inventa el dato.

### Deuda explícita (no se implementa en esta demo)

- **Auth y aislamiento.** `src/app/api/reportes-referencia/*` y `src/app/api/estudios/[id]/comparar` no exigen sesión y no aíslan por empresa más allá del `empresaId` que manda el cliente. Al confirmar, `resolverUsuarioId` toma el id de `getCurrentUser` si el helper trae uno; si no, usa el `usuarioId` del body. Ese helper no valida el token: en el servidor devuelve al revisor de demostración. No es control de acceso.
- **RLS.** La migración prende RLS en `reportes_referencia`. La tabla `resultados_espacio_referencia` no tiene política RLS. Postgres no está cableado, así que ninguna de las dos se aplica en runtime.

## Dónde está cada regla

| Regla | Dónde vive el TypeScript que sí corre | Qué cubre la prueba |
| --- | --- | --- |
| RN-01 | `validarRN01IntegridadReferencial` | Centro, tipo y elaborador obligatorios |
| RN-02 | `store.getEstudioById` | No devuelve un estudio de otra empresa |
| RN-03 | `validarRN03Logotipo` | MIME y tope de 2 MB |
| RN-04 | `calcularRN04Vigencia` | Meses de la NOM y escala VLE de NOM-010 |
| RN-05 | `debeIncluirMarcaDeAgua` | Marca de agua si no está aprobado |
| RN-06 | `validarRN06AcreditacionElaborador` | Acreditación vencida bloquea la aprobación |
| RN-07 | `calcularHashSha256` y `generarSelloDigital` | SHA-256 determinista |
| RN-08 | `store.solicitarEnvio` | El envío nace en `PENDIENTE` con cero reintentos |
| RN-09 | `validarRN09RetencionLegal` | No se borra un aprobado con menos de 5 años |
