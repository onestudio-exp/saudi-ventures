-- togo query fragment (Postgres). Safe to edit. (Methods are sqlc-generated but
-- runtime data access goes through the dialect-aware ORM; these are kept in sync.)
-- name: GetAgent :one
SELECT * FROM agents WHERE id = $1;

-- name: ListAgents :many
SELECT * FROM agents ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CreateAgent :one
INSERT INTO agents (name, slug, module, tagline, description, image_url, cta_text, cta_subtext, sort_order, active)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: DeleteAgent :exec
DELETE FROM agents WHERE id = $1;
