# NGX Stock SaaS — common commands
.PHONY: help setup-env up down build logs migrate seed revision backend-sh fmt test fe-test

help:           ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup-env:      ## Create .env from .env.example if it doesn't exist yet
	@test -f .env && echo ".env already exists — leaving it untouched" || (cp .env.example .env && echo "Created .env from .env.example — fill in the secrets")

up:             ## Start the full stack
	docker compose up --build

down:           ## Stop and remove containers
	docker compose down

build:          ## Rebuild images
	docker compose build

logs:           ## Tail backend logs
	docker compose logs -f backend

migrate:        ## Apply DB migrations
	docker compose exec backend alembic upgrade head

revision:       ## Autogenerate a migration (make revision m="message")
	docker compose exec backend alembic revision --autogenerate -m "$(m)"

seed:           ## Seed the NGX ticker universe
	docker compose exec backend python -m app.data.seed

backend-sh:     ## Shell into the backend container
	docker compose exec backend bash

test:           ## Run backend tests
	docker compose exec backend pytest -q

fe-test:        ## Run frontend tests
	docker compose exec frontend npm run test

fmt:            ## Format backend with ruff
	docker compose exec backend ruff format app
