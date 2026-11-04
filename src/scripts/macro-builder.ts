// Macro builder (the Guide tab on the macros page): clauses of condition sets → a /cast line, coloured like the macro
// cards, with its length, a plain-English reading, and warnings for common slips. The draft is kept in localStorage
// (macros:builder) so it survives a reload.
import { COND_MENUS, PRESETS, type Preset } from '../data/macro-guide';
import { LIMIT, highlight } from '../lib/macro';

type CondSet = Record<string, string>;
interface State { cmd: string; tip: boolean; stop: boolean; petattack: boolean; clauses: { spell: string; sets: CondSet[] }[] }
const KEY = 'macros:builder';
const blank = (): State => ({ cmd: '/cast', tip: true, stop: false, petattack: false, clauses: [{ spell: '', sets: [{}] }] });
const fromPreset = (p: Preset): State => ({ cmd: p.command, tip: p.tooltip, stop: false, petattack: false,
  clauses: p.clauses.map((c) => ({ spell: c.spell, sets: c.sets.map((s) => ({ ...s })) })) });

const ORDER = COND_MENUS.map((m) => m.key);
const condsOf = (s: CondSet) => ORDER.map((k) => s[k]).filter(Boolean);
const setText = (s: CondSet) => `[${condsOf(s).join(',')}]`;
/** a set that always holds: no conditions, or only an @unit (which aims the spell but checks nothing) */
const always = (s: CondSet) => ORDER.every((k) => k === 'unit' || !s[k]);

export function macroText(st: State): string {
  const clauses = st.clauses.map((c) => {
    const bare = c.sets.length === 1 && !condsOf(c.sets[0]).length;
    return bare ? c.spell.trim() : `${c.sets.map(setText).join('')} ${c.spell.trim()}`;
  });
  return [st.tip && '#showtooltip', st.stop && '/stopcasting', st.petattack && '/petattack [harm,nodead]', `${st.cmd} ${clauses.join('; ')}`]
    .filter(Boolean).join('\n');
}

// ---- plain English
const UNIT: Record<string, string> = { '': 'your target', '@target': 'your target', '@mouseover': 'the unit under your cursor', '@focus': 'your focus',
  '@player': 'you', '@pet': 'your demon', '@targettarget': "your target's target", '@focustarget': "your focus's target",
  '@pettarget': "your demon's target", '@cursor': 'the ground under your cursor' };
const MOD: Record<string, string> = { nomod: 'you hold no modifier key', mod: 'you hold any modifier key', 'mod:shift': 'you hold Shift', 'mod:ctrl': 'you hold Ctrl',
  'mod:alt': 'you hold Alt', 'mod:shift,mod:ctrl': 'you hold Shift and Ctrl', 'mod:shift/ctrl': 'you hold Shift or Ctrl' };
const OTHER: Record<string, string> = { combat: "you're in combat", nocombat: "you're out of combat", pet: 'a demon is out', nopet: 'no demon is out',
  nochanneling: "you're not channeling", channeling: "you're channeling", group: "you're in a group", 'group:raid': "you're in a raid", nogroup: "you're on your own" };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function reading(st: State): { steps: string[]; warns: string[] } {
  const steps: string[] = [], warns: string[] = [];
  let done = false, n = 0;
  st.clauses.forEach((c, ci) => {
    const spell = c.spell.trim();
    if (!spell) warns.push(`Clause ${ci + 1} has no spell yet.`);
    c.sets.forEach((s, si) => {
      n++;
      const where = `Clause ${ci + 1}${c.sets.length > 1 ? `, set ${si + 1}` : ''}`;
      if (done) { warns.push(`${where} can never be reached: an earlier set always holds.`); return; }
      const u = UNIT[s.unit ?? ''];
      const unitBits = [s.react === 'harm' && 'hostile', s.react === 'help' && 'friendly', s.dead === 'nodead' && 'alive', s.dead === 'dead' && 'dead'].filter(Boolean);
      const conds = [
        unitBits.length && `${u} is ${unitBits.join(' and ')}`,
        s.react === 'exists' && `there is ${u}`, s.react === 'noexists' && `there is no ${u.replace(/^(your|the) /, '')}`,
        s.mod && MOD[s.mod], ...['combat', 'chan', 'group'].map((k) => s[k] && OTHER[s[k]]),
        s.pet && (OTHER[s.pet] ?? `your ${s.pet.slice(4)} is out`),
      ].filter(Boolean) as string[];
      const what = `cast <b>${esc(spell || '…')}</b>${s.unit && s.unit !== '@target' ? (s.unit === '@cursor' ? ' at the ground under your cursor' : ` on ${u}`) : ''}`;
      const lead = conds.length ? `If ${conds.join(', and ')}: ` : n === 1 ? 'Always ' : 'Otherwise ';
      steps.push(lead + what + '.');
      if (s.unit && !['@player', '@cursor', ''].includes(s.unit) && !s.react && !s.dead)
        warns.push(`${where}: <code>[${esc(s.unit)}]</code> with no harm, help, dead or exists check always holds, even when nobody is there, so later clauses never get a turn.`);
      if (s.unit === '@cursor' && (s.react || s.dead)) warns.push(`${where}: <code>@cursor</code> is a spot on the ground, not a unit, so harm, help and dead don't apply.`);
      if (s.unit === '@pet' && s.pet) warns.push(`${where}: <code>pet:</code> checks are fine, but remember <code>@pet</code> also aims the spell at your demon.`);
      if (always(s)) done = true;
    });
  });
  if (!done) steps.push('Otherwise nothing happens.');
  return { steps, warns };
}

