from pydantic import BaseModel
from fastapi import Form
from typing import List, Optional

# pydantic은 파이썬의 타입 어노테이션을 사용해서 데이터를 검증하는 파이썬 라이브러리
class Todo(BaseModel):
    id: Optional[int] = None
    item: str

    @classmethod
    def as_form(cls, item: str = Form(...)):
        return cls(item=item)

    class Config:
	    schema_extra = {
		    "example": {
			    "id": 1,
			    "item": "Example Schema!"
			   }
			}

class TodoItem(BaseModel):
    item: str

    class Config:
        schema_extra = {
            "example": {
            "item": "Read the next chapter of the book."
            }
        }

class TodoItems(BaseModel):
    todos: List[TodoItem]

    class Config:
        schema_extra = {
            "example": {
                "todos": [
                    {
                        "item": "Example schema 1!"
                    },
                    {
                        "item": "Example schema 2!"
                    }
                ]
            }
        }