from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, func
from datetime import datetime

load_dotenv()

# Import the routers from your respective modules
from src.modules.apiKeys import router as api_keys_router
from src.modules.auth import router as auth_router
from src.modules.models import router as models_router
from src.modules.payments import router as payments_router
from src.modules.rankings import router as rankings_router
from src.modules.chat.router import router as chat_router
from src.modules.media.router import router as media_router

from src.db.config import init_db, async_session
from src.db.seed import seed_database
from src.firebase_init import init_firebase
from src.db.models import RankingSnapshot
from src.modules.rankings.ingestion import run_daily_ingestion


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init Firebase, create tables, seed data."""
    # 1. Firebase Admin SDK
    try:
        init_firebase()
    except Exception as e:
        print(f"⚠️  Firebase init skipped (set FIREBASE_SERVICE_ACCOUNT_KEY): {e}")

    # 2. Create all tables
    await init_db()
    print("✅ Database tables ready")

    # 3. Seed initial data
    async with async_session() as db:
        await seed_database(db)

    # 4. Ensure initial ranking snapshots exist
    async with async_session() as db:
        snapshot_count = await db.scalar(select(func.count()).select_from(RankingSnapshot))
        if not snapshot_count:
            await run_daily_ingestion(db)
            print("✅ Initial ranking snapshot ingestion completed")
        else:
            today = datetime.utcnow().date()
            today_count = await db.scalar(
                select(func.count()).select_from(RankingSnapshot).where(RankingSnapshot.snapshot_date == today)
            )
            if not today_count:
                await run_daily_ingestion(db, snapshot_date=today)
                print("✅ Today's ranking snapshot ingestion completed")

    # 5. Start daily scheduler for ranking ingestion
    scheduler = AsyncIOScheduler()

    async def daily_ingestion_job() -> None:
        async with async_session() as db:
            await run_daily_ingestion(db)

    scheduler.add_job(
        daily_ingestion_job,
        trigger=CronTrigger(hour=1, minute=0),
        id="daily_rankings_ingestion",
        replace_existing=True,
    )
    scheduler.start()
    app.state.scheduler = scheduler
    print("✅ Daily ranking ingestion scheduler started (01:00)")

    yield  # app runs here

    # Shutdown
    scheduler = getattr(app.state, "scheduler", None)
    if scheduler:
        scheduler.shutdown(wait=False)


# Initialize the main FastAPI app
app = FastAPI(title="Primary Backend App", lifespan=lifespan)

# Add CORS middleware FIRST, before including routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174", 
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the routers (equivalent to Elysia's .use())
app.include_router(api_keys_router)
app.include_router(auth_router)
app.include_router(models_router)
app.include_router(payments_router)
app.include_router(rankings_router)
app.include_router(chat_router)
app.include_router(media_router)

# Serve generated media artifacts (e.g. TTS audio files)
audio_files_dir = Path(__file__).resolve().parent.parent / "static" / "audio"
audio_files_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media/audio/files", StaticFiles(directory=str(audio_files_dir)), name="media-audio-files")