# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime
FROM python:3.12-slim
WORKDIR /app

RUN groupadd -g 1000 appuser && useradd -u 1000 -g appuser -m appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./static/

# Create entrypoint inline (avoids COPY failures when build context is sparse)
RUN printf '#!/bin/bash\nset -e\nDATA_DIR="/app/data"\nmkdir -p "$DATA_DIR/uploads"\nif su -s /bin/sh appuser -c "test -w $DATA_DIR" 2>/dev/null; then\n  echo "Running as appuser (UID 1000)"\n  exec su -s /bin/sh appuser -c "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8122"\nelse\n  echo "WARNING: $DATA_DIR is not writable by appuser, running as root"\n  exec python -m uvicorn backend.main:app --host 0.0.0.0 --port 8122\nfi\n' > entrypoint.sh && chmod +x entrypoint.sh

RUN mkdir -p /app/data && chown -R appuser:appuser /app

EXPOSE 8122

ENTRYPOINT ["./entrypoint.sh"]
