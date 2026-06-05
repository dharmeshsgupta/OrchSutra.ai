import asyncio
import sys
from sqlalchemy import text
from src.db.config import engine

async def make_admin(email: str):
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email})
        user = result.fetchone()
        
        if not user:
            print(f"Error: User with email {email} not found.")
            return

        await conn.execute(text("UPDATE users SET is_admin = TRUE WHERE email = :email"), {"email": email})
        print(f"Success! User {email} has been promoted to Admin.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py <email>")
        sys.exit(1)
        
    email = sys.argv[1]
    asyncio.run(make_admin(email))
