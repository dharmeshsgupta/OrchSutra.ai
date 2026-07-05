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
from src.modules.admin.router import router as admin_router

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
        print(f"[WARNING] Firebase init skipped (set FIREBASE_SERVICE_ACCOUNT_KEY): {e}")

    # 2. Create all tables
    await init_db()
    print("[INFO] Database tables ready")

    # 3. Seed initial data
    async with async_session() as db:
        await seed_database(db)

    # 4. Ensure initial ranking snapshots exist
    async with async_session() as db:
        snapshot_count = await db.scalar(select(func.count()).select_from(RankingSnapshot))
        if not snapshot_count:
            await run_daily_ingestion(db)
            print("[INFO] Initial ranking snapshot ingestion completed")
        else:
            today = datetime.utcnow().date()
            today_count = await db.scalar(
                select(func.count()).select_from(RankingSnapshot).where(RankingSnapshot.snapshot_date == today)
            )
            if not today_count:
                await run_daily_ingestion(db, snapshot_date=today)
                print("[INFO] Today's ranking snapshot ingestion completed")

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
    print("[INFO] Daily ranking ingestion scheduler started (01:00)")

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
        # ── Docker production (Nginx serves React on port 80) ──
        # LESSON: In Docker, the frontend is at http://localhost (no port = port 80)
        # The browser sends requests FROM this origin → backend must allow it.
        # Without this, all OPTIONS preflight requests return 400!
        "http://localhost",
        "http://127.0.0.1",
        # ── Local development (Vite dev server) ──
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
        # ── Deployed Vercel URLs ──
        "https://orchsutra-ai.vercel.app",
        "https://dashboard-frontend-eta-ruddy.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
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
app.include_router(admin_router)

# Serve generated media artifacts (e.g. TTS audio files)
audio_files_dir = Path(__file__).resolve().parent.parent / "static" / "audio"
audio_files_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media/audio/files", StaticFiles(directory=str(audio_files_dir)), name="media-audio-files")


# ─────────────────────────────────────────────────────────────────────────────
#  ADMIN: Backfill historical ranking data
#
#  LESSON: Why does the chart only show one date?
#  Because we only started running TODAY. The scheduler saves one snapshot/day.
#  To show a date-wise chart, we need data for multiple past dates.
#
#  This endpoint backfills the last N days of ranking data in one shot.
#  Call it ONCE after first deployment:
#    POST http://localhost:3001/admin/backfill-rankings?days=30
# ─────────────────────────────────────────────────────────────────────────────
from datetime import timedelta
from fastapi import BackgroundTasks


@app.post("/admin/backfill-rankings")
async def backfill_rankings(background_tasks: BackgroundTasks, days: int = 65):
    # days=65 covers: today + 64 past days
    # June 4 (today) + all of May (31 days) + April 5–30 (26 days) + some March = 65 days total
    # This gives the chart ~65 data points across 3 calendar months!
    """
    Backfill ranking snapshots for the past N days.
    Applies realistic growth variation per date so the chart doesn't look flat.
    Runs in the background so the request returns immediately.
    """
    import random

    async def _do_backfill(days: int):
        today = datetime.utcnow().date()
        print(f"🔄 Starting ranking backfill for {days} days...")

        # Fetch REAL data once (from live APIs)
        from src.modules.rankings.ingestion import fetch_external_llm_data, run_daily_ingestion
        from src.db.models import RankingSnapshot
        from sqlalchemy import delete

        real_data = await fetch_external_llm_data()

        success = 0
        failed = 0

        # LESSON: range(days, -1, -1) means:
        #   i goes from `days` DOWN TO 0 (inclusive)
        #   i=days → oldest date (e.g. April 1)
        #   i=0    → today (June 4) ← was missing before!
        for i in range(days, -1, -1):  # oldest → newest, INCLUDING today (i=0)
            target_date = today - timedelta(days=i)

            # LESSON: Growth multiplier
            # Older dates get smaller values to simulate natural growth over time.
            # days_ago=30 → multiplier≈0.85 (15% smaller than today)
            # days_ago=1  → multiplier≈0.99 (almost same as today)
            # We add small random noise (±2%) per item for natural chart variation.
            days_ago = i
            base_growth = 0.85 + (0.15 * (days - days_ago) / days)  # 0.85 → 1.00

            try:
                async with async_session() as db:
                    # Delete old data for this date
                    await db.execute(
                        delete(RankingSnapshot).where(
                            RankingSnapshot.snapshot_date == target_date
                        )
                    )

                    total_inserted = 0
                    for chart_key, items in real_data.items():
                        for idx, item in enumerate(items):
                            # Use date+item as seed so same date = same variation (reproducible)
                            rng = random.Random(f"{target_date}-{item['id']}")
                            noise = rng.uniform(0.96, 1.04)  # ±4% random noise
                            adjusted_value = max(1, int(item["value"] * base_growth * noise))

                            total_value = sum(x["value"] for x in items)
                            share_percent = (adjusted_value / total_value * 100) if total_value else 0

                            snapshot = RankingSnapshot(
                                snapshot_date=target_date,
                                chart_key=chart_key,
                                item_id=item["id"],
                                item_name=item["name"],
                                subtitle=item.get("subtitle"),
                                value=adjusted_value,
                                share_percent=round(share_percent, 2),
                                color=item.get("color", "#9ca3af"),
                                source="backfill",
                            )
                            db.add(snapshot)
                            total_inserted += 1

                    await db.commit()
                    success += 1
                    print(f"  ✅ {target_date} — {total_inserted} snapshots (growth: {base_growth:.2f}x)")

            except Exception as e:
                failed += 1
                print(f"  ❌ {target_date}: {e}")

        print(f"🏁 Backfill complete: {success} success, {failed} failed")

    background_tasks.add_task(_do_backfill, days)
    return {
        "message": f"Backfill started for {days} days with growth simulation. Check server logs.",
        "status": "running_in_background"
    }
