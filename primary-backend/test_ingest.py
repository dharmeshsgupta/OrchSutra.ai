import asyncio
from src.db.config import async_session
from src.modules.rankings.ingestion import run_daily_ingestion

async def run():
    print("Connecting to DB...")
    async with async_session() as db:
        print("Running ingestion...")
        await run_daily_ingestion(db)
        print("Ingestion done.")

if __name__ == "__main__":
    asyncio.run(run())