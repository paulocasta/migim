# Modelo de datos — Migim

## Diagrama (ERD lógico)

```
users ──┐ (created_by)
  │ 1   └──< users            (admin/profe crean alumnos)
  │
  │ 1 (alumno_id)
  └──< routines
          │ 1
          └──< routine_days
                  │ 1
                  └──< routine_blocks ──> block_types (N:1, catálogo fijo)
                          │ 1
                          └──< routine_exercises ──> exercises (N:1) ──> categories (N:1)
                                  │ 1
                                  └──< prescribed_sets
                                          │ 1
                                          └──< weight_entries ──> users (alumno_id, N:1)
```

Jerarquía: `routine → routine_days → routine_blocks → routine_exercises → prescribed_sets → weight_entries`.

## Tablas

### users
| col | tipo | notas |
|-----|------|-------|
| id | serial PK | |
| nombre | text | |
| email | text UNIQUE | login |
| password_hash | text | bcrypt |
| role | text | `admin` \| `profesor` \| `alumno` (CHECK) |
| activo | boolean | default true (baja lógica) |
| created_by | int FK users(id) | quién dio el alta (null para admin seed) |
| created_at | timestamptz | default now() |

### categories
| col | tipo | notas |
|-----|------|-------|
| id | serial PK | |
| nombre | text | piernas, hombros, espalda, pecho, brazos, core… |
| orden | int | para ordenar en UI |

### exercises (catálogo)
| col | tipo | notas |
|-----|------|-------|
| id | serial PK | |
| category_id | int FK categories(id) | |
| nombre | text | ej "Press plano" |
| descripcion | text | opcional |
| video_url | text NULL | URL externa (YouTube/Vimeo) |
| video_file_path | text NULL | ruta a archivo en `server/uploads/` |
| created_by | int FK users(id) | |

Ambas columnas de video son opcionales; pueden coexistir (link + archivo).

### block_types (catálogo FIJO — seed)
| col | tipo | notas |
|-----|------|-------|
| id | serial PK | |
| nombre | text | |
| orden | int | |

Seed: `Entrada en calor`, `Potencia`, `Fuerza`, `Accesorios`, `Vuelta a la calma`.

### routines
| col | tipo | notas |
|-----|------|-------|
| id | serial PK | |
| nombre | text | ej "Bloque Julio - Hipertrofia" |
| alumno_id | int FK users(id) | destinatario |
| created_by | int FK users(id) | profe/admin autor |
| period_type | text | `semanal` \| `mensual` \| `personalizada` (CHECK) |
| start_date | date | inicio del bloque |
| activo | boolean | default true |
| created_at | timestamptz | default now() |

### routine_days
| col | tipo | notas |
|-----|------|-------|
| id | serial PK | |
| routine_id | int FK routines(id) ON DELETE CASCADE | |
| etiqueta | text | "Lunes", "Día 1"… |
| fecha | date, nullable | fecha real del día (auto-calculada en `semanal`/`mensual`; null en `personalizada` salvo que se cargue a mano) |
| orden | int | posición estable; en `semanal`/`mensual` codifica la semana (`semana = orden // 7`) y no se reindexa al borrar un día |

### routine_blocks
| col | tipo | notas |
|-----|------|-------|
| id | serial PK | |
| routine_day_id | int FK routine_days(id) ON DELETE CASCADE | |
| block_type_id | int FK block_types(id) | |
| orden | int | |

### routine_exercises
| col | tipo | notas |
|-----|------|-------|
| id | serial PK | |
| routine_block_id | int FK routine_blocks(id) ON DELETE CASCADE | |
| exercise_id | int FK exercises(id) | |
| orden | int | |
| notas | text | indicaciones del profe (tempo, descanso…) |

### prescribed_sets
Representa el esquema `series×reps`. Ej `1x8 2x6 1x4` = 3 filas.
| col | tipo | notas |
|-----|------|-------|
| id | serial PK | |
| routine_exercise_id | int FK routine_exercises(id) ON DELETE CASCADE | |
| orden | int | orden del grupo (0,1,2…) |
| sets_count | int | ej 1, 2, 1 |
| reps | int | ej 8, 6, 4 |

### weight_entries (carga del alumno)
| col | tipo | notas |
|-----|------|-------|
| id | serial PK | |
| prescribed_set_id | int FK prescribed_sets(id) ON DELETE CASCADE | qué grupo de reps |
| alumno_id | int FK users(id) | dueño del registro |
| fecha | date | día de entrenamiento (default hoy) |
| peso | numeric(6,2) | kg levantados en ese grupo |
| nota | text | opcional (sensaciones, RIR…) |
| created_at | timestamptz | default now() |

Índices: `(prescribed_set_id, fecha)`, `(alumno_id, fecha)`.
Constraint recomendado: UNIQUE `(prescribed_set_id, alumno_id, fecha)` para 1 peso por grupo por día (editable).

## Cálculo de métricas

Todo se deriva de `weight_entries` joineado con `prescribed_sets → routine_exercises → exercises`.

- **Progreso por ejercicio**: serie temporal `fecha → peso` filtrando por `exercise_id` y `alumno_id`.
- **Volumen**: `SUM(sets_count * reps * peso)` agrupado por sesión (fecha), semana, o categoría muscular (via `exercises.category_id`).
- **PRs**: `MAX(peso)` por `exercise_id`; una entry nueva que supera el máximo previo = PR.
- **Historial / asistencia**: `COUNT(DISTINCT fecha)` por alumno → racha y adherencia comparando contra los `routine_days` esperados del periodo.

## Notas de integridad

- Borrados en cascada desde `routines` hacia abajo (borrar una rutina limpia su árbol).
- `weight_entries` cuelga de `prescribed_sets`: si el profe borra un grupo de reps, se pierden sus pesos (documentar/avisar en UI antes de borrar estructura con datos).
- Bajas de usuario = `activo=false` (no borrado físico) para preservar historial.
