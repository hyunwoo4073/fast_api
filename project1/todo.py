from fastapi import APIRouter, Path, HTTPException, status, Request, Depends
from fastapi.templating import Jinja2Templates
from model import Todo, TodoItem, TodoItems

todo_router = APIRouter()

todo_list = []

templates = Jinja2Templates(directory="templates/")

# @todo_router.post("/todo", status_code=201)
# async def add_todo(todo: Todo) -> dict:
#     todo_list.append(todo)
#     return {
#         "message": "Todo added successfully"
#     }
@todo_router.post("/todo")
async def add_todo(request: Request, todo: Todo = Depends(Todo.as_form)):
    todo.id = len(todo_list) + 1
    todo_list.append(todo)
    return templates.TemplateResponse("todo.html",
    {
        "request": request,
        "todos": todo_list
    })

# @todo_router.get("/todo", response_model=TodoItems)
# async def retrieve_todos() -> dict:
#     return {
#         "todos": todo_list
#     }
@todo_router.get("/todo", response_model=TodoItems)
async def retrieve_todos(request: Request):
    return templates.TemplateResponse("todo.html", {
        "request": request,
        "todos": todo_list
    })

# Path(..., kwargs)
# Path 클래스는 첫 인수롤 None 또는 ...을 받을 수 있음
# 첫 번째 인수가 ...이면 경로 매개변수를 반드시 지정해야 함
# 또한 경로 매개변수가 숫자이면 수치 검증을 위한 인수를 지정할 수 있음
# 예를 들어 gt(greater than, ~ 보다 큰), le(less than, ~보다 작은)와 같은 검증 기호를 사용할 수 있음
# 이를 통해 경로 매개변수에 사용된 값이 특정 범위에 있는 숫자인지 검증 가능
# @todo_router.get("/todo/{todo_id}")
# async def get_single_todo(todo_id: int = Path(..., title="The ID of the todo to retrieve.")) -> dict:
#     for todo in todo_list:
#         if todo.id == todo_id:
#             return {
#                 "todo": todo
#             }
#     # return {
#     #     "message": "Todo with supplied ID doesn't exist."
#     # }
#     raise HTTPException(
#         status_code=status.HTTP_404_NOT_FOUND,
#         detail="Todo with supplied ID doesn't exist",
#     )
@todo_router.get("/todo/{todo_id}")
async def get_single_todo(request: Request, todo_id: int = Path(..., title="The ID of the todo to retrieve.")) -> dict:
    for todo in todo_list:
        if todo.id == todo_id:
            return templates.TemplateResponse(
                "todo.html", {
                "request": request,
                "todo": todo
                })
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Todo with supplied ID doesn't exist",
    )


@todo_router.put("/todo/{todo_id}")
async def update_todo(todo_data: TodoItem, todo_id: int = Path(..., title="The ID of the todo to be updated.")) -> dict:
    for todo in todo_list:
        if todo.id == todo_id:
            todo.item = todo_data.item
            return {
                "message": "Todo updated successfully."
            }
    # return {
    #     "message": "Todo with supplied ID doesn't exist."
    # }
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Todo with supplied ID doesn't exist",
    )

@todo_router.delete("/todo/{todo_id}")
async def delete_single_todo(todo_id: int) -> dict:
    for index in range(len(todo_list)):
        todo = todo_list[index]
        if todo.id == todo_id:
            todo_list.pop(index)
            return {
                "message": "Todo deleted successfully"
            }
    # return {
    #     "message": "Todo with supplied ID doesn't exit."
    # }
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Todo with supplied ID doesn't exist",
    )

@todo_router.delete("/todo")
async def delete_all_todo() -> dict:
    todo_list.clear()
    return {
        "message": "Todos deleted successfully."
    }