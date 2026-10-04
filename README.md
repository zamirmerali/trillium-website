# Trillium Neurosurgery Clinic — website

A fast static site with no dependencies. Fonts and images are hosted with the site itself, CSS is inlined, and the JavaScript is under 2 KB.

## Commands

```bash
node build.mjs     # build the site into dist/
node serve.mjs     # preview at http://localhost:4321
```

## Editing

| What | Where |
|---|---|
| Page content | `src/pages/*.html` (each page starts with a title/description/path block) |
| Header, footer, nav | `src/layout.html` |
| Shared blocks (referral banner, sidebar) | `src/partials/*.html`, included with `<!-- @include name -->` |
| Design system (colours, type scale, hairlines, single accent) | `src/styles.css` — all tokens are in `:root` at the top |
| Images, fonts, referral form | `public/` |

**Adding a surgeon:** copy `src/pages/dr-zamir-merali.html` to a new page (e.g. `dr-jane-smith.html`), change the `path` value, and add a card to `src/pages/our-team.html`.

## Deploying

Upload `dist/` to any static host. Netlify and Cloudflare Pages are both free at this size and pick up `_redirects` and `_headers` on their own. Build command: `node build.mjs`. Publish directory: `dist`.

`_redirects` sends the old Squarespace URLs (`/aboutus`, `/physicians`, the old referral-form link) to the new pages so existing Google results keep working.

## After going live

1. Point the domain's DNS at the new host and cancel Squarespace.
2. Add the site to Google Search Console and submit `https://www.trilliumneurosurgery.com/sitemap.xml`.
3. Claim or update the **Google Business Profile** for the clinic. It matters most for searches like "neurosurgeon Mississauga". Use the same name, address and phone as the site.
