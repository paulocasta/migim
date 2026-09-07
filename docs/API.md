# API REST — Migim

Base URL: `/api`. Autenticación: header `Authorization: Bearer <JWT>` salvo `POST /auth/login`.
Formato: JSON. Errores: `{ "error": { "code", "message" } }`.

Roles abreviados: **A**=admin, **P**=profesor, **AL**=alumno.

## Auth

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/auth/login` | público | body `{ email, password }` → `{ token, user }` |
| POST | `/auth/logout` | A/P/AL | invalida sesión del cliente (borra token) |
| GET | `/auth/me` | A/P/AL | usuario autenticado actual |

## Users

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/users` | A/P | lista (P ve alumnos; A ve todos) |
| POST | `/users` | A/P | crea usuario. P solo crea `alumno`; A crea `profesor`/`alumno` |
| GET | `/users/:id` | A/P | detalle |
| PUT | `/users/:id` | A/P | edita datos. A gestiona profes |
| PATCH | `/users/:id/activo` | A/P | baja/alta lógica (`activo`) |

Alumnos no tienen acceso a este módulo (salvo `/auth/me`).

## Categories

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/categories` | A/P/AL | lista (AL para ver, read-only) |
| POST | `/categories` | A/P | crea |
| PUT | `/categories/:id` | A/P | edita |
| DELETE | `/categories/:id` | A/P | borra (si no tiene ejercicios) |

## Exercises (catálogo)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/exercises` | A/P/AL | lista; filtro `?categoryId=` |
| GET | `/exercises/:id` | A/P/AL | detalle (incluye video) |
| POST | `/exercises` | A/P | crea (nombre, categoría, descripción, `video_url` opcional) |
| PUT | `/exercises/:id` | A/P | edita |
| DELETE | `/exercises/:id` | A/P | borra |
| POST | `/exercises/:id/video` | A/P | `multipart/form-data` → sube archivo a `uploads/`, setea `video_file_path` |

## Block types

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/block-types` | A/P/AL | catálogo fijo (solo lectura) |

## Routines

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/routines` | A/P | lista; filtro `?alumnoId=` |
| GET | `/routines/mine` | AL | rutinas del alumno autenticado |
| GET | `/routines/:id` | A/P/AL* | árbol completo (días→bloques→ejercicios→prescribed_sets). *AL solo la propia |
| POST | `/routines` | A/P | crea rutina para un alumno |
| PUT | `/routines/:id` | A/P | edita metadata |
| DELETE | `/routines/:id` | A/P | borra (cascade) |
| POST | `/routines/:id/copy` | A/P | clona la rutina completa (días→bloques→ejercicios→series) a una nueva fecha de inicio; `created_by`/`admin` solamente |

### Subrecursos (todos A/P, cascade)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST/PUT/DELETE | `/routines/:id/days[/:dayId]` | días |
| POST | `/routine-days/:dayId/copy-to` | copia bloques/ejercicios/series de este día a otros días de la misma rutina (reemplaza contenido destino) |
| POST/PUT/DELETE | `/days/:dayId/blocks[/:blockId]` | bloques (elige `block_type_id`) |
| POST/PUT/DELETE | `/blocks/:blockId/exercises[/:reId]` | ejercicios en bloque |
| POST/PUT/DELETE | `/exercises-in-routine/:reId/prescribed-sets[/:psId]` | grupos `series×reps` |

> Nota: los paths de subrecursos pueden aplanarse en implementación; lo esencial es respetar la jerarquía y el cascade.

## Weight entries (carga del alumno)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/weight-entries` | AL | propias; filtros `?exerciseId=&from=&to=` |
| POST | `/weight-entries` | AL | body `{ prescribed_set_id, fecha, peso, nota }`. Ownership forzado a `req.user` |
| PUT | `/weight-entries/:id` | AL | edita peso/nota (solo si es propia) |
| DELETE | `/weight-entries/:id` | AL | borra (solo propia) |

El alumno **solo** puede tocar `weight_entries` propias; cualquier otro recurso es read-only para él.

## Metrics

Todas soportan `?alumnoId=` (A/P) o se resuelven al alumno autenticado (AL, solo propias).

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/metrics/progress?exerciseId=` | serie `fecha → peso` por ejercicio |
| GET | `/metrics/volume?groupBy=session\|week\|category` | volumen agregado |
| GET | `/metrics/prs` | récords máximos por ejercicio |
| GET | `/metrics/attendance?from=&to=` | días entrenados, racha, adherencia |

## Códigos de estado

- `200/201` ok, `204` sin contenido (delete).
- `400` validación, `401` sin/mal token, `403` rol/ownership insuficiente, `404` no existe, `409` conflicto (ej email duplicado).
