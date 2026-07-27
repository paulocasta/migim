# Arquitectura — Migim

## Visión general

App web SPA + API REST + PostgreSQL, todo desplegado en un único VPS. Cliente responsive/PWA instalable para uso en el gimnasio desde el celular; profes/admin trabajan cómodo desde compu.

```
┌─────────────┐      HTTPS       ┌──────────────────────────────┐
│  Navegador  │  ───────────────▶│           Nginx              │
│ (React PWA) │                  │  - estáticos del client      │
└─────────────┘                  │  - /uploads (videos)         │
                                 │  - proxy /api → Node          │
                                 └──────────────┬───────────────┘
                                                │
                                     ┌──────────▼──────────┐
                                     │   Node + Express    │
                                     │  (API REST, JWT)    │
                                     └──────────┬──────────┘
                                                │
                                     ┌──────────▼──────────┐
                                     │     PostgreSQL      │
                                     └─────────────────────┘
```

## Capas del backend

Cada módulo en `server/src/modules/<mod>/` sigue el patrón **routes → controller → service → db**:

- **routes**: define endpoints, aplica middleware de auth/roles y validación de input (`zod`/`joi`).
- **controller**: traduce HTTP ↔ dominio, maneja códigos de estado.
- **service**: lógica de negocio (reglas de ownership, cálculos, transacciones).
- **db**: queries SQL parametrizadas vía `pg`.

Módulos: `auth`, `users`, `categories`, `exercises`, `routines`, `metrics`.

Middleware transversal (`server/src/middleware/`):
- `auth` — verifica JWT, inyecta `req.user`.
- `roles` — `requireRole('admin'|'profesor'|'alumno')` + chequeo de ownership.
- `upload` — `multer` para videos a `server/uploads/`.
- `errorHandler` — respuestas de error consistentes.

## Capas del frontend

`client/src/`:
- `api/` — cliente HTTP (axios) con interceptor que agrega el JWT; hooks de React Query por recurso.
- `auth/` — contexto de sesión, `ProtectedRoute` por rol, persistencia de token.
- `pages/` — login, dashboards (admin/profe), constructor de rutinas, vista de rutina del alumno, catálogo de ejercicios, panel de métricas.
- `components/` — bloques, tarjetas de ejercicio, reproductor de video, formularios de peso, gráficos (Recharts).
- `pwa/` — `manifest.json`, service worker (via `vite-plugin-pwa`) para instalación y caché offline básico.

## Autenticación y autorización

- Login → API valida credenciales (`bcrypt`) → emite **JWT** con `{ userId, role }`.
- Cada request lleva `Authorization: Bearer <token>`.
- Autorización en dos niveles: por **rol** (qué endpoints) y por **ownership** (un alumno solo accede a sus rutinas y edita sus propios `weight_entries`).
- Ver matriz completa en [ROLES.md](ROLES.md).

## Videos

Dos fuentes por ejercicio (columnas `video_url` y `video_file_path`, ambas opcionales):
- **URL externa**: YouTube/Vimeo, se embebe en el cliente. Cero storage.
- **Archivo subido**: `multer` guarda en `server/uploads/`, Nginx lo sirve como estático. Se guarda la ruta relativa en `video_file_path`.

## Deploy en VPS

- **Nginx**: reverse proxy a Node (`/api`), sirve el build del client y `/uploads`, termina TLS.
- **Node**: proceso gestionado por `pm2` o unidad `systemd`, reinicio automático.
- **PostgreSQL**: instancia local en el mismo VPS.
- **TLS**: certificados Let's Encrypt vía Certbot con renovación automática.
- **Opcional**: `docker-compose` (postgres + api + nginx) para reproducibilidad.
- **Backups**: `pg_dump` periódico + copia de `server/uploads/`.

## Decisiones técnicas

- **REST sobre GraphQL**: dominio acotado, CRUD claro; menos complejidad.
- **Postgres**: relaciones fuertes (jerarquía rutina→…→weight_entries) y agregaciones para métricas.
- **JWT stateless**: simple para un solo servidor; si se necesita revocación futura, migrar a sesiones o blacklist.
- **Storage local de videos**: coherente con "todo en un VPS"; migrable a S3/Cloudinary si escala (ver [ROADMAP.md](ROADMAP.md)).
