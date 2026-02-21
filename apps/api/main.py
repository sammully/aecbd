from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

import models
import schemas
from database import get_db, engine
import sys
import os

# To push tasks to celery from API, we can either import the task or just use send_task
from celery import Celery
celery_app = Celery("aec_ingestion", broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"))

app = FastAPI(title="AEC Intelligence Feeds API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "app": "AEC Intelligence Feeds"}

# --- Sources ---

@app.get("/api/sources", response_model=List[schemas.Source])
def get_sources(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    sources = db.query(models.Source).offset(skip).limit(limit).all()
    return sources

@app.post("/api/sources", response_model=schemas.Source)
def create_source(source: schemas.SourceCreate, db: Session = Depends(get_db)):
    db_source = models.Source(
        name=source.name,
        type=source.type,
        url=str(source.url),
        config_json=source.config_json,
        enabled=source.enabled
    )
    db.add(db_source)
    db.commit()
    db.refresh(db_source)
    return db_source

@app.post("/api/sources/bulk", response_model=List[schemas.Source])
def create_sources_bulk(payload: schemas.SourceBulkCreate, db: Session = Depends(get_db)):
    added_sources = []
    for source in payload.sources:
        # Deduplicate
        existing = db.query(models.Source).filter(models.Source.url == str(source.url)).first()
        if not existing:
            db_source = models.Source(
                name=source.name,
                type=source.type,
                url=str(source.url),
                config_json=source.config_json,
                enabled=source.enabled
            )
            db.add(db_source)
            added_sources.append(db_source)
    
    if added_sources:
        db.commit()
        for s in added_sources:
            db.refresh(s)
            
    return added_sources

@app.get("/api/sources/{source_id}", response_model=schemas.Source)
def get_source(source_id: str, db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source

@app.delete("/api/sources/{source_id}")
def delete_source(source_id: str, db: Session = Depends(get_db)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    db.delete(source)
    db.commit()
    return {"status": "deleted"}

@app.post("/api/ingest")
def trigger_ingestion():
    celery_app.send_task("tasks.ingest_all_sources")
    return {"status": "Ingestion triggered asynchronously"}

@app.get("/api/runs")
def get_recent_runs(limit: int = 10, db: Session = Depends(get_db)):
    runs = db.query(models.IngestionRun, models.Source.name).join(
        models.Source, models.IngestionRun.source_id == models.Source.id
    ).order_by(models.IngestionRun.started_at.desc()).limit(limit).all()
    
    result = []
    for run, source_name in runs:
        result.append({
            "id": run.id,
            "source_id": run.source_id,
            "source_name": source_name,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "status": run.status,
            "items_processed": run.items_processed,
            "error_log": run.error_log
        })
    return result

# --- Items ---

@app.get("/api/items", response_model=List[schemas.ItemList])
def get_items(
    skip: int = 0, 
    limit: int = 50, 
    source_id: Optional[str] = None,
    search: Optional[str] = None,
    tag: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Item)
    if source_id:
        query = query.filter(models.Item.source_id == source_id)
    if search:
        query = query.filter(models.Item.title.ilike(f"%{search}%"))
    if tag:
        # SQLite compatible JSON array search (works for simple string elements)
        from sqlalchemy import cast, String
        query = query.filter(cast(models.Item.tags_json, String).ilike(f'%"{tag}"%'))
    
    items = query.order_by(models.Item.published_at.desc()).offset(skip).limit(limit).all()
    return items

@app.get("/api/items/{item_id}", response_model=schemas.ItemDetail)
def get_item(item_id: str, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.post("/api/items/{item_id}/ask")
def ask_question_about_item(item_id: str, req: schemas.AskRequest, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # RAG Stub: Here we would retrieve chunks for this item, 
    # format a prompt with the context, and call an LLM.
    
    return {
        "answer": f"This is a stubbed LLM response. I received your question about '{item.title}': {req.question}",
        "context_used": [
            "Chunk 1 stub",
            "Chunk 2 stub"
        ]
    }
