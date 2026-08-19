.PHONY: install dev typecheck demo up down build seed

install:    ; npm install
dev:        ; npm run dev:api & npm run dev:web
typecheck:  ; npm run typecheck
demo:       ; npm --workspace @learnova/backend run demo
up:         ; docker compose up --build
down:       ; docker compose down
prod:       ; docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
build:      ; npm run build
