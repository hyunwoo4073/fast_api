# import contextlib

from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from starlette.config import Config

config = Config('.env')
SQLALCHEMY_DATABASE_URL = config('SQLALCHEMY_DATABASE_URL')
# SQLALCHEMY_DATABASE_URL = "sqlite:///./myapi.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
naming_convention = {
    "ix": 'ix_%(column_0_label)s',
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(column_0_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}
Base.metadata = MetaData(naming_convention=naming_convention)

# @contextlib.contextmanager
# FastAPI는 제너레이터 기반 함수를 직접 지원하며, 자동으로 리소스 관리를 처리
# 그러나 @contextlib.contextmanager를 사용하면 get_db 함수가 contextlib._GeneratorContextManager 객체를 반환하게 되어 FastAPI의 종속성 주입이 제대로 동작하지 않음
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()