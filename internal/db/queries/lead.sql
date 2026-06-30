-- togo query fragment (Postgres). Safe to edit. (Methods are sqlc-generated but
-- runtime data access goes through the dialect-aware ORM; these are kept in sync.)
-- name: GetLead :one
SELECT * FROM leads WHERE id = $1;

-- name: ListLeads :many
SELECT * FROM leads ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CreateLead :one
INSERT INTO leads (email, whatsapp, message, source_type, source_page, source_agent)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: DeleteLead :exec
DELETE FROM leads WHERE id = $1;
