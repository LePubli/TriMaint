FROM python:3.11-slim

WORKDIR /app

# Install system deps required for psycopg2 and cryptography wheels
# (libpq pour psycopg2-binary runtime, pas pour la compilation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x entrypoint.sh && mkdir -p /data/uploads

# Healthcheck via l'endpoint /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/health || exit 1

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
