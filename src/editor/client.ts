// The dev-only text editor's page side (see integration.mjs). An "Edit text" button joins the header; while it's on,
// clicking text opens it for editing instead of following links. Plain text is edited where it stands (Enter saves,
// Esc cancels); text with markup in it ([[links]], [Name](item:123), inline tags) opens a box under it, with the page
// showing the result as you type (Ctrl+Enter saves). The dev server reloads the page after a save.

export {};   // a module, so its names stay its own

type Resolved =
  | { ok: true; id: string; kind: 'text' | 'rich' | 'html'; raw: string; inPlace?: boolean; where: string }
  | { ok: false; error: string; readonly?: boolean; where?: string };
type Saved = { ok: true; where?: string; unchanged?: boolean } | { ok: false; error: string; reverted?: boolean };

const ON = 'grimoire-edit';         // sessionStorage: edit mode is on
const NOTE = 'grimoire-edit-note';  // sessionStorage: the message to show after the reload a save brings

const post = async <T>(op: string, body: object): Promise<T> => {
  const res = await fetch(`/__edit/${op}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return res.json() as Promise<T>;
};

// ---------------------------------------------------------------------------------------------------------------------
// Look: injected once per page (in-site navigation swaps <head>)

const STYLES = `
.ge-toggle{align-self:center;flex:none;font:inherit;font-size:.8rem;line-height:1.3;padding:3px 10px;border:1px dashed var(--muted,#888);border-radius:999px;background:none;color:var(--muted,#888);cursor:pointer;white-space:nowrap}
.ge-toggle:hover{color:var(--text,#eee)}
.ge-toggle[aria-pressed="true"]{border:1px solid var(--accent,#9f6);color:var(--accent,#9f6)}
html.ge-on [data-ge-src]:not(:has([data-ge-src]:hover)):hover{outline:1px dashed var(--accent,#9f6);outline-offset:2px;cursor:text}
html.ge-on a, html.ge-on button, html.ge-on summary, html.ge-on label{cursor:text}
.ge-editing{outline:2px solid var(--accent,#9f6)!important;outline-offset:2px}
.ge-box{position:absolute;z-index:1000;width:min(640px,calc(100vw - 24px));padding:10px;border:1px solid var(--line,#444);border-radius:8px;background:var(--raised,#222);color:var(--text,#eee);box-shadow:0 8px 30px #0008;font-size:.85rem}
.ge-box textarea{display:block;width:100%;min-height:7em;box-sizing:border-box;padding:6px;font:13px/1.4 ui-monospace,monospace;background:var(--bg,#111);color:inherit;border:1px solid var(--line,#444);border-radius:6px;resize:vertical}
.ge-box .ge-row{display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap}
.ge-box .ge-where{opacity:.7;margin-right:auto}
.ge-box button{font:inherit;padding:3px 12px;border-radius:6px;border:1px solid var(--line,#444);background:none;color:inherit;cursor:pointer}
.ge-box button.ge-save{border-color:var(--accent,#9f6)}
.ge-err{margin-top:8px;padding:6px 8px;border-radius:6px;background:#a2222233;border:1px solid #c44;white-space:pre-wrap}
.ge-toast{position:fixed;z-index:1001;left:50%;bottom:20px;translate:-50% 0;max-width:min(640px,calc(100vw - 24px));padding:8px 14px;border-radius:8px;background:var(--raised,#222);color:var(--text,#eee);border:1px solid var(--line,#444);box-shadow:0 8px 30px #0008;font-size:.85rem;display:flex;gap:12px;align-items:center}
.ge-toast.bad{border-color:#c44}
.ge-toast button{font:inherit;padding:2px 10px;border-radius:6px;border:1px solid var(--line,#444);background:none;color:inherit;cursor:pointer}
`;
function style() {
  if (document.getElementById('ge-style')) return;
  const s = document.createElement('style');
  s.id = 'ge-style';
  s.textContent = STYLES;
  document.head.append(s);
}

// ---------------------------------------------------------------------------------------------------------------------
// Messages

let toastTimer = 0;
function toast(text: string, opts: { bad?: boolean; undo?: boolean; stay?: boolean } = {}) {
  document.querySelector('.ge-toast')?.remove();
  const t = document.createElement('div');
  t.className = 'ge-toast' + (opts.bad ? ' bad' : '');
  t.setAttribute('role', 'status');
  const span = document.createElement('span');
  span.textContent = text;
  t.append(span);
  if (opts.undo) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Undo';
    b.addEventListener('click', async () => {
      const r = await post<Saved>('undo', {});
      if (r.ok) { sessionStorage.setItem(NOTE, JSON.stringify({ text: `Put back ${r.where}.` })); reloadSoon(); }
      else toast(r.error, { bad: true });
    });
    t.append(b);
  }
  const x = document.createElement('button');
  x.type = 'button';
  x.textContent = '×';
  x.setAttribute('aria-label', 'Dismiss');
  x.addEventListener('click', () => t.remove());
  t.append(x);
  document.body.append(t);
  clearTimeout(toastTimer);
  if (!opts.stay) toastTimer = window.setTimeout(() => t.remove(), opts.bad ? 12000 : 6000);
}

/** the dev server reloads the page after a save; this is the fallback if it doesn't */
const reloadSoon = () => window.setTimeout(() => location.reload(), 2500);

// ---------------------------------------------------------------------------------------------------------------------
// Rendering a rich string as you type, the way the pages do (lib/rich.ts and lib/glossary.ts)

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const renderRich = (s: string) => esc(s)
  .replace(/\[([^\]]+)\]\((item|spell|quest|npc):(\d+)\)/g, '<a class="link" href="#">$1</a>')
  .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '<a class="xref" href="#">$1</a>')
  .replace(/`([^`]+)`/g, '<code>$1</code>');

// ---------------------------------------------------------------------------------------------------------------------
// Editing

let active: { el: HTMLElement; done: () => void } | null = null;

async function save(id: string, value: string, box: HTMLElement | null, el: HTMLElement): Promise<boolean> {
  const status = box?.querySelector<HTMLElement>('.ge-where');
  if (status) status.textContent = 'Saving and checking the page…';
  else toast('Saving and checking the page…', { stay: true });
  const r = await post<Saved>('save', { id, value, page: location.pathname });
  if (!r.ok) {
    const msg = r.reverted ? `Not saved: the file was put back.\n${r.error}` : r.error;
    if (box) {
      box.querySelector('.ge-err')?.remove();
      const e = document.createElement('div');
      e.className = 'ge-err';
      e.textContent = msg;
      box.append(e);
      if (status) status.textContent = 'Fix it and save again, or cancel.';
    } else {
      toast(msg, { bad: true });
      el.focus();
    }
    return false;
  }
  if (r.unchanged) { toast('No change.'); return true; }
  sessionStorage.setItem(NOTE, JSON.stringify({ text: `Saved to ${r.where}.`, undo: true }));
  reloadSoon();
  return true;
}

/** plain text, edited where it stands */
function editInPlace(el: HTMLElement, id: string, where: string) {
  const before = el.textContent ?? '';
  el.classList.add('ge-editing');
  el.contentEditable = 'plaintext-only';
  el.focus();
  const sel = getSelection();
  sel?.selectAllChildren(el);
  toast(`Editing ${where}. Enter saves, Esc cancels.`, { stay: true });
  const stop = () => {
    el.removeEventListener('keydown', key);
    el.removeAttribute('contenteditable');
    el.classList.remove('ge-editing');
    active = null;
  };
  const cancel = () => { el.textContent = before; stop(); document.querySelector('.ge-toast')?.remove(); };
  const key = async (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (await save(id, el.textContent ?? '', null, el)) stop();
    }
  };
  el.addEventListener('keydown', key);
  active = { el, done: cancel };
}

/** text with markup, or text that shares its element with other things: a box under the element */
function editInBox(el: HTMLElement, id: string, kind: 'text' | 'rich' | 'html', raw: string, where: string) {
  const beforeHtml = el.innerHTML;
  const box = document.createElement('div');
  box.className = 'ge-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', `Edit text from ${where}`);
  const ta = document.createElement('textarea');
  ta.value = raw;
  ta.spellcheck = true;
  const row = document.createElement('div');
  row.className = 'ge-row';
  const info = document.createElement('span');
  info.className = 'ge-where';
  const marks = [/\[\[/.test(raw) && '[[Term]] links', /\]\((?:item|spell|quest|npc):/.test(raw) && '[Name](item:123) links', /`/.test(raw) && '`code`'].filter(Boolean);
  const how = kind === 'html' ? 'HTML markup' : kind === 'rich' ? `keep the ${marks.join(', ')}` : 'plain text';
  info.textContent = `${where} · ${how} · Ctrl+Enter saves, Esc cancels`;
  const ok = document.createElement('button');
  ok.type = 'button'; ok.className = 'ge-save'; ok.textContent = 'Save';
  const no = document.createElement('button');
  no.type = 'button'; no.textContent = 'Cancel';
  row.append(info, no, ok);
  box.append(ta, row);
  document.body.append(box);
  const r = el.getBoundingClientRect();
  box.style.top = `${r.bottom + scrollY + 8}px`;
  box.style.left = `${Math.max(12, Math.min(r.left + scrollX, scrollX + document.documentElement.clientWidth - box.offsetWidth - 12))}px`;
  el.classList.add('ge-editing');
  ta.focus();
  // live preview in the page itself; plain text in a mixed element can't be previewed without touching its neighbours
  const preview = () => {
    if (kind === 'html') el.innerHTML = ta.value;
    else if (kind === 'rich') el.innerHTML = renderRich(ta.value);
  };
  ta.addEventListener('input', preview);
  const stop = () => { box.remove(); el.classList.remove('ge-editing'); active = null; };
  const cancel = () => { el.innerHTML = beforeHtml; stop(); };
  const go = async () => { ok.disabled = true; if (await save(id, ta.value, box, el)) stop(); ok.disabled = false; };
  ok.addEventListener('click', go);
  no.addEventListener('click', cancel);
  box.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); go(); }
  });
  active = { el, done: cancel };
}

/** the text node under the pointer, for an element that holds more than one piece of text */
function textAt(x: number, y: number): string {
  // caretPositionFromPoint is the standard one; Safari only has caretRangeFromPoint
  const d = document as unknown as {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const node = d.caretPositionFromPoint?.(x, y)?.offsetNode ?? d.caretRangeFromPoint?.(x, y)?.startContainer;
  return node?.nodeType === Node.TEXT_NODE ? node.textContent ?? '' : '';
}

async function open(e: MouseEvent) {
  const target = e.target as Element;
  if (target.closest('.ge-box, .ge-toast, .ge-toggle')) return;
  if (!document.documentElement.classList.contains('ge-on')) return;
  // clicks inside the text being edited move the caret, as usual (but still don't follow a link)
  if (active?.el.contains(target)) { if (target.closest('a')) e.preventDefault(); return; }
  const el = target.closest<HTMLElement>('[data-ge-src]');
  if (!el) return;
  e.preventDefault();
  e.stopPropagation();
  active?.done();
  const [file, loc] = (el.dataset.geSrc ?? '').split('|');
  const r = await post<Resolved>('resolve', {
    file, loc,
    nodeText: textAt(e.clientX, e.clientY), elemText: el.textContent ?? '',
  });
  if (!r.ok) { toast(r.where ? `${r.error} (${r.where})` : r.error, { bad: true }); return; }
  if (r.kind === 'text' && r.inPlace && el.children.length === 0) editInPlace(el, r.id, r.where);
  else editInBox(el, r.id, r.kind, r.raw, r.where);
}

// ---------------------------------------------------------------------------------------------------------------------
// The toggle, and keeping it all in place across in-site navigation

function setOn(on: boolean) {
  document.documentElement.classList.toggle('ge-on', on);
  document.querySelector('.ge-toggle')?.setAttribute('aria-pressed', String(on));
  if (on) sessionStorage.setItem(ON, '1'); else sessionStorage.removeItem(ON);
  if (!on) active?.done();
}

function mount() {
  style();
  const bar = document.querySelector('.site-header .container');
  if (bar && !bar.querySelector('.ge-toggle')) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ge-toggle';
    b.textContent = 'Edit text';
    b.title = 'Dev server only: click text on the page to change it in the source files';
    b.addEventListener('click', () => setOn(!document.documentElement.classList.contains('ge-on')));
    bar.insertBefore(b, bar.querySelector('.theme-toggle'));
  }
  setOn(sessionStorage.getItem(ON) === '1');
  const note = sessionStorage.getItem(NOTE);
  if (note) {
    sessionStorage.removeItem(NOTE);
    const n = JSON.parse(note) as { text: string; undo?: boolean };
    toast(n.text, { undo: n.undo });
  }
}

// clicks are caught before links and buttons see them, so a link's text can be edited without following it
document.addEventListener('click', open, true);
document.addEventListener('astro:after-swap', () => { active = null; mount(); });
mount();
