// Static site builder for Trillium Neurosurgery Clinic.
// No dependencies: `node build.mjs` writes the finished site to ./dist
//
// Pages live in src/pages/*.html and start with a JSON front-matter comment:
//   <!--{ "title": "...", "description": "...", "path": "/foo/" }-->
// Partials in src/partials/*.html are pulled in with <!-- @include name -->.

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const SITE = 'https://www.trilliumneurosurgery.com';
const root = dirname(new URL(import.meta.url).pathname);
const src = join(root, 'src');
const out = join(root, 'dist');

const read = (p) => readFileSync(p, 'utf8');
const minifyCss = (css) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();

const layout = read(join(src, 'layout.html'));
const css = minifyCss(read(join(src, 'styles.css')));
const js = read(join(src, 'main.js')).trim();

const partials = {};
for (const f of readdirSync(join(src, 'partials'))) {
  partials[f.replace(/\.html$/, '')] = read(join(src, 'partials', f));
}
const includePartials = (html) =>
  html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, name) => {
    if (!(name in partials)) throw new Error(`Unknown partial: ${name}`);
    return includePartials(partials[name]);
  });

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'public'), out, { recursive: true });

// ---- Wayfinding: section sub-navigation and previous/next pager ----
// Each section lists its pages in order. A page shows the bar for the section it belongs to.
const SECTIONS = [
  { label: 'Our care', pages: [
    ['/services/', 'Overview'], ['/spine-surgery/', 'Spine surgery'], ['/brain-tumours/', 'Neuro-oncology'],
    ['/cerebrovascular/', 'Cerebrovascular'], ['/rapid-access/', 'Rapid Access Clinic'], ['/conditions/', 'Conditions we treat'] ] },
  { label: 'Patients', pages: [
    ['/patients/', 'Patient information'], ['/preparing-for-surgery/', 'Preparing for surgery'], ['/conditions/', 'Conditions we treat'] ] },
  { label: 'Referrals', pages: [['/referrals/', 'Refer a patient'], ['/rapid-access/', 'Rapid Access criteria']] },
  { label: 'About', pages: [['/our-team/', 'Our team'], ['/dr-zamir-merali/', 'Dr. Zamir Merali']] },
];
// Owner section for pages listed in more than one section.
const OWNER = { '/conditions/': 'Our care', '/rapid-access/': 'Our care' };
// A single reading order through the site, used for the previous/next pager.
const TOUR = [
  ['/services/', 'Our care'], ['/spine-surgery/', 'Spine surgery'], ['/brain-tumours/', 'Neuro-oncology'],
  ['/cerebrovascular/', 'Cerebrovascular'], ['/rapid-access/', 'Rapid Access Clinic'], ['/conditions/', 'Conditions we treat'],
  ['/patients/', 'Patient information'], ['/preparing-for-surgery/', 'Preparing for surgery'], ['/referrals/', 'Refer a patient'],
  ['/our-team/', 'Our team'], ['/dr-zamir-merali/', 'Dr. Zamir Merali'], ['/contact/', 'Contact'],
];
function sectionFor(path) {
  const owner = OWNER[path];
  return SECTIONS.find((sec) => (owner ? sec.label === owner : sec.pages.some(([p]) => p === path)));
}
function subnavHtml(path) {
  const sec = sectionFor(path);
  if (!sec) return '';
  const links = sec.pages.map(([p, label]) =>
    `<li><a href="${p}"${p === path ? ' aria-current="page"' : ''}>${label}</a></li>`).join('');
  return `<nav class="subnav" aria-label="${sec.label}"><div class="container subnav__inner">` +
    `<a class="subnav__home" href="${sec.pages[0][0]}">${sec.label}</a><ul>${links}</ul></div></nav>`;
}
function pagerHtml(path) {
  const i = TOUR.findIndex(([p]) => p === path);
  if (i < 0) return '';
  const prev = TOUR[i - 1], next = TOUR[i + 1];
  const cell = (item, dir) => item
    ? `<a class="pager__link pager__link--${dir}" href="${item[0]}"><span class="pager__k">${dir === 'prev' ? 'Previous' : 'Next'}</span><span class="pager__t">${item[1]}</span></a>`
    : `<a class="pager__link pager__link--${dir}" href="/"><span class="pager__k">${dir === 'prev' ? 'Back to' : 'Return to'}</span><span class="pager__t">Home</span></a>`;
  return `<nav class="pager" aria-label="More pages"><div class="container pager__inner">${cell(prev, 'prev')}${cell(next, 'next')}</div></nav>`;
}

const sitemap = [];
for (const file of readdirSync(join(src, 'pages')).sort()) {
  if (!file.endsWith('.html')) continue;
  const raw = read(join(src, 'pages', file));
  const m = raw.match(/^<!--(\{[\s\S]*?\})-->\s*/);
  if (!m) throw new Error(`${file}: missing front matter`);
  const meta = JSON.parse(m[1]);
  let rawBody = raw.slice(m[0].length);
  // Pager sits before the closing referral banner when there is one, otherwise at the end.
  const pager = pagerHtml(meta.path);
  rawBody = rawBody.includes('<!-- @include cta -->')
    ? rawBody.replace('<!-- @include cta -->', pager + '\n<!-- @include cta -->')
    : rawBody + pager;
  let body = includePartials(rawBody);
  // Section bar goes directly after the page hero.
  const subnav = subnavHtml(meta.path);
  if (subnav) body = body.replace(/(<section class="page-hero[\s\S]*?<\/section>)/, `$1\n${subnav}`);

  // Optional per-page JSON-LD blocks: <script type="application/ld+json"> inside the page body
  // are hoisted into <head>.
  const schemas = [];
  body = body.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>\s*/g, (_, json) => {
    schemas.push(`<script type="application/ld+json">${JSON.stringify(JSON.parse(json))}</script>`);
    return '';
  });

  const canonical = SITE + meta.path;
  let html = layout
    .replaceAll('{{title}}', meta.title)
    .replaceAll('{{description}}', meta.description)
    .replaceAll('{{canonical}}', canonical)
    .replaceAll('{{ogImage}}', SITE + (meta.ogImage || '/img/og-image.jpg'))
    .replace('{{schema}}', schemas.join('\n'))
    .replace('{{css}}', css)
    .replace('{{js}}', js)
    .replace('{{robots}}', meta.noindex ? '<meta name="robots" content="noindex">' : '')
    .replace('{{content}}', body);
  html = includePartials(html);

  // Mark the active nav item.
  for (const key of new Set([meta.path, meta.section || meta.path])) {
    html = html.replaceAll(`data-nav="${key}"`, 'aria-current="page"');
  }
  html = html.replace(/ data-nav="[^"]*"/g, '');

  const dest = meta.output ? join(out, meta.output) : join(out, meta.path, 'index.html');
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, html);
  if (!meta.noindex) sitemap.push({ loc: canonical, priority: meta.priority || '0.7' });
  console.log(`  ${meta.path.padEnd(24)} ${(html.length / 1024).toFixed(1)} KB`);
}

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
    .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`)
    .join('\n')}\n</urlset>\n`
);
writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
if (!existsSync(join(out, 'img/og-image.jpg'))) console.warn('  warning: public/img/og-image.jpg missing');
console.log(`Built ${sitemap.length} pages → dist/`);
