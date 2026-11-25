// Text editor for `npm run dev` only: click text on a page, change it, and it's written back to the source file it came from.
// Nothing here runs in `astro build`, so the published site is built exactly as before.
//
// How it finds the source: in dev, Astro marks every element with the .astro file and line it was written on
// (data-astro-source-file / -loc; middleware.mjs copies them to data-ge-src, since the dev toolbar strips them). From that element:
// - text written in the .astro file is edited there (as plain text, or as markup when it holds inline tags);
// - text that comes from an expression ({p.blurb}, set:html={rich(s.what)}) is looked up as a string literal in the
//   hand-written src/data/*.ts files, or in quotes inside that element, and must match exactly one.
// Text from the generated files (the .json files and the coefficient tables) is refused: tools/ scripts rewrite them.
//
// Every save copies the old file to .edit-backups/ first, then renders the page again. If the page fails to render
// (a glossary [[link]] to no entry, a quest /run line over 255 characters) or doesn't change at all, the file is put back
// and the error is shown in the editor.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { parse } from '@astrojs/compiler';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SRC = path.join(ROOT, 'src');
const DATA = path.join(SRC, 'data');
const BACKUPS = path.join(ROOT, '.edit-backups');
const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');

/** generated files, and the script that writes each: never edited here */
const GENERATED = {
  'src/data/consumes.json': 'tools/consumes/gen.py',
  'src/data/demons.json': 'tools/spellbook/gen.py',
  'src/data/spellbook.json': 'tools/spellbook/gen.py',
  'src/data/talents.json': 'tools/talents/gen.py',
  'src/data/wands.json': 'tools/wands/pull.py',
  'src/data/weapons.json': 'tools/weapons/gen.py',
  'src/data/coefficient-ranks.ts': 'spelldb',
  'src/data/coefficients.ts': 'spelldb (warlock-coefficients.html)',
  'src/data/utility-ranks.ts': 'tools/coefficients/utility.py',
};
/** the .astro files whose text can be edited */
const ASTRO_DIRS = ['pages', 'components', 'layouts'].map((d) => path.join(SRC, d));

// ---------------------------------------------------------------------------------------------------------------------
// Text helpers

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1));
  return ENTITIES[e.toLowerCase()] ?? m;
});
/** plain text as it may be written between tags in an .astro file */
const encodeAstroText = (s) => s.replace(/[&<>{}]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '{': '&#123;', '}': '&#125;' })[c]);
/** the words a rich string shows: [Name](item:123), [[Term]], [[Term|text]] and `code` reduced to their text */
const plain = (s) => s.replace(/\[([^\]]+)\]\((?:item|spell|quest|npc):\d+\)/g, '$1')
  .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1').replace(/`([^`]+)`/g, '$1');
const isRich = (s) => /\]\((?:item|spell|quest|npc):\d+\)|\[\[|`/.test(s);
/** a JS string literal in the same quotes as the one it replaces */
const encodeLiteral = (value, quote) => {
  let s = value.replace(/\\/g, '\\\\').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  s = s.split(quote).join('\\' + quote);
  if (quote === '`') s = s.replace(/\$\{/g, '\\${');
  return quote + s + quote;
};

// ---------------------------------------------------------------------------------------------------------------------
// Files: what may be edited, and where each string literal is

const inside = (abs, dir) => abs === dir || abs.startsWith(dir + path.sep);
const editableAstro = (abs) => abs.endsWith('.astro') && ASTRO_DIRS.some((d) => inside(abs, d));
const dataFiles = () => fs.readdirSync(DATA).filter((f) => /\.(ts|json)$/.test(f)).map((f) => path.join(DATA, f));

/** every string literal in a .ts file: its value, where it is, and the name it's given (a property, a const) */
function tsLiterals(abs) {
  const text = fs.readFileSync(abs, 'utf8');
  const sf = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true);
  const out = [];
  const nameOf = (n) => {
    let p = n.parent;
    if (p && ts.isArrayLiteralExpression(p)) p = p.parent;    // also: ['a', 'b'] is named also
    if (p && (ts.isPropertyAssignment(p) || ts.isVariableDeclaration(p)) && p.name && p.initializer !== undefined) {
      return ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : undefined;
    }
    return undefined;
  };
  const visit = (n) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const p = n.parent;
      const skip = ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p)
        || ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p)) && p.name === n);
      if (!skip) out.push({ value: n.text, start: n.getStart(sf), end: n.getEnd(), quote: text[n.getStart(sf)], name: nameOf(n) });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** every string in a JSON file, for spotting text that lives in generated data */
