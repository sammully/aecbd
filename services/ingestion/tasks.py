import os
import sys
import logging
from datetime import datetime, timezone
from celery import shared_task
import feedparser
import httpx
from bs4 import BeautifulSoup
from readability import Document

from worker import app
from utils import generate_checksum, chunk_text, generate_embedding_stub

# Add apps/api to path
api_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../apps/api'))
sys.path.append(api_path)
sys.path.append('/apps/api')
import models
from database import SessionLocal

logger = logging.getLogger(__name__)

# Standard browser headers to avoid 403 Forbidden errors
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

COMMERCIAL_KEYWORDS = {
    "Contracts": ["awarded", "won contract", "selected for", "deal signed", "contract extension"],
    "M&A": ["acquisition", "merger", "acquired by", "merged with", "buyout"],
    "Layoffs": ["layoff", "job cuts", "downsizing", "restructuring", "reduction in force"],
    "Startups & Funding": ["seed round", "raised", "series a", "series b", "startup funding", "venture capital"]
}

def classify_article(text: str) -> list:
    """Classifies an article based on keyword heuristics."""
    text_lower = text.lower()
    tags = []
    for category, keywords in COMMERCIAL_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            tags.append(category)
    return tags

def fetch_rss_feed(source: models.Source, db):
    feed = feedparser.parse(source.url)
    items_added = 0
    
    for entry in feed.entries:
        entry_link = entry.get('link', '')
        entry_title = entry.get('title', '')
        # content logic
        content = ''
        if 'content' in entry:
            content = entry.content[0].value
        elif 'summary' in entry:
            content = entry.summary
        
        # fallback published date
        if hasattr(entry, 'published_parsed') and entry.published_parsed:
            published_at = datetime(*entry.published_parsed[:6])
        else:
            published_at = datetime.utcnow()
            
        checksum = generate_checksum(entry_link, content)
        
        # Dedupe by checksum
        existing = db.query(models.Item).filter(
            models.Item.source_id == source.id,
            models.Item.checksum == checksum
        ).first()
        
        if existing:
            continue
            
        # Clean text
        try:
            doc = Document(content)
            cleaned_text = doc.summary()
            soup = BeautifulSoup(cleaned_text, "html.parser")
            cleaned_text_plain = soup.get_text(separator="\n").strip()
        except:
            cleaned_text_plain = content
        
        item = models.Item(
            source_id=source.id,
            external_id=entry_link,
            title=entry_title,
            published_at=published_at,
            raw_content=content,
            cleaned_text=cleaned_text_plain,
            author=entry.get('author', ''),
            checksum=checksum,
            tags_json=classify_article(cleaned_text_plain)
        )
        db.add(item)
        db.flush() # flush to get item.id
        
        # Chunking & Embedding
        chunks_text = chunk_text(cleaned_text_plain)
        for i, c_text in enumerate(chunks_text):
            chunk = models.Chunk(
                item_id=item.id,
                chunk_index=i,
                text=c_text,
                embedding_vector=generate_embedding_stub(c_text)
            )
            db.add(chunk)
            
        items_added += 1
        
    db.commit()
    return items_added

def fetch_article(url: str, source: models.Source, db) -> int:
    """Helper to fetch, clean, and store a single article URL."""
    url = url.strip()
    checksum = generate_checksum(source.url, url) # use URL as dedupe key for web
    existing = db.query(models.Item).filter(
        models.Item.source_id == source.id,
        models.Item.checksum == checksum
    ).first()
    
    if existing:
        return 0

    try:
        response = httpx.get(url, headers=DEFAULT_HEADERS, timeout=15.0, follow_redirects=True)
        response.raise_for_status()
        html = response.text
    except Exception as e:
        logger.error(f"Failed to fetch linked article {url}: {e}")
        return 0
        
    doc = Document(html)
    cleaned_html = doc.summary()
    soup = BeautifulSoup(cleaned_html, "html.parser")
    cleaned_text_plain = soup.get_text(separator="\n").strip()
    title = doc.title()
    
    # Skip extremely short "articles" which are likely not real content
    if len(cleaned_text_plain) < 200:
        return 0
    
    item = models.Item(
        source_id=source.id,
        external_id=url,
        title=title,
        published_at=datetime.utcnow(),
        raw_content=html,
        cleaned_text=cleaned_text_plain,
        checksum=checksum,
        tags_json=classify_article(cleaned_text_plain)
    )
    db.add(item)
    db.flush()
    
    # Chunking & Embedding
    chunks_text = chunk_text(cleaned_text_plain)
    for i, c_text in enumerate(chunks_text):
        chunk = models.Chunk(
            item_id=item.id,
            chunk_index=i,
            text=c_text,
            embedding_vector=generate_embedding_stub(c_text)
        )
        db.add(chunk)
        
    return 1

from urllib.parse import urlparse, urljoin

def fetch_web_page(source: models.Source, db):
    """Treats the source URL as an index page, and scrapes internal links."""
    try:
        response = httpx.get(source.url.strip(), headers=DEFAULT_HEADERS, timeout=15.0, follow_redirects=True)
        response.raise_for_status()
        html = response.text
    except Exception as e:
        logger.error(f"Failed to fetch index {source.url}: {e}")
        return 0
        
    soup = BeautifulSoup(html, "html.parser")
    parsed_source = urlparse(source.url)
    base_url = f"{parsed_source.scheme}://{parsed_source.netloc}"
    
    # Extract internal links
    article_links = set()
    for a in soup.find_all('a', href=True):
        href = a['href'].strip()
        # Resolve relative links relative to the source URL (important!)
        full_url = urljoin(source.url, href)
        parsed_url = urlparse(full_url)
        
        # Only keep links to the same domain that look like articles
        if parsed_url.netloc == parsed_source.netloc and len(parsed_url.path) > 8:
             # Basic filter to avoid index pages or common non-article paths
            skip_paths = ['/category/', '/tag/', '/author/', '/search/']
            if not any(full_url.split(parsed_url.netloc)[-1].startswith(p) for p in skip_paths):
                article_links.add(full_url)

    items_added = 0
    # Scrape up to 8 new articles per run (increased from 5)
    for link in list(article_links)[:15]:
        added = fetch_article(link, source, db)
        items_added += added
        if items_added >= 8: 
            break
            
    db.commit()
    return items_added

@app.task
def process_source(source_id: str):
    db = SessionLocal()
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    
    if not source or not source.enabled:
        db.close()
        return

    # Track run
    run = models.IngestionRun(
        source_id=source.id,
        status="running"
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    
    try:
        if source.type == "rss":
            items_added = fetch_rss_feed(source, db)
        elif source.type == "web":
            items_added = fetch_web_page(source, db)
        else:
            items_added = 0
            
        run.status = "success"
        run.items_processed = items_added
        run.completed_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        db.rollback()
        run.status = "failed"
        run.error_log = str(e)
        run.completed_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()

@app.task
def ingest_all_sources():
    db = SessionLocal()
    sources = db.query(models.Source).filter(models.Source.enabled == True).all()
    db.close()
    
    for s in sources:
        process_source.delay(s.id)
