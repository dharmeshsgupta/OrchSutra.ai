# ─────────────────────────────────────────────────────────────
#  PRIMARY BACKEND ── FastAPI (port 3001)
#  This service handles: auth, user data, PostgreSQL,
#  Firebase integration, and all app modules.
# ─────────────────────────────────────────────────────────────

FROM python:3.11-slim

# Install system dependencies needed by some Python packages.
#   - gcc, libpq-dev  → needed by asyncpg (PostgreSQL driver)
#   - build-essential → C compiler for packages with C extensions
# After installing Python packages, we remove these build tools
# to keep the image small (this is called a "cleanup step").
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
#   ↑ rm -rf /var/lib/apt/lists/*  deletes the package manager cache
#     so Docker doesn't include it in the final image.

WORKDIR /app

# Copy and install requirements first (cache optimization)
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout=300 --retries=5 -r requirements.txt

# Copy source code and config files
COPY src/ ./src/
COPY .env .

# Firebase service account key (needed by firebase-admin SDK)
# IMPORTANT: In production, mount this as a Docker secret instead!
COPY openrouter-51e78-firebase-adminsdk-fbsvc-a8d3902ad5.json .

EXPOSE 3001

# Entry point: src/apps.py contains the FastAPI app object
CMD ["python", "-m", "uvicorn", "src.apps:app", "--host", "0.0.0.0", "--port", "3001"]
