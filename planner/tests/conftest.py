import asyncio
import httpx
import pytest
from httpx import ASGITransport
import pytest_asyncio

from main import app
from database.connection import Settings
from models.events import Event
from models.users import User

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    # loop = asyncio.get_event_loop()
    yield loop
    loop.close()

async def init_db():
    test_settings = Settings()
    test_settings.DATABASE_URL = "mongodb://localhost:27017/testdb"

    await test_settings.initialize_database()

@pytest_asyncio.fixture(scope="function")
async def default_client():
    await init_db()
    # async with httpx.AsyncClient(app=app,base_url="http://app") as client:
    #     yield client
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport,base_url="http://app") as client:
        yield client
    # 리소스 정리
        await Event.find_all().delete()
        await User.find_all().delete()