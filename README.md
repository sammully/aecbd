# AEC Intelligence Feeds MVP

A business development intelligence tool for the Architecture, Engineering, and Construction (AEC) sector. Captures signals from RSS feeds and Web pages, normalizes the data, and stores it in a RAG-ready format.

## Architecture
- **Backend**: FastAPI (Python) + SQLAlchemy
- **Database**: SQLite (local dev), designed to swap to Postgres (pgvector) in production.
- **Workers**: Celery + Redis for async scraping.
- **Frontend**: Next.js + Tailwind CSS.

## Running Locally with Podman

### 1. Start Services
Ensure you have `podman-compose` installed.
```bash
podman-compose up --build -d
```
This starts:
- `db` (PostgreSQL 15)
- `redis` (Cache/Broker)
- `api` (FastAPI on http://localhost:8000)
- `worker` (Celery background processor)
- `web` (Next.js on http://localhost:3000)

### 2. Apply Migrations & Seed Data
```bash
podman-compose exec api /bin/bash -c "alembic upgrade head && python seed.py"
```

### 3. Usage
- Go to **http://localhost:3000** to view the **Dashboard**.
- Go to the **Manage Sources** page to add RSS feeds or Web pages.
- The Celery worker will ingest data every 30 minutes, or you can manually trigger feeds if desired.

---

## Azure Deployment Path ☁️

This architecture is specifically designed for staging onto Azure using cloud-native services.

### Recommended Azure Services:
- **Azure Container Apps (ACA)**: Host the `api` (FastAPI), `web` (Next.js), and `worker` (Celery) containers. ACA natively supports scale-to-zero and event-driven scaling (KEDA) which is perfect for scheduled ingestion jobs using Celery/Redis.
- **Azure Database for PostgreSQL - Flexible Server**: Replace the local SQLite DB. Use the `pgvector` extension to store RAG embeddings directly in relational schema for the `chunks` table.
- **Azure Cache for Redis**: Fully managed Redis to serve as the Celery message broker.
- **Azure AI Search (Optional)**: If you outgrow `pgvector`, swap the chunk vector storage to Azure AI Search for advanced hybrid ranking (BM25 + Dense).
- **Azure Key Vault**: Store Postgres credentials, Redis connection strings, and OpenAI API keys.
- **Azure Application Insights**: Built-in support within Python and Node.js for end-to-end distributed tracing between the Web, API, and Worker tiers.

### How to Switch SQLite -> Postgres
1. By default, the `DATABASE_URL` uses SQLite.
2. Set the environment variable to a valid Postgres connection string (e.g., `postgresql://user:pass@host/db`).
3. Run `alembic upgrade head`. The schema and migrations will work identically.

## Development Commands
```bash
make up       # Start all containers
make down     # Stop containers
make logs     # Tail container logs
make test     # Run Pytest in API
```
