from typing import List, Optional, Any
from pydantic import BaseModel, HttpUrl
from datetime import datetime

class SourceBase(BaseModel):
    name: str
    type: str # rss/web/api
    url: HttpUrl
    config_json: Optional[dict] = {}
    enabled: bool = True

class SourceCreate(SourceBase):
    pass

class SourceBulkCreate(BaseModel):
    sources: List[SourceCreate]

class Source(SourceBase):
    id: str
    org_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ItemBase(BaseModel):
    title: Optional[str] = None
    external_id: Optional[str] = None
    published_at: Optional[datetime] = None
    author: Optional[str] = None
    tags_json: Optional[list] = []

class ItemList(ItemBase):
    id: str
    source_id: str
    fetched_at: datetime
    # We omit raw_content and cleaned_text for lists to save bandwidth

    class Config:
        from_attributes = True

class ItemDetail(ItemList):
    cleaned_text: Optional[str] = None
    raw_content: Optional[str] = None

class AskRequest(BaseModel):
    question: str
