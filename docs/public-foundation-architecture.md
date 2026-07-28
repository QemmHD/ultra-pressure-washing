# Public Foundation Architecture Notes

## Static public facts

The Public Foundation build uses source-controlled data from `src/data/`.
Business contact details, services, locations, projects, routes, metadata, the
hero motto, and the special offer are rendered from those files during
prerendering and hydration.

The settings provider is intentionally static in this branch. It does not call
Supabase or any other runtime settings service. This prevents:

- build-time dependence on production data;
- hero or offer text changing after hydration;
- route metadata disagreeing with visible content;
- local or preview builds contacting production settings.

The previous API module remains in the repository for the separately approved
Backend Security phase, but it is not imported by the Public Foundation route
graph and should not appear in the client bundle.

## Quote, review, and admin behavior

- The quote form validates locally and shows `Preview mode — no request was
  sent.` It does not send or store data.
- The reviews route is a truthful static state with no submission form.
- The admin route is an inert preview notice. It does not authenticate, read,
  write, upload, delete, or change settings.

These preview behaviors are fail-closed and deliberately not production-ready.
The Backend Security phase must restore protected production workflows before
this branch can be considered for a production merge.

## Static routing

React Router Framework Mode prerenders every approved route under
`build/client`. The broad SPA fallback is removed after the build. A branded
`404.html` is generated from the shared React design so an unmatched static
request can return a real 404 response.

The sitemap and robots file are generated from the canonical route source.
`/admin` and the 404 document are excluded from the sitemap.

## Netlify configuration prepared, not applied

No Netlify project setting or production environment has been changed.

For a future approved Netlify configuration, the expected publish directory is:

```toml
[build]
  publish = "build/client"
  command = "bun run build"
```

The following response header should be reviewed and applied only in a later
approved Netlify configuration change:

```toml
[[headers]]
  for = "/admin"
  [headers.values]
    X-Robots-Tag = "noindex, nofollow"
```

That header complements the prerendered `noindex,nofollow` metadata. Neither
mechanism is authentication or authorization.

Caching, security headers, deploy-context environment separation, and any
production redirects remain postponed.
