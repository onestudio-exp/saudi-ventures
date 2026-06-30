-- togo query fragment (Postgres). Safe to edit. (Methods are sqlc-generated but
-- runtime data access goes through the dialect-aware ORM; these are kept in sync.)
-- name: GetCapabilitySource :one
SELECT * FROM capability_sources WHERE id = $1;

-- name: ListCapabilitySources :many
SELECT * FROM capability_sources ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CreateCapabilitySource :one
INSERT INTO capability_sources (capability_id, source_id, config, active)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: DeleteCapabilitySource :exec
DELETE FROM capability_sources WHERE id = $1;
