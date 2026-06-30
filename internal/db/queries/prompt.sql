-- togo query fragment (Postgres). Safe to edit. (Methods are sqlc-generated but
-- runtime data access goes through the dialect-aware ORM; these are kept in sync.)
-- name: GetPrompt :one
SELECT * FROM prompts WHERE id = $1;

-- name: ListPrompts :many
SELECT * FROM prompts ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CreatePrompt :one
INSERT INTO prompts (capability_id, prompt_key, content_en, content_ar, version, active)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: DeletePrompt :exec
DELETE FROM prompts WHERE id = $1;
