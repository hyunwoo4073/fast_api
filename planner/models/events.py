from sqlmodel import JSON, SQLModel, Field, Column
from typing import List, Optional

class Event(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True) # 자동 생성되는 고유 식별자
    title: str # 이벤트 타이틀
    image: str # 이벤트 이미지 배너의 링크
    description: str # 이벤트 설명
    tags: List[str] = Field(sa_column=Column(JSON))# 그룹화를 위한 이벤트 태그
    location: str # 이벤트 위치

    class Config:
        arbitrary_types_allowed = True
        schema_extra = {
            "example": {
                "title": "FastAPI Book Launch",
                "image": "https://linktomyimage.com/image.png",
                "description": "We will be discussing the contents of the FastAPI book in this event. \
                Ensure to come with your own copy to win gifts!",
                "tags": ["python", "fastapi", "book", "launch"],
                "location": "Google Meet"
            }
        }

class EventUpdate(SQLModel):
    title: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    location: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "title": "FastAPI Book Launch",
                "image": "https://linktomyimage.com/image.png",
                "description": "We will be discussing the contents of the FastAPI book in this event. \
                Ensure to come with your own copy to win gifts!",
                "tags": ["python", "fastapi", "book", "launch"],
                "location": "Google Meet"
            }
        }