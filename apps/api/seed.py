import sys
from sqlalchemy.orm import Session
import models
from database import SessionLocal

def seed_db():
    db: Session = SessionLocal()
    
    # Example sources for AEC
    sources_to_add = [
        {"name": "ArchDaily - Architecture News", "type": "rss", "url": "https://www.archdaily.com/rss"},
        {"name": "Engineering News-Record (ENR)", "type": "rss", "url": "https://www.enr.com/rss/articles"},
        {"name": "Construction Dive", "type": "rss", "url": "https://www.constructiondive.com/feeds/news/"},
        {"name": "Dezeen", "type": "rss", "url": "https://www.dezeen.com/feed/"},
        {"name": "Architizer", "type": "rss", "url": "https://architizer.com/blog/feed/"},
        {"name": "Construction Enquirer", "type": "rss", "url": "https://www.constructionenquirer.com/feed/"},
        {"name": "The Construction Index", "type": "rss", "url": "https://www.theconstructionindex.co.uk/rss/news"},
        {"name": "BD+C Network", "type": "rss", "url": "https://www.bdcnetwork.com/rss.xml"},
        {"name": "AEC Magazine", "type": "web", "url": "https://aecmag.com/technology/"}
    ]
    
    for s in sources_to_add:
        existing = db.query(models.Source).filter(models.Source.url == s['url']).first()
        if not existing:
            source = models.Source(
                name=s['name'],
                type=s['type'],
                url=s['url'],
                enabled=True
            )
            db.add(source)
    
    db.commit()
    print("Seeded database with sample AEC feeds.")

if __name__ == "__main__":
    seed_db()