document.addEventListener('astro:page-load', () => {
  const list = document.querySelector<HTMLOListElement>('#b-clauses');
  if (!list) return;
  const ctl = new AbortController();
  const on = { signal: ctl.signal };
  document.addEventListener('astro:before-swap', () => ctl.abort(), { once: true });

  const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
  const tpl = $<HTMLTemplateElement>('#b-clause-tpl');
  const cmd = $<HTMLSelectElement>('#b-cmd'), tip = $<HTMLInputElement>('#b-tip'), stop = $<HTMLInputElement>('#b-stop'), pa = $<HTMLInputElement>('#b-petattack');
  const preset = $<HTMLSelectElement>('#b-preset');
  const code = $('#b-code'), chars = $('#b-chars'), explain = $('#b-explain'), warn = $('#b-warn');

  let st: State;
  try { st = JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? fromPreset(PRESETS[0]); } catch { st = fromPreset(PRESETS[0]); }
  if (!Array.isArray(st.clauses) || !st.clauses.length) st = blank();

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
  const output = () => {
    const text = macroText(st);
    code.innerHTML = highlight(text);
    chars.textContent = `${text.length}/${LIMIT}`;
    chars.classList.toggle('over', text.length > LIMIT);
    const r = reading(st);
    if (text.length > LIMIT) r.warns.unshift(`Too long: the game stops at ${LIMIT} characters.`);
    explain.innerHTML = r.steps.map((s) => `<li>${s}</li>`).join('');
    warn.innerHTML = r.warns.map((w) => `<li>${w}</li>`).join('');
    save();
  };

  // Draw the clauses from the state. Typing and menu changes only update the state and output, so focus stays put.
  const draw = () => {
    cmd.value = st.cmd; tip.checked = st.tip; stop.checked = st.stop; pa.checked = st.petattack;
    list.replaceChildren(...st.clauses.map((c, ci) => {
      const li = tpl.content.firstElementChild!.cloneNode(true) as HTMLLIElement;
      li.dataset.ci = String(ci);
      li.querySelector('.b-num')!.textContent = ci ? `; ${ci + 1}` : '1';
      const inp = li.querySelector('input')!;
      inp.value = c.spell;
      li.querySelector<HTMLButtonElement>('[data-act="del-clause"]')!.hidden = st.clauses.length === 1;
      li.querySelector('.b-sets')!.replaceChildren(...c.sets.map((s, si) => {
        const row = document.createElement('div');
        row.className = 'b-set';
        row.dataset.si = String(si);
        if (si) row.insertAdjacentHTML('beforeend', '<span class="b-ortag">or</span>');
        for (const m of COND_MENUS) {
          const lab = document.createElement('label');
          lab.className = 'b-cond';
          lab.innerHTML = `<span>${m.label}</span>`;
          const sel = document.createElement('select');
          sel.dataset.key = m.key;
          for (const [v, t] of m.options) sel.add(new Option(t, v, false, (s[m.key] ?? '') === v));
          sel.classList.toggle('set', !!s[m.key]);
          lab.append(sel);
          row.append(lab);
        }
        if (c.sets.length > 1) row.insertAdjacentHTML('beforeend', '<button type="button" class="b-x" data-act="del-set" aria-label="Remove this condition set" title="Remove this condition set">×</button>');
        return row;
      }));
      return li;
    }));
    output();
  };

  const where = (el: Element) => {
    const li = el.closest<HTMLElement>('.b-clause')!, row = el.closest<HTMLElement>('.b-set');
    return { ci: +li.dataset.ci!, si: row ? +row.dataset.si! : -1 };
  };
  list.addEventListener('input', (e) => {
    const t = e.target as HTMLElement;
    const { ci, si } = where(t);
    if (t instanceof HTMLInputElement) st.clauses[ci].spell = t.value;
    else if (t instanceof HTMLSelectElement) {
      const s = st.clauses[ci].sets[si];
      if (t.value) s[t.dataset.key!] = t.value; else delete s[t.dataset.key!];
      t.classList.toggle('set', !!t.value);
    }
    preset.value = '';
    output();
  }, on);
  list.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
    if (!b) return;
    const { ci, si } = where(b);
    if (b.dataset.act === 'del-clause') st.clauses.splice(ci, 1);
    if (b.dataset.act === 'add-set') st.clauses[ci].sets.push({});
    if (b.dataset.act === 'del-set') st.clauses[ci].sets.splice(si, 1);
    preset.value = '';
    draw();
  }, on);
  $('#b-add').addEventListener('click', () => {
    st.clauses.push({ spell: '', sets: [{}] });
    preset.value = '';
    draw();
    list.querySelector<HTMLInputElement>('.b-clause:last-child input')?.focus();
  }, on);
  preset.addEventListener('change', () => { st = preset.value === '' ? blank() : fromPreset(PRESETS[+preset.value]); draw(); }, on);
  cmd.addEventListener('change', () => { st.cmd = cmd.value; output(); }, on);
  tip.addEventListener('change', () => { st.tip = tip.checked; output(); }, on);
  stop.addEventListener('change', () => { st.stop = stop.checked; output(); }, on);
  pa.addEventListener('change', () => { st.petattack = pa.checked; output(); }, on);

  const copy = $<HTMLButtonElement>('#b-copy');
  let timer = 0;
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(code.textContent!); }
    catch { getSelection()?.selectAllChildren(code); return; }   // no clipboard access: select it, ready for Ctrl+C
    copy.classList.add('done');
    clearTimeout(timer);
    timer = window.setTimeout(() => copy.classList.remove('done'), 1600);
  }, on);

  draw();
});
