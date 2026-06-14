#!/bin/bash
set -e

PGDATA=/var/lib/postgresql/data

# ── Corregir permisos del volumen (Docker monta como root) ───────────────────
chown -R postgres:postgres "$PGDATA"
chmod 700 "$PGDATA"

# ── Inicializar PostgreSQL solo si no existe aún ─────────────────────────────
if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "🔧 Inicializando base de datos PostgreSQL..."
    su -s /bin/bash postgres -c "/usr/lib/postgresql/17/bin/initdb -D $PGDATA --encoding=UTF8 --locale=C"

    # Permitir conexiones locales con contraseña
    echo "host all all 127.0.0.1/32 md5" >> "$PGDATA/pg_hba.conf"

    # Arrancar postgres temporalmente para crear usuario y BD
    su -s /bin/bash postgres -c "/usr/lib/postgresql/17/bin/pg_ctl start -D $PGDATA -w -o '-c listen_addresses=localhost'"

    # Crear usuario, base de datos e importar schema
    su -s /bin/bash postgres -c "psql -c \"CREATE USER transuser WITH PASSWORD 'nueva_password';\""
    su -s /bin/bash postgres -c "psql -c \"CREATE DATABASE transcontrol OWNER transuser;\""
    su -s /bin/bash postgres -c "psql -d transcontrol -f /docker-entrypoint-initdb.d/01-init.sql"

    # Detener postgres (supervisord lo arrancará de nuevo)
    su -s /bin/bash postgres -c "/usr/lib/postgresql/17/bin/pg_ctl stop -D $PGDATA -m fast"
    echo "✅ Base de datos inicializada correctamente"
fi

# ── Asegurar directorio de uploads ───────────────────────────────────────────
mkdir -p /app/backend/uploads
chmod 777 /app/backend/uploads

# ── Arrancar todos los servicios con supervisord ─────────────────────────────
echo "🚀 Arrancando servicios (PostgreSQL + FastAPI + Nginx)..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
