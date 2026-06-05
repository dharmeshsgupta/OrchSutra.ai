# ─────────────────────────────────────────────────────────────
#  AGENT ENGINE ── FastAPI + LangChain + ChromaDB (port 3002)
#
#  LESSON: Why is this Dockerfile special?
#  sentence-transformers needs PyTorch.
#  By default pip downloads PyTorch WITH CUDA (GPU) support = ~2.5 GB!
#  But Docker Desktop runs on CPU — we don't need CUDA at all.
#  So we install the CPU-only PyTorch first = only ~250 MB (10x smaller!)
#  This makes the build MUCH faster and more reliable.
# ─────────────────────────────────────────────────────────────

FROM python:3.11-slim

# sentence-transformers and chromadb need these system libs
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# ── STEP 1: Install PyTorch CPU-only FIRST ──────────────────
#
#  LESSON: Why install torch separately before requirements.txt?
#
#  pip resolves ALL packages in requirements.txt together.
#  If torch is in requirements.txt, pip might pick the CUDA version
#  (with GPU drivers = 2.5 GB!) even on a CPU machine.
#
#  By installing torch with --index-url pointing to the CPU wheel,
#  we force pip to use the lightweight CPU build (~250 MB).
#  Then when requirements.txt installs sentence-transformers,
#  it sees torch is already installed and skips re-downloading it.
#
#  --timeout=300  → wait up to 5 minutes per package (slow internet)
#  --retries=5    → retry 5 times if connection drops
RUN pip install --no-cache-dir \
    --timeout=300 \
    --retries=5 \
    torch \
    --index-url https://download.pytorch.org/whl/cpu

# ── STEP 2: Install remaining requirements ───────────────────
#
#  Now install everything else.
#  torch is already cached from Step 1, so sentence-transformers
#  won't try to download a different (larger) version.
RUN pip install --no-cache-dir \
    --timeout=300 \
    --retries=5 \
    -r requirements.txt

# Copy source code and config
COPY src/ ./src/
COPY .env .
COPY openrouter-51e78-firebase-adminsdk-fbsvc-a8d3902ad5.json .

EXPOSE 3002

CMD ["python", "-m", "uvicorn", "src.engine.main:app", "--host", "0.0.0.0", "--port", "3002"]
