from pydantic import BaseModel, Field
import uuid


class UserCreate(BaseModel):
    pseudo: str = Field(pattern=r"^[A-Za-z0-9]{3,30}$" )
    password: str = Field(min_length=8)
    language: str = "fr"
    
    
class UserOut(BaseModel):
    id:uuid.UUID
    pseudo: str
    role: str
    language: str
    model_config = {"from_attributes": True}
    

class Token(BaseModel):
    access_token: str
    token_type: str="bearer"
