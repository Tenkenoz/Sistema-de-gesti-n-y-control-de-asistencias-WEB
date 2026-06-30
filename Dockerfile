# =============================================================================
#  TransControl — Imagen única (PostgreSQL + FastAPI + Nginx)
#  Un solo contenedor, todos los servicios gestionados por supervisord
# =============================================================================
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PGDATA=/var/lib/postgresql/data

# ── 1. Dependencias del sistema ───────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    gnupg curl ca-certificates lsb-release \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
       | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] \
       https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
       > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y --no-install-recommends \
    postgresql-17 \
    python3 python3-pip python3-venv \
    libpq-dev gcc \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# ── 2. Backend (FastAPI) ──────────────────────────────────────────────────────
WORKDIR /app/backend
COPY Backend/requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt
COPY Backend/ .

# ── 3. Frontend (archivos estáticos → Nginx) ──────────────────────────────────
COPY Frontend/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default

# ── 4. Base de datos (script de inicialización) ───────────────────────────────
RUN mkdir -p /docker-entrypoint-initdb.d
COPY init.sql /docker-entrypoint-initdb.d/01-init.sql

# ── 5. Variables de entorno del backend ───────────────────────────────────────
ENV DATABASE_URL=postgresql+psycopg://transuser:nueva_password@127.0.0.1:5432/transcontrol \
    SECRET_KEY=CAMBIA_ESTA_CLAVE_EN_PRODUCCION_debe_tener_64_chars_minimo \
    ALGORITHM=HS256 \
    ACCESS_TOKEN_EXPIRE_MINUTES=60 \
    APP_NAME=TransControl \
    DEBUG=false \
    UPLOAD_DIR=uploads \
    MAX_FILE_SIZE_MB=10

# ── 6. Supervisord ────────────────────────────────────────────────────────────
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# ── 7. Entrypoint ────────────────────────────────────────────────────────────
COPY entrypoint.sh /entrypoint.sh
# Convertir line-endings de Windows a Unix (por si se editó en Windows)
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

# ── 8. Volumen y puertos ──────────────────────────────────────────────────────
VOLUME ["/var/lib/postgresql/data", "/app/backend/uploads"]

EXPOSE 80 8000

ENTRYPOINT ["/entrypoint.sh"]
