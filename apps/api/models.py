# DB Models
import uuid
from datetime import datetime
from typing import Any, Dict

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, String, Text, Float, Integer
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import UUID

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class Org(Base):
    __tablename__ = "orgs"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

class UserOrg(Base):
    __tablename__ = "user_orgs"
    user_id = Column(String(36), ForeignKey("users.id"), primary_key=True)
    org_id = Column(String(36), ForeignKey("orgs.id"), primary_key=True)
    role = Column(String(50), default="member")

class Source(Base):
    __tablename__ = "sources"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    org_id = Column(String(36), ForeignKey("orgs.id"), nullable=True) # Multitenant optional
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False) # rss, web, api
    url = Column(String(1024), nullable=False)
    config_json = Column(JSON, default={})
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Item(Base):
    __tablename__ = "items"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=False)
    external_id = Column(String(1024), nullable=True) # or URL
    title = Column(String(1024), nullable=True)
    published_at = Column(DateTime, nullable=True)
    fetched_at = Column(DateTime, default=datetime.utcnow)
    raw_content = Column(Text, nullable=True)
    cleaned_text = Column(Text, nullable=True)
    author = Column(String(255), nullable=True)
    tags_json = Column(JSON, default=[])
    checksum = Column(String(64), nullable=True, index=True) # for dedupe

    source = relationship("Source")

class Entity(Base):
    __tablename__ = "entities"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False) # company, project, person, location
    canonical_id = Column(String(36), nullable=True)

class ItemEntity(Base):
    __tablename__ = "item_entities"
    item_id = Column(String(36), ForeignKey("items.id"), primary_key=True)
    entity_id = Column(String(36), ForeignKey("entities.id"), primary_key=True)
    confidence = Column(Float, nullable=True)

class Chunk(Base):
    __tablename__ = "chunks"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    item_id = Column(String(36), ForeignKey("items.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=True)
    embedding_vector = Column(Text, nullable=True) # Stored as JSON string or pgvector
    embedding_model = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class IngestionRun(Base):
    __tablename__ = "ingestion_runs"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(50), nullable=False) # running, success, failed
    items_processed = Column(Integer, default=0)
    error_log = Column(Text, nullable=True)
