-- togo query fragment (Postgres). Safe to edit. (Methods are sqlc-generated but
-- runtime data access goes through the dialect-aware ORM; these are kept in sync.)
-- name: GetEntity :one
SELECT * FROM entities WHERE id = $1;

-- name: ListEntities :many
SELECT * FROM entities ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CreateEntity :one
INSERT INTO entities (name, slug, kind, description, logo_url, website, sector, headquarters, founded_year, claimed)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: DeleteEntity :exec
DELETE FROM entities WHERE id = $1;
