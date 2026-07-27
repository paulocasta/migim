# Roles y permisos — Migim

Tres roles: **admin**, **profesor**, **alumno**. Autorización en dos niveles: por **rol** (qué endpoints) y por **ownership** (a qué filas concretas).

## Matriz de permisos

| Recurso / acción | admin | profesor | alumno |
|------------------|:-----:|:--------:|:------:|
| Gestionar profesores | ✅ | ❌ | ❌ |
| Crear/editar alumnos | ✅ | ✅ | ❌ |
| Baja lógica de usuarios | ✅ | ✅ (alumnos) | ❌ |
| Categorías (CRUD) | ✅ | ✅ | 👁 ver |
| Ejercicios + videos (CRUD) | ✅ | ✅ | 👁 ver |
| Block types | 👁 ver | 👁 ver | 👁 ver |
| Crear/editar/borrar rutinas | ✅ | ✅ | ❌ |
| Ver rutinas | ✅ (todas) | ✅ (todas) | 👁 solo la propia |
| Armar días/bloques/ejercicios/prescribed_sets | ✅ | ✅ | ❌ |
| Cargar/editar **peso** (weight_entries) | ❌* | ❌* | ✅ solo propias |
| Ver métricas | ✅ (cualquier alumno) | ✅ (cualquier alumno) | 👁 solo propias |

✅ full · 👁 solo lectura · ❌ sin acceso
\* Admin/profe no cargan pesos por el alumno en el MVP (el peso es dato del alumno). Se puede habilitar a futuro (ver ROADMAP).

## Reglas de ownership

- **Alumno → weight_entries**: toda escritura fuerza `alumno_id = req.user.id`. No puede leer ni editar pesos de otro alumno. Intento sobre recurso ajeno → `403`.
- **Alumno → rutina**: solo puede leer rutinas donde `routines.alumno_id = req.user.id` (`/routines/mine`, `/routines/:id` con chequeo).
- **Profesor**: puede operar sobre cualquier alumno y sus rutinas, pero **no** sobre otros profesores ni sobre la gestión de profesores.
- **Admin**: sin restricciones.

## Implementación

- Middleware `requireRole(...roles)` bloquea por rol antes del controller.
- Middleware/servicio de ownership valida la fila concreta (rutina o weight_entry) contra `req.user`.
- El JWT contiene `{ userId, role }`; nunca confiar en el rol enviado por el cliente en el body.

## Alta de usuarios

Sin auto-registro. Flujo: admin crea profesores; admin/profe crean alumnos con credenciales iniciales. Bajas = `activo=false` (preserva historial de métricas).
