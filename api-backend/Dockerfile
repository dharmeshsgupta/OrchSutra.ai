# ─────────────────────────────────────────────────────────────
#  LESSON: What is a Dockerfile?
#  A Dockerfile is a recipe. Docker reads it top to bottom
#  and builds a "container image" — a portable box that
#  contains your app + everything it needs to run.
# ─────────────────────────────────────────────────────────────

# STEP 1 ── Choose a base image
#   Think of this as the "starting ingredient".
#   We pick an official Python 3.11 image that is "slim"
#   (smaller size, only bare essentials included).
FROM python:3.11-slim

# STEP 2 ── Set the working directory INSIDE the container
#   This is like doing  cd /app  inside the container.
#   All future commands run from this folder.
WORKDIR /app

# STEP 3 ── Copy requirements first (smart caching trick!)
#   Why copy requirements BEFORE the source code?
#   Docker caches each step. If requirements.txt doesn't change,
#   Docker skips re-installing packages — saving you time!
COPY requirements.txt .

# STEP 4 ── Install Python dependencies
#   --no-cache-dir  → don't save download cache (keeps image small)
RUN pip install --no-cache-dir -r requirements.txt

# STEP 5 ── Copy your application source code into the container
COPY src/ ./src/

# STEP 6 ── Copy the .env file (API keys, settings)
#   NOTE: In production you should use Docker secrets or
#   environment variables instead of copying .env files.


# STEP 7 ── Tell Docker which port this service listens on
#   This is just documentation — it doesn't open the port by itself.
#   The actual port mapping happens in docker-compose.yml
EXPOSE 3000

# STEP 8 ── The command to START your application
#   This runs when the container starts.
#   --host 0.0.0.0  → listen on ALL network interfaces (required in Docker)
#   --port 3000     → the port your FastAPI app uses
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "3000"]
