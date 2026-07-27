# Roadmap — Migim

## Fases de implementación (MVP)

1. **Fundaciones**
   - Scaffolding `server/` (Express) y `client/` (Vite + React).
   - Conexión Postgres, sistema de migraciones, seed de `block_types` + categorías + usuario admin inicial.
   - Auth JWT + `bcrypt`, middleware de roles, pantalla de login.

2. **Gestión de usuarios**
   - CRUD de alumnos (admin/profe) y profes (admin).
   - Baja lógica (`activo`). Pantallas de alta/listado.

3. **Catálogo**
   - CRUD de categorías y ejercicios.
   - Videos: URL externa + upload de archivo (`multer` → `uploads/`), reproductor en cliente.

4. **Constructor de rutinas** (UI profe)
   - Crear rutina por alumno (semanal/mensual).
   - Armar días → bloques (tipo del catálogo) → ejercicios → `prescribed_sets` (`1x8 2x6 1x4`).

5. **Vista y carga del alumno**
   - Ver rutina del día con video + esquema.
   - Cargar peso por grupo de reps (fecha default hoy), editar propios.

6. **Métricas**
   - Endpoints de progreso, volumen, PRs, asistencia.
   - Gráficos con Recharts en panel de alumno y profe.

7. **PWA + deploy VPS**
   - Manifest + service worker (instalable, caché básico).
   - Nginx (proxy + estáticos + `/uploads`) + Postgres + `pm2`/`systemd` + TLS (Certbot).
   - Backups (`pg_dump` + `uploads/`).

## Mejoras futuras (post-MVP)

- **Multi-gimnasio (multi-tenant)**: aislar profes/alumnos/rutinas por gym.
- **App móvil nativa**: React Native/Flutter para mejor experiencia en el gym (cámara, offline pleno).
- **Notificaciones push**: avisos de PR superado, recordatorios de entrenamiento.
- **Plantillas de rutina reutilizables**: clonar/base para armar rutinas más rápido.
- **Exportar métricas**: PDF/CSV para el alumno o el profe.
- **Chat profe ↔ alumno**: feedback sobre la rutina.
- **Modo offline completo**: cargar pesos sin conexión y sincronizar luego.
- **Biblioteca de videos propia**: storage en S3/Cloudinary + transcoding si el uso de video escala.
- **Carga de peso asistida por profe**: permitir que el profe registre pesos por el alumno (hoy fuera de alcance).
- **RIR/RPE y tempo**: métricas de esfuerzo percibido y control de tempo por serie.

## Deuda / decisiones a revisar

- JWT stateless sin revocación: si se necesita logout forzado del lado servidor, migrar a sesiones o blacklist de tokens.
- Storage local de videos: migrar a object storage cuando el volumen/ancho de banda lo justifique.
- Constraint `UNIQUE(prescribed_set_id, alumno_id, fecha)`: validar en uso real si un alumno necesita más de un registro por grupo/día.
