from passlib.context import CryptContext
# import hashlib

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class HashPassword:
    def create_hash(self, password: str):
        # digest = hashlib.sha256(password.encode("utf-8")).digest()
        return pwd_context.hash(password)
    
    def verify_hash(self, plain_password: str, hashed_password: str):
        # digest = hashlib.sha256(plain_password.encode("utf-8")).digest()
        return pwd_context.verify(plain_password, hashed_password)