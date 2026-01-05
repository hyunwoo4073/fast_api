from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from todo import todo_router

app = FastAPI()
templates = Jinja2Templates(directory="templates")

@app.get("/")
async def welcome(request: Request):
    # return {
    #     "message": "Hello World"
    # }
    return templates.TemplateResponse("home.html", {"request": request})

# include_router()
# include_router(router1, router2, ...) 메서드는 APIRouter 클래스로 정의한 라우트를 메인 애플리케이션의 인스턴스로 추가
# 이렇게 하면 라우트를 전체 애플리케이션에서 사용할 수 있음
app.include_router(todo_router)