function jsonStrings(abs) {
  const out = [];
  const walk = (v) => {
    if (typeof v === 'string') out.push(v);
    else if (v && typeof v === 'object') for (const x of Object.values(v)) walk(x);
  };
  walk(JSON.parse(fs.readFileSync(abs, 'utf8')));
  return out;
}

const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex');

/** the files under src/ that a file imports, directly or through others (pages > components > lib > data > .json) */
function importsOf(abs, seen = new Set()) {
  if (seen.has(abs) || !inside(abs, SRC) || !fs.existsSync(abs) || abs.endsWith('.json')) return seen;
  seen.add(abs);
  const code = fs.readFileSync(abs, 'utf8');
  for (const m of code.matchAll(/(?:from\s+|import\s*\(?\s*)['"](\.{1,2}\/[^'"?]+)['"]/g)) {
    const base = path.resolve(path.dirname(abs), m[1]);
    const hit = [base, base + '.ts', base + '.json', path.join(base, 'index.ts')].find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
    if (hit && hit.endsWith('.json')) seen.add(hit);
    else if (hit) importsOf(hit, seen);
  }
  return seen;
}

// ---------------------------------------------------------------------------------------------------------------------
// The .astro side: the element an annotation points at

const before = (a, b) => a.line < b.line || (a.line === b.line && a.column < b.column);
const atOrBefore = (a, b) => !before(b, a);

/** the innermost element that starts before the annotation and runs past it (the annotation sits inside its start tag) */
function elementAt(ast, loc) {
  let best;
  const walk = (n) => {
    if ((n.type === 'element' || n.type === 'component' || n.type === 'custom-element') && n.position?.start) {
      const s = n.position.start, e = n.position.end;
      if (before(s, loc) && (!e || atOrBefore(loc, e))) best = n;
    }
    for (const c of n.children ?? []) walk(c);
  };
  walk(ast);
  return best;
}

/** whether a subtree is plain markup: tags and text, no {expressions}, no components, no {attr} values */
function isStaticMarkup(n) {
  if (n.type === 'text') return true;
  if (n.type === 'comment') return true;
  if (n.type !== 'element') return false;
  if ((n.attributes ?? []).some((a) => a.kind !== 'quoted' && a.kind !== 'empty')) return false;
  return (n.children ?? []).every(isStaticMarkup);
}

/** the source text of an element's expressions and {attributes}, for the names they read (p.blurb, d.role, SITE) */
function exprSource(buf, n) {
  const parts = [];
  for (const a of n.attributes ?? []) if (a.kind === 'expression') parts.push(a.value);
  for (const c of n.children ?? []) {
    if (c.type === 'expression' && c.position?.start && c.position?.end) parts.push(buf.subarray(c.position.start.offset, c.position.end.offset).toString());
  }
  return parts.join(' ');
}
const namesIn = (code) => new Set([...code.matchAll(/(?:\.|\b)([A-Za-z_$][\w$]*)\b(?!\s*\()/g)].map((m) => m[1]));

/** quoted strings written inside an element's expressions in the .astro file ('Known when summoned', 'One rank') */
function astroQuoted(buf, n) {
  const out = [];
  const exprs = (n.children ?? []).filter((c) => c.type === 'expression' && c.position?.start && c.position?.end);
  for (const c of exprs) {
    const base = c.position.start.offset;
    const code = buf.subarray(base, c.position.end.offset).toString();
    for (const m of code.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)) {
      const raw = m[1] ?? m[2];
      if (/[\\]/.test(raw)) continue;   // escapes: leave those to a text editor
      const start = base + Buffer.byteLength(code.slice(0, m.index));
      out.push({ value: raw, start, end: start + Buffer.byteLength(m[0]), quote: m[0][0] });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Resolving a click to a target, and saving it

/** what each resolve handed out, by id, so a save names only something the server found itself */
const targets = new Map();
/** saves made in this session, newest last, for Undo */
const undoStack = [];

const fail = (error, extra = {}) => ({ ok: false, error, ...extra });

/** look up text that came from an expression: in the data files, or quoted inside the element */
function lookupData(text, { rich, names, quoted, astroAbs }) {
  const want = norm(text);
  if (!want) return fail('There is no text here to edit.');
  const shown = (v) => norm(rich ? plain(v) : v);
  const hits = [];
  for (const q of quoted) if (shown(q.value) === want) hits.push({ abs: astroAbs, unit: 'byte', ...q, name: undefined, local: true });
  const generated = [];
  // only the data this element's file can reach through its imports, when that's known
  const reach = importsOf(astroAbs);
  const files = dataFiles().filter((f) => reach.has(f));
  for (const abs of files.length ? files : dataFiles()) {
    const r = rel(abs);
    if (abs.endsWith('.json')) {
      if (jsonStrings(abs).some((v) => shown(v) === want)) generated.push(r);
      continue;
    }
    for (const l of tsLiterals(abs)) {
      if (shown(l.value) !== want) continue;
      if (GENERATED[r]) generated.push(r);
      else hits.push({ abs, unit: 'char', ...l });
    }
  }
  // the names the element's code reads (p.title, d.role) settle a tie between equal strings
  let pick = hits;
  if (pick.length > 1) {
    const local = pick.filter((h) => h.local);
    const named = pick.filter((h) => h.name && names.has(h.name));
    if (local.length === 1) pick = local;
    else if (named.length) pick = named;
  }
  if (pick.length === 1) return { ok: true, hit: pick[0] };
  if (pick.length > 1) {
    const where = [...new Set(pick.map((h) => rel(h.abs)))].join(', ');
    return fail(`This text appears ${pick.length} times (${where}), so I can't tell which one to change. Edit it in the file.`);
  }
  if (generated.length) {
    const g = [...new Set(generated)];
    return fail(`Generated data: ${g.join(', ')} is written by ${g.map((f) => GENERATED[f]).filter((v, i, a) => a.indexOf(v) === i).join(' and ')}, so a change here would be overwritten. Change the script's input instead.`, { readonly: true });
  }
  return fail('This text is put together by code (a sum, a level, a mix of pieces), so it has no single place to edit.');
}

async function resolve({ file, loc, nodeText, elemText }) {
  const abs = path.resolve(file ?? '');
  if (!editableAstro(abs) || !fs.existsSync(abs)) return fail('This element isn\'t from a page or component under src/.');
  const [line, column] = String(loc).split(':').map(Number);
  if (!line || !column) return fail('This element has no source position.');
  const buf = fs.readFileSync(abs);
  const { ast } = await parse(buf.toString(), { position: true });
  const el = elementAt(ast, { line, column });
  if (!el) return fail('Couldn\'t find this element in its source file.');
  const label = `${rel(abs)}:${el.position.start.line}`;
  const kids = (el.children ?? []).filter((c) => c.type !== 'comment');
  const hasSetHtml = (el.attributes ?? []).some((a) => a.name === 'set:html' || a.name === 'set:text');
  const make = (t) => {
    const id = crypto.randomUUID();
    const fileBuf = fs.readFileSync(t.abs);
    targets.set(id, { ...t, hash: sha(fileBuf) });
    return id;
  };
  const textTarget = (child) => {
    const s = child.position.start.offset, e = child.position.end.offset;
    return { abs, unit: 'byte', start: s, end: e, encode: 'astro-text', label, original: buf.subarray(s, e).toString() };
  };

  // 1. text written straight into the element
  if (!hasSetHtml && kids.length && kids.every((c) => c.type === 'text')) {
    const t = textTarget(kids.length === 1 ? kids[0] : { position: { start: kids[0].position.start, end: kids.at(-1).position.end } });
    const value = decode(t.original);
    if (norm(value) !== norm(elemText ?? '')) {
      return fail(`The page's script changes this text after it loads, so what you see isn't what's written. It's at ${label}.`);
    }
    return { ok: true, id: make(t), kind: 'text', raw: value, inPlace: true, where: label };
  }
  // 2. markup with inline tags but no code: edit the markup
  if (!hasSetHtml && kids.length && kids.every(isStaticMarkup) && kids.some((c) => c.type === 'element')) {
    const s = kids[0].position.start.offset, e = kids.at(-1).position.end.offset;
    const t = { abs, unit: 'byte', start: s, end: e, encode: 'raw', label, original: buf.subarray(s, e).toString() };
    return { ok: true, id: make(t), kind: 'html', raw: t.original, where: label };
  }
  // 3. a mix: the words you clicked may be one of the element's own text pieces
  if (!hasSetHtml && nodeText && norm(nodeText)) {
    const own = kids.filter((c) => c.type === 'text' && norm(decode(c.value)) === norm(nodeText));
    if (own.length === 1) {
      const t = textTarget(own[0]);
      return { ok: true, id: make(t), kind: 'text', raw: decode(t.original), where: label };
    }
  }
  // 4. text from an expression
  const names = namesIn(exprSource(buf, el));
  const text = hasSetHtml ? elemText : (nodeText && norm(nodeText) ? nodeText : elemText);
  const found = lookupData(text ?? '', { rich: hasSetHtml, names, quoted: astroQuoted(buf, el), astroAbs: abs });
  if (!found.ok && !hasSetHtml && text !== elemText) {
    const again = lookupData(elemText ?? '', { rich: false, names, quoted: astroQuoted(buf, el), astroAbs: abs });
    if (again.ok) Object.assign(found, again);
  }
  if (!found.ok) return { ...found, where: label };
  const h = found.hit;
  const src = fs.readFileSync(h.abs, 'utf8');
  const lineNo = (h.unit === 'char' ? src.slice(0, h.start) : fs.readFileSync(h.abs).subarray(0, h.start).toString()).split('\n').length;
  const where = `${rel(h.abs)}:${lineNo}`;
  const t = { abs: h.abs, unit: h.unit, start: h.start, end: h.end, encode: 'literal', quote: h.quote, label: where,
    original: h.unit === 'char' ? src.slice(h.start, h.end) : fs.readFileSync(h.abs).subarray(h.start, h.end).toString() };
  const rich = isRich(h.value);
  return { ok: true, id: make(t), kind: rich ? 'rich' : 'text', raw: h.value, where,
    inPlace: !rich && norm(h.value) === norm(elemText ?? '') };
}

/** the file's text with a target replaced */
function splice(t, value) {
  const replacement = t.encode === 'astro-text' ? encodeAstroText(value)
    : t.encode === 'literal' ? encodeLiteral(value, t.quote)
    : value;
  if (t.unit === 'char') {
    const s = fs.readFileSync(t.abs, 'utf8');
    if (s.slice(t.start, t.end) !== t.original) return null;
    return Buffer.from(s.slice(0, t.start) + replacement + s.slice(t.end));
  }
  const b = fs.readFileSync(t.abs);
  if (b.subarray(t.start, t.end).toString() !== t.original) return null;
  return Buffer.concat([b.subarray(0, t.start), Buffer.from(replacement), b.subarray(t.end)]);
}

function backup(abs, buf) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const to = path.join(BACKUPS, stamp, rel(abs));
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, buf);
  return rel(to);
}

/** Astro's dev error page carries the error as JSON; fall back to the page's title */
function errorFrom(html, status) {
  const m = html.match(/"message"\s*:\s*("(?:[^"\\]|\\.)*")/);
  if (m) { try { return JSON.parse(m[1]); } catch { /* fall through */ } }
  const t = html.match(/<title>([^<]*)<\/title>/);
  return t ? decode(t[1]) : `The page returned ${status}.`;
}

// ---------------------------------------------------------------------------------------------------------------------
// The dev server

export default function editor() {
  return {
    name: 'grimoire-editor',
    hooks: {
      'astro:config:setup': ({ command, injectScript, addMiddleware }) => {
        if (command !== 'dev') return;
        addMiddleware({ entrypoint: path.join(SRC, 'editor', 'middleware.mjs'), order: 'post' });
        injectScript('page', `import ${JSON.stringify(path.join(SRC, 'editor', 'client.ts'))};`);
      },
      'astro:server:setup': ({ server }) => {
        // While a save is being checked, hold back the dev server's reload messages: if the check fails and the file is
        // put back, the page stays as it is, with your text still in the editor.
        // Astro reports a page that fails to render on the same channel, as an error for the browser's overlay; that's where
        // a save's check gets the message from.
        let holding = 0;
        let caught = null;
        const send = server.ws.send.bind(server.ws);
        const hold = (real) => (...args) => {
          if (!holding) return real(...args);
          if (args[0]?.type === 'error') caught?.(args[0].err);
        };
        server.ws.send = hold(send);
        if (server.hot && server.hot !== server.ws) server.hot.send = hold(server.hot.send.bind(server.hot));
        const client = server.environments?.client?.hot;
        if (client && client !== server.ws && client !== server.hot) client.send = hold(client.send.bind(client));
        /** the error Astro sends after a failed render (it waits 200 ms after the response) */
        const nextError = () => new Promise((done) => {
          const on = (err) => { clearTimeout(t); if (caught === on) caught = null; done(err); };
          const t = setTimeout(() => on(null), 1500);
          caught = on;
        });
        const changed = (abs) => new Promise((done) => {
          const t = setTimeout(() => { server.watcher.off('change', on); done(); }, 2000);
          const on = (f) => { if (path.resolve(f) === abs) { clearTimeout(t); server.watcher.off('change', on); setTimeout(done, 150); } };
          server.watcher.on('change', on);
        });
        const render = async (host, page) => {
          const res = await fetch(`http://${host}${page}`, { headers: { 'x-grimoire-editor': 'check' } });
          return { status: res.status, html: await res.text() };
        };
        /** write a file and wait until the dev server has seen it */
        const write = async (abs, buf) => { const seen = changed(abs); fs.writeFileSync(abs, buf); await seen; };

        const save = async ({ id, value, page }, host) => {
          const t = targets.get(id);
          if (!t) return fail('This edit has expired. Click the text again.');
          if (typeof value !== 'string') return fail('Nothing to save.');
          const old = fs.readFileSync(t.abs);
          if (sha(old) !== t.hash) return fail(`${rel(t.abs)} has changed since you clicked. Click the text again.`);
          const next = splice(t, value);
          if (!next) return fail('The source has moved. Click the text again.');
          if (next.equals(old)) return { ok: true, unchanged: true };
          const pagePath = typeof page === 'string' && page.startsWith('/') ? page : '/';
          let kept = false;
          holding++;
          try {
            const was = await render(host, pagePath);
            const saved = backup(t.abs, old);
            await write(t.abs, next);
            const now = await render(host, pagePath);
            let error;
            if (now.status >= 400) {
              const err = await nextError();
              error = err?.message ? (err.loc?.file ? `${decode(err.message)}\n(${rel(err.loc.file)}${err.loc.line ? `:${err.loc.line}` : ''})` : decode(err.message)) : errorFrom(now.html, now.status);
            }
            else if (was.status < 400 && now.html === was.html) error = `Saved to ${t.label}, but the page didn't change, so that wasn't where this text comes from.`;
            if (error) {
              await write(t.abs, old);
              return fail(error, { reverted: true });
            }
            kept = true;
            targets.delete(id);
            undoStack.push({ abs: t.abs, before: old, after: next, label: t.label });
            return { ok: true, where: t.label, backup: saved };
          } finally {
            holding--;
            // the browser reloads only for a change that stayed; a refused one leaves the page, and your text, as they were
            if (kept) send({ type: 'full-reload', path: '*' });
          }
        };

        const undo = async () => {
          const u = undoStack.at(-1);
          if (!u) return fail('Nothing to undo.');
          if (!fs.readFileSync(u.abs).equals(u.after)) {
            undoStack.pop();
            return fail(`${rel(u.abs)} has been changed since, so it wasn't put back. Its backup is in .edit-backups/.`);
          }
          holding++;
          try { await write(u.abs, u.before); } finally { holding--; send({ type: 'full-reload', path: '*' }); }
          undoStack.pop();
          return { ok: true, where: u.label };
        };

        server.middlewares.use(async (req, res, next) => {
          const url = (req.url ?? '').replace(/^\/[^/]*\/__edit/, '/__edit');
          if (!url.startsWith('/__edit/')) return next();
          const reply = (code, body) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); };
          // only the site's own pages, in this browser: refuse requests from any other origin
          const origin = req.headers.origin;
          if (req.method !== 'POST' || (origin && new URL(origin).host !== req.headers.host)) return reply(403, fail('Not allowed.'));
          let body = '';
          for await (const chunk of req) body += chunk;
          let input;
          try { input = JSON.parse(body || '{}'); } catch { return reply(400, fail('Bad request.')); }
          try {
            const op = url.slice('/__edit/'.length);
            if (op === 'resolve') return reply(200, await resolve(input));
            if (op === 'save') return reply(200, await save(input, req.headers.host));
            if (op === 'undo') return reply(200, await undo());
            if (op === 'status') return reply(200, { ok: true, undo: undoStack.at(-1)?.label ?? null });
            return reply(404, fail('Unknown request.'));
          } catch (e) {
            return reply(500, fail(e instanceof Error ? e.message : String(e)));
          }
        });
      },
    },
  };
}
