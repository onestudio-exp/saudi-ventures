-- togo query fragment (Postgres). Safe to edit. (Methods are sqlc-generated but
-- runtime data access goes through the dialect-aware ORM; these are kept in sync.)
-- name: GetCapability :one
SELECT * FROM capabilities WHERE id = $1;

-- name: ListCapabilities :many
SELECT * FROM capabilities ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CreateCapability :one
INSERT INTO capabilities (slug, name_en, name_ar, kind, enabled, nav_order, nav_icon, route, description_en, description_ar, config, workflow_steps)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: DeleteCapability :exec
DELETE FROM capabilities WHERE id = $1;
