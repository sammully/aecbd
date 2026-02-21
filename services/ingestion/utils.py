import hashlib

def generate_checksum(url: str, content: str) -> str:
    """Generate a SHA-256 checksum for a given string."""
    hash_object = hashlib.sha256(f"{url}|{content}".encode('utf-8'))
    return hash_object.hexdigest()

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """
    Very naive chunking function.
    In a real app, use LangChain's RecursiveCharacterTextSplitter.
    """
    if not text:
        return []
    
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += (chunk_size - overlap)
        
    return chunks

def generate_embedding_stub(text: str) -> str:
    """
    Stub for generating embeddings.
    Since MVP uses SQLite locally without pgvector,
    we'll just return a dummy JSON vector string.
    """
    import json
    # A dummy 3-dimensional vector
    return json.dumps([0.1, 0.2, 0.3])
