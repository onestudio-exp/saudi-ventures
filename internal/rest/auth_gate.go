// Auth boundary (§1): Huma per-operation middleware that gates admin-only REST
// operations. Public operations (POST /api/leads, GET entities/agents, GET on the
// intelligence resources) carry NO gate; admin operations (lead read/list/update/
// delete, all entity/agent writes, intelligence writes) attach Gate.RequireAdmin.
package rest

import (
	"errors"
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"
	"github.com/togo-framework/auth"
	"github.com/togo-framework/togo"
)

// Gate builds Huma operation middleware from the kernel's auth service. It resolves
// the service lazily (per request) so it is immune to plugin boot ordering, and
// reads the bearer token from the Authorization header or the togo_session cookie
// (matching the cookie-based frontend session).
type Gate struct {
	api huma.API
	k   *togo.Kernel
}

// NewGate returns a gate bound to the API (for error responses) and kernel (for
// lazy auth lookup). Callers must skip building a gate when the app is nil
// (server.OpenAPI generation passes a nil app).
func NewGate(api huma.API, k *togo.Kernel) *Gate { return &Gate{api: api, k: k} }

// RequireAdmin denies with 401 when unauthenticated and 403 when the caller lacks
// the "admin" role. Role — not permission — is the gate: Identity.Can has no
// wildcard, so the dev login's Permissions=["*"] would not satisfy a permission
// check, whereas it sets Roles=["admin"].
func (g *Gate) RequireAdmin(ctx huma.Context, next func(huma.Context)) {
	id, err := g.identify(ctx)
	if err != nil || id == nil {
		_ = huma.WriteErr(g.api, ctx, http.StatusUnauthorized, "unauthorized")
		return
	}
	if !id.HasRole("admin") {
		_ = huma.WriteErr(g.api, ctx, http.StatusForbidden, "forbidden")
		return
	}
	next(ctx)
}

func (g *Gate) identify(ctx huma.Context) (*auth.Identity, error) {
	if g.k == nil {
		return nil, errors.New("auth unavailable")
	}
	svc, ok := auth.FromKernel(g.k)
	if !ok {
		return nil, errors.New("auth service not registered")
	}
	token := bearerToken(ctx.Header("Authorization"))
	if token == "" {
		if c, err := huma.ReadCookie(ctx, auth.SessionCookie); err == nil && c != nil {
			token = c.Value
		}
	}
	return svc.Verify(token)
}

func bearerToken(header string) string {
	const prefix = "Bearer "
	if strings.HasPrefix(header, prefix) {
		return strings.TrimSpace(strings.TrimPrefix(header, prefix))
	}
	return ""
}
