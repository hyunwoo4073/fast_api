from pydantic import BaseModel, EmailStr
from typing import Optional, List
from models.events import Event
from beanie import Document, Link

class User(Document):
    email: EmailStr # 사용자 이메일
    password: str # 사용자 패스워드
    events: Optional[List[Event]] = None # 해당 사용자가 생성한 이벤트, 처음에는 비어 있음

    class Settings:
        name = "users"
        
    class Config:
        schema_extra = {
            "example": {
                "email": "fastapi@packt.com",
                "username": "strong!!!",
                "events": [],
            }
        }

class UserSignIn(BaseModel):
    email: EmailStr
    password: str

    class Config:
        schema_extra = {
            "example": {
                "email": "fastapi@packt.com",
                "password": "strong!!!",
            }
        }