import httpx
import pytest
import pytest_asyncio

from auth.jwt_handler import create_access_token
from models.events import Event

@pytest.fixture(scope="module")
async def access_token() -> str:
    return create_access_token("testuser@packt.com")

@pytest.fixture(scope="function")
async def mock_event() -> Event:
    new_event = Event(
        creator="testuser@packt.com",
        title="FastAPI Book Launch",
        image="https:..linktomyimage.com/image.png",
        description="We will be discussing the contents of the FastAPI book in this event. Ensuer to come with your own copy to win gifts!",
        tags=["python", "fastapi", "book", "launch"],
        location="Google Meet"
    )

    await Event.insert_one(new_event)
    yield new_event
    # await new_event.create()
    # return new_event

@pytest.mark.asyncio
async def test_get_evnets(default_client: httpx.AsyncClient, mock_event: Event) -> None:
    response = await default_client.get("/event/")

    assert response.status_code == 200
    assert response.json()[0]["_id"] == str(mock_event.id)

@pytest.mark.asyncio
async def test_get_event(default_client: httpx.AsyncClient, mock_event: Event) -> None:
    url = f"/event/{str(mock_event.id)}"
    response = await default_client.get(url)
    assert response.status_code == 200
    assert response.json()["creator"] == mock_event.creator
    assert response.json()["_id"] == str(mock_event.id)

@pytest.mark.asyncio
async def test_post_event(default_client: httpx.AsyncClient, access_token: str) -> None:
    payload = {
        "title": "FastAPI Book Launch",
        "image": "https:..linktomyimage.com/image.png",
        "description": "We will be discussing the contents of the FastAPI book in this event. Ensuer to come with your own copy to win gifts!",
        "tags": ["python", "fastapi", "book", "launch"],
        "location": "Google Meet"
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }

    test_response = {
        "message": "Event created successfully."
    }

    response = await default_client.post("/event/new", json=payload, headers=headers)

    assert response.status_code == 200
    assert response.json() == test_response


@pytest_asyncio.fixture(scope="function")
async def two_events(default_client: httpx.AsyncClient):
    # setup: 이벤트 2개 생성
    e1 = Event(
        creator="testuser@packt.com",
        title="E1",
        image="https://example.com/1.png",
        description="d1",
        tags=["t1"],
        location="loc1",
    )
    e2 = Event(
        creator="testuser@packt.com",
        title="E2",
        image="https://example.com/2.png",
        description="d2",
        tags=["t2"],
        location="loc2",
    )

    await e1.create()
    await e2.create()

    yield [e1, e2]   #여기서 테스트 실행됨

    # teardown: 테스트 끝나면 자동 초기화
    await Event.find_all().delete()


@pytest.mark.asyncio
async def test_get_events_count(default_client: httpx.AsyncClient, two_events) -> None:
    response = await default_client.get("/event/")
    assert response.status_code == 200

    events = response.json()
    assert len(events) == 2

@pytest.mark.asyncio
async def test_update_event(default_client: httpx.AsyncClient, mock_event: Event, access_token: str) -> None:
    test_payload = {
        "title": "Updated FastAPI event"
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }

    url = f"/event/{str(mock_event.id)}"

    response = await default_client.put(url, json=test_payload, headers=headers)

    assert response.status_code == 200
    assert response.json()["title"] == test_payload["title"]
    # assert response.json()["title"] == "This test should fail"

@pytest.mark.asyncio
async def test_delete_event(default_client: httpx.AsyncClient, mock_event: Event, access_token: str) -> None:
    test_response = {
        "message": "Event deleted successfully."
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }

    url = f"/event/{mock_event.id}"

    response = await default_client.delete(url, headers=headers)

    assert response.status_code == 200
    assert response.json() == test_response

@pytest.mark.asyncio
async def test_get_event_again(default_client: httpx.AsyncClient, mock_event: Event) -> None:
    url = f"/event/{str(mock_event.id)}"
    response = await default_client.get(url)

    assert response.status_code == 200
    assert response.json()["creator"] == mock_event.creator
    assert response.json()["_id"] == str(mock_event.id)