import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from utils import generate_checksum, chunk_text

def test_generate_checksum():
    url = "https://example.com"
    content = "Hello World"
    hash1 = generate_checksum(url, content)
    hash2 = generate_checksum(url, content)
    
    assert hash1 == hash2
    assert len(hash1) == 64 # SHA-256 hex length

def test_chunk_text():
    text = "A" * 2000
    chunks = chunk_text(text, chunk_size=1000, overlap=200)
    
    assert len(chunks) == 3 # 0-1000, 800-1800, 1600-2000
    assert len(chunks[0]) == 1000
    assert len(chunks[2]) == 400
