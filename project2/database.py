# import contextlib

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./myapi.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# @contextlib.contextmanager
# FastAPI는 제너레이터 기반 함수를 직접 지원하며, 자동으로 리소스 관리를 처리
# 그러나 @contextlib.contextmanager를 사용하면 get_db 함수가 contextlib._GeneratorContextManager 객체를 반환하게 되어 FastAPI의 종속성 주입이 제대로 동작하지 않음
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()