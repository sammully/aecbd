from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "app": "AEC Intelligence Feeds"}

def test_create_and_list_sources():
    # 1. Create a source
    response = client.post("/api/sources", json={
        "name": "Test Source",
        "type": "rss",
        "url": "https://example.com/rss",
        "enabled": True
    })
    assert response.status_code == 200
    source_data = response.json()
    assert source_data["name"] == "Test Source"
    source_id = source_data["id"]
    
    # 2. List sources
    response_list = client.get("/api/sources")
    assert response_list.status_code == 200
    sources = response_list.json()
    assert len(sources) >= 1
    assert any(s["id"] == source_id for s in sources)
    
    # 3. Clean up
    client.delete(f"/api/sources/{source_id}")
