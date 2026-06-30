-- togo query fragment (Postgres). Safe to edit. (Methods are sqlc-generated but
-- runtime data access goes through the dialect-aware ORM; these are kept in sync.)
-- name: GetAlert :one
SELECT * FROM alerts WHERE id = $1;

-- name: ListAlerts :many
SELECT * FROM alerts ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CreateAlert :one
INSERT INTO alerts (signal, severity, title, summary, article_id, entity_id, acknowledged)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: DeleteAlert :exec
DELETE FROM alerts WHERE id = $1;
