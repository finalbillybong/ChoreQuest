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
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

RUN mkdir -p /app/data && chown -R appuser:appuser /app

EXPOSE 8122

ENTRYPOINT ["./entrypoint.sh"]
