.PHONY: dev generate migrate seed build test clean-forks

dev: ## Run the API with reload
	togo serve

generate: clean-forks ## sqlc + gqlgen + compile gate (Atlas deferred to M7 — its diff stage needs DEV_DATABASE_URL; cmd/migrate is the v0.1 mechanism)
	COPYFILE_DISABLE=1 sqlc generate
	COPYFILE_DISABLE=1 go run github.com/99designs/gqlgen generate
	COPYFILE_DISABLE=1 go build ./...

clean-forks: ## Purge macOS AppleDouble (._*) forks that break sqlc/gqlgen on exFAT
	@find . -name '._*' -not -path './node_modules/*' -delete 2>/dev/null || true
	@find .git -name '._*' -delete 2>/dev/null || true

migrate: clean-forks ## Apply schema fragments (project binary; pgx via internal/app/db_drivers.go — NOT brew togo)
	go run ./cmd/migrate

seed: clean-forks ## Seed the database (ORM path, dialect-aware)
	go run ./cmd/seed

build: ## Build the API binary
	go build -o bin/saudi-ventures ./cmd/api

test: ## Run tests
	go test ./...
