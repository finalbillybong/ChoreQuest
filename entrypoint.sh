#!/bin/bash
set -e

DATA_DIR="/app/data"

# Ensure data directory exists
mkdir -p "$DATA_DIR/uploads"

# Check if data dir is writable by appuser
if su -s /bin/sh appuser -c "test -w $DATA_DIR" 2>/dev/null; then
    echo "Running as appuser (UID 1000)"
    exec su -s /bin/sh appuser -c "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8122"
else
    echo "WARNING: $DATA_DIR is not writable by appuser, running as root"
    exec python -m uvicorn backend.main:app --host 0.0.0.0 --port 8122
fi
