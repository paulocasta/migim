# Migim — App de seguimiento de rutinas de gimnasio

App web (PWA) para que profesores/administradores armen rutinas de gimnasio y los alumnos las sigan, cargando el peso que levantan para generar métricas de progreso.

## Qué hace

- **Admin/Profes** arman rutinas por alumno, organizadas en **bloques** (entrada en calor, potencia, fuerza…). Cada día tiene bloques; cada bloque tiene ejercicios; cada ejercicio trae un esquema `series×reps` precargado (ej `1x8 2x6 1x4`).
- **Alumnos** ven su rutina, miran el video de cada ejercicio y cargan **solo el peso** de cada grupo de reps. Generan métricas.
- Ejercicios clasificados por **categoría muscular** (piernas, hombros, espalda, pecho…), con **video** (URL externa o archivo subido).

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React + Vite, React Router, React Query, Recharts, PWA (`vite-plugin-pwa`) |
| Backend | Node.js + Express (API REST) |
| DB | PostgreSQL (driver `pg` + migraciones) |
| Auth | JWT + `bcrypt` |
| Uploads | `multer` → storage local en `server/uploads/`, servido estático |
| Deploy | VPS único: Nginx (proxy + estáticos + `/uploads`) + Postgres local + Node (`pm2`/`systemd`) + TLS (Certbot) |

Alcance: **un solo gimnasio** (no multi-tenant).

## Roles

- **admin** — todo: gestiona profes, alumnos, catálogo y rutinas.
- **profesor** — crea/edita alumnos, arma y asigna rutinas, gestiona catálogo de ejercicios. No gestiona otros profes.
- **alumno** — ve solo su(s) rutina(s), reproduce videos, y **solo edita el peso** de sus ejercicios. No crea ni borra estructura.

Alta de usuarios: **solo admin/profe** crean alumnos (sin auto-registro). Detalle en [docs/ROLES.md](docs/ROLES.md).

## Modelo de datos (jerarquía)

```
routine → routine_days → routine_blocks → routine_exercises → prescribed_sets → weight_entries
```

- `prescribed_sets` = filas por grupo de reps (`1x8`, `2x6`, `1x4`). Las define el profe.
- `weight_entries` = peso que carga el alumno por grupo de reps y fecha. Base de todas las métricas.

Esquema completo en [docs/DATA_MODEL.md](docs/DATA_MODEL.md).

## Estructura del repo

```
migim/
├── CLAUDE.md
├── docs/            ARCHITECTURE, DATA_MODEL, API, ROLES, ROADMAP
├── server/          Node + Express + Postgres
│   ├── src/{db,middleware,modules,config}/
│   └── uploads/     videos subidos (local)
└── client/          React + Vite (PWA)
    └── src/{api,auth,pages,components,pwa}/
```

## Comandos

```bash
# server
cd server && npm install
npm run migrate        # migraciones DB
npm run seed           # seed block_types + categorías + admin inicial (admin@migim.com / changeme123)
npm run migrate:seed   # migrate + seed en un paso
npm run dev            # API en desarrollo (nodemon)
npm start              # API en producción

# client
cd client && npm install
npm run dev            # Vite dev server (proxy a localhost:3001)
npm run build          # build PWA de producción → dist/
npm run preview        # preview del build de producción

# pm2 (producción)
pm2 start ecosystem.config.js --env production
pm2 restart migim-api
pm2 logs migim-api
```

## Convenciones

- Módulos backend: cada uno con `routes` + `controller` + `service` en `server/src/modules/<mod>/`.
- Autorización: middleware por rol en cada endpoint + chequeo de ownership (alumno solo toca sus propios `weight_entries`).
- Validación de input con `zod`/`joi` en la capa de routes.
- Nombres de tablas/columnas en `snake_case`; entidades en español según dominio (rutina, ejercicio, alumno).

## Documentación

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — capas, decisiones técnicas, deploy.
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — ERD + esquema SQL + métricas.
- [docs/API.md](docs/API.md) — endpoints REST.
- [docs/ROLES.md](docs/ROLES.md) — matriz de permisos.
- [docs/ROADMAP.md](docs/ROADMAP.md) — fases de implementación + mejoras futuras.
- [docs/DEPLOY.md](docs/DEPLOY.md) — guía de deploy en VPS (Nginx + Certbot + pm2 + Postgres).

## Archivos de deploy

- `nginx.conf` — virtual host Nginx (copiar a `/etc/nginx/sites-available/migim`, reemplazar dominio).
- `ecosystem.config.js` — config pm2 para la API Node.
