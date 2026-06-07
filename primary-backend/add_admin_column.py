import asyncio
from sqlalchemy import text
from src.db.config import engine

async def add_column():
    print("Connecting to the database...")
    async with engine.begin() as conn:
        try:
            print("Adding is_admin column to users table if it doesn't exist...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;"))
            print("Successfully added is_admin column.")
        except Exception as e:
            print(f"Error adding column (it may already exist or table doesn't exist): {e}")

if __name__ == "__main__":
    asyncio.run(add_column())
