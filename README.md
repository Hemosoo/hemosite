# hemosite

Personal site. React + TypeScript + Vite, Tailwind v4, framer-motion.

```sh
npm install
npm run dev              # local, with hot reload
npm run build            # typecheck + production build into dist/
npm run preview          # serve dist/ exactly as it will be served
npm run lint
```

## Deploying

Two sites are built from this one source tree. They are the *same build* —
the preview only rewrites which domain it claims to be and adds a `noindex`,
so what you look at is what goes live.

| | branch | URL | trigger |
| --- | --- | --- | --- |
| production | `main` | https://hemosoo.com | push to `main` |
| preview | `staging` | https://staging.hemosoo.com | `npm run deploy:preview` |

```sh
# work on staging, look at it on the real internet
git switch staging
npm run deploy:preview           # pushes staging -> the preview repo's main

# happy with it
git switch main && git merge staging && git push    # live in a minute or two
```

`deploy:preview` pushes to `Hemosoo/hemosite-preview`, a second repository
that exists only to host the preview. It has no history of its own: its `main`
is always a copy of this repository's `staging`.

Both sites are GitHub Pages. `.github/workflows/deploy.yml` builds both; the
one step that differs keys off the repository name.

## Domains

`hemosoo.com` is registered with Cloudflare and resolves straight to GitHub
Pages — the apex on Pages' four A records, `www` and `staging` as CNAMEs to
`hemosoo.github.io`, none of them proxied. An orange cloud in front of the
apex stops Pages issuing its certificate. If proxying is ever turned on,
Cloudflare's SSL mode has to be Full (strict); Flexible loops against a Pages
site that already forces HTTPS.

`public/CNAME` is what carries the production domain through each deploy,
since the workflow replaces the whole published tree. `base` in
`vite.config.ts` is `/` because the site sits at the root of a domain rather
than under a path — the two have to agree or every asset 404s.
