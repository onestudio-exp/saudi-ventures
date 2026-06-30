-- togo query fragment (Postgres). Safe to edit. (Methods are sqlc-generated but
-- runtime data access goes through the dialect-aware ORM; these are kept in sync.)
-- name: GetArticle :one
SELECT * FROM articles WHERE id = $1;

-- name: ListArticles :many
SELECT * FROM articles ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CreateArticle :one
INSERT INTO articles (url, title, content, summary, why_it_matters, source_name, source_type, image_url, published_at, status, harvester_item_id, linked_venture_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: DeleteArticle :exec
DELETE FROM articles WHERE id = $1;
