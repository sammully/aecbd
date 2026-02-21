.PHONY: up down dev migrate logs build test init

# Docker / Podman setup
up:
	podman-compose up -d

down:
	podman-compose down

build:
	podman-compose build

logs:
	podman-compose logs -f

# Local Dev Setup (if not using podman for pure local)
init:
	podman-compose exec api /bin/bash -c "cd /app && alembic upgrade head && python seed.py"

dev-api:
	cd apps/api && fastapi dev main.py

dev-web:
	cd apps/web && npm run dev

dev-worker:
	cd services/ingestion && celery -A worker worker --loglevel=info

migrate:
	cd apps/api && alembic upgrade head

makemigrations:
	cd apps/api && echo "Run 'alembic revision --autogenerate -m \"message\"' inside apps/api"

test:
	cd apps/api && pytest
	cd services/ingestion && pytest
