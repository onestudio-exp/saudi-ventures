-- togo query fragment (Postgres). Safe to edit. (Methods are sqlc-generated but
-- runtime data access goes through the dialect-aware ORM; these are kept in sync.)
-- name: GetSource :one
SELECT * FROM sources WHERE id = $1;

-- name: ListSources :many
SELECT * FROM sources ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CreateSource :one
INSERT INTO sources (slug, name, kind, config, enabled)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: DeleteSource :exec
DELETE FROM sources WHERE id = $1;
