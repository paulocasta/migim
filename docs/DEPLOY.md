# Guía de deploy — VPS (Ubuntu 22.04)

## Requisitos

- VPS Ubuntu 22.04+ con acceso root/sudo
- Dominio apuntando al IP del VPS (A record)
- Puertos 80 y 443 abiertos en el firewall

---

## 1. Configuración inicial del VPS

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar dependencias
apt install -y nginx certbot python3-certbot-nginx git curl build-essential

# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# pm2 global
npm install -g pm2

# PostgreSQL 16
apt install -y postgresql postgresql-contrib
```

---

## 2. PostgreSQL — crear base de datos y usuario

```bash
sudo -u postgres psql <<SQL
CREATE USER migim_user WITH PASSWORD 'CAMBIAR_PASSWORD_SEGURO';
CREATE DATABASE migim OWNER migim_user;
GRANT ALL PRIVILEGES ON DATABASE migim TO migim_user;
SQL
```

---

## 3. Clonar el repositorio

```bash
mkdir -p /var/www/migim
cd /var/www/migim
git clone https://github.com/TU_USER/migim.git .

# Directorios necesarios
mkdir -p server/uploads
mkdir -p /var/log/migim
```

---

## 4. Variables de entorno del servidor

```bash
cp server/.env.example server/.env
nano server/.env
```

Completar:
```
PORT=3001
DATABASE_URL=postgresql://migim_user:CAMBIAR_PASSWORD_SEGURO@localhost:5432/migim
JWT_SECRET=GENERAR_SECRETO_LARGO_ALEATORIO   # openssl rand -hex 64
JWT_EXPIRES_IN=7d
UPLOADS_DIR=uploads
CLIENT_ORIGIN=https://TU_DOMINIO.com
```

---

## 5. Instalar dependencias del servidor

```bash
cd /var/www/migim/server
npm install --omit=dev
```

---

## 6. Ejecutar migraciones y seed

```bash
cd /var/www/migim/server
node src/db/migrate.js
node src/db/seed.js
```

Esto crea todas las tablas y el usuario admin inicial con `ADMIN_EMAIL` / `ADMIN_PASSWORD`
definidos en `server/.env` (obligatorios, password mín. 8 caracteres). Usar un password fuerte.

---

## 7. Íconos PWA — generar PNGs

El SVG fuente está en `client/public/icons/icon.svg`.
Generar los PNGs requeridos por el manifest:

```bash
# Opción A: con ImageMagick (más fácil)
apt install -y imagemagick librsvg2-bin
rsvg-convert -w 192 -h 192 client/public/icons/icon.svg > client/public/icons/icon-192.png
rsvg-convert -w 512 -h 512 client/public/icons/icon.svg > client/public/icons/icon-512.png

# Opción B: con sharp (Node)
npx sharp-cli --input client/public/icons/icon.svg --output client/public/icons/icon-192.png resize 192
npx sharp-cli --input client/public/icons/icon.svg --output client/public/icons/icon-512.png resize 512
```

---

## 8. Build del frontend

```bash
cd /var/www/migim/client
npm install
npm run build
# Resultado en client/dist/
```

---

## 9. Nginx — configurar virtual host

```bash
# Copiar la config incluida en el repo
cp /var/www/migim/nginx.conf /etc/nginx/sites-available/migim

# Editar el dominio real
nano /etc/nginx/sites-available/migim
# Reemplazar todas las apariciones de "migim.example.com" con tu dominio

# Habilitar sitio
ln -s /etc/nginx/sites-available/migim /etc/nginx/sites-enabled/migim
rm -f /etc/nginx/sites-enabled/default

# Verificar config
nginx -t
```

**Nota:** Comentar temporalmente el bloque `server` del puerto 443 hasta tener el certificado TLS.

```bash
systemctl reload nginx
```

---

## 10. TLS con Certbot

```bash
certbot --nginx -d TU_DOMINIO.com
```

Certbot modifica automáticamente nginx.conf con los paths del certificado y redirección HTTP→HTTPS.

```bash
# Renovación automática (viene con certbot, verificar)
systemctl status certbot.timer
```

---

## 11. Iniciar la API con pm2

```bash
cd /var/www/migim
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup   # seguir las instrucciones que imprime
```

Comandos útiles:
```bash
pm2 status          # ver estado
pm2 logs migim-api  # ver logs en tiempo real
pm2 restart migim-api
pm2 stop migim-api
```

---

## 12. Verificar deploy

```bash
# API health
curl https://TU_DOMINIO.com/api/health
# → {"status":"ok"}

# Login admin
curl -X POST https://TU_DOMINIO.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"TU_ADMIN_EMAIL","password":"TU_ADMIN_PASSWORD"}'
```

Abrir `https://TU_DOMINIO.com` en el browser y verificar:
- Login funciona
- PWA instalable (ícono en barra de direcciones Chrome/Edge)
- Videos se cargan desde `/uploads/`

---

## Actualizar la app (deploy nuevo)

```bash
cd /var/www/migim
git pull

# Si hay migraciones nuevas
cd server && node src/db/migrate.js && cd ..

# Rebuild frontend
cd client && npm run build && cd ..

# Reiniciar API
pm2 restart migim-api
```

---

## Backups PostgreSQL

```bash
# Backup manual
sudo -u postgres pg_dump migim | gzip > /backups/migim_$(date +%Y%m%d).sql.gz

# Cron diario a las 3am (crontab -e como root)
0 3 * * * sudo -u postgres pg_dump migim | gzip > /backups/migim_$(date +\%Y\%m\%d).sql.gz && find /backups -name "migim_*.sql.gz" -mtime +30 -delete
```

---

## Firewall (ufw)

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```
