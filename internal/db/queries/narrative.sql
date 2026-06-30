-- togo query fragment (Postgres). Safe to edit. (Methods are sqlc-generated but
-- runtime data access goes through the dialect-aware ORM; these are kept in sync.)
-- name: GetNarrative :one
SELECT * FROM narratives WHERE id = $1;

-- name: ListNarratives :many
SELECT * FROM narratives ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CreateNarrative :one
INSERT INTO narratives (title, kind, body_md, period_start, period_end, window_days, model, prompt_tokens, completion_tokens, status)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: DeleteNarrative :exec
DELETE FROM narratives WHERE id = $1;
