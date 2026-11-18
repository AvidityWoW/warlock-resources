#!/usr/bin/env python3
"""Build src/data/talents.json (the Talents page) and fetch its icons into public/talents/.

    python3 tools/talents/gen.py ~/spelldb

The tree is the Forever client's own: the warlock's class tree in the retail-style Trait tables (TraitTree 1116, built by
spelldb's spellbook.talents, hotfixes applied). The client's old Talent table is Classic's tree and misses Forever's
changes (Wrack, Bane of Havoc, Incinerate, Malevolence...), so it isn't used. From the tree:
- each talent: its tab, row and column, ranks, icon, and its description at every rank (the values from the talent's
  curves);
- gates: "N points in these talents" (the rows above it, in practice 5 per row) before it can be learned;
- prerequisites: a talent that must be maxed first (the tree's arrows).
Icons are Wowhead's copies of the client's (wow.zamimg.com, 56 px), downloaded once and kept in public/talents/; a
missing one is fetched again on the next run.
"""
import json, pathlib, re, sys, time, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'src/data/talents.json'
ICONS = ROOT / 'public/talents'
SPELLDB = pathlib.Path(sys.argv[1]).expanduser().resolve()
sys.path.insert(0, str(SPELLDB))
import os; os.chdir(SPELLDB)
from spellbook import talents                    # noqa: E402
from spellbook.config import BUILD               # noqa: E402

CLASS = 'Warlock'
FIRST_LEVEL = 10                                 # the first talent point; one more each level after

info = next(t for t in talents.index() if t['class'] == CLASS)
tree = talents.tree(info['id'])

out = []
for n in tree['nodes_list']:
    if n['offGrid'] or n['type'] != 'Single' or len(n['entries']) != 1:
        sys.exit(f"talent node {n['id']} isn't a plain one on the grid; the page doesn't handle it")
    e = n['entries'][0]
    for t in e['ranks']:
        if '$' in t or not t.strip():
            sys.exit(f"{e['name']}: description not filled in: {t!r}")
    out.append({
        'id': n['id'], 'tab': n['tab'], 'row': n['row'], 'col': n['col'],
        'name': e['name'], 'spell': e['spell'], 'max': e['maxRanks'], 'icon': e['icon'],
        'ranks': [re.sub(r'\s+', ' ', t).strip() for t in e['ranks']],
        # every gate as points needed among a set of talents (the rows above, in this tree)
        'gates': [{'points': g['points'], 'nodes': g['nodes']} for g in n['gates']],
        # the talents to max first (the arrows); the tree only has the "sufficient" kind
        'needs': [p['node'] for p in n['prereqs'] if p['kind'] in ('sufficient', 'required')],
    })
kinds = {p['kind'] for n in tree['nodes_list'] for p in n['prereqs']}
if kinds - {'sufficient', 'required'}:
    sys.exit(f'unexpected prerequisite kinds: {kinds}')
ids = {t['id']: t for t in out}
for t in out:
    for need in t['needs'] + [m for g in t['gates'] for m in g['nodes']]:
        if need not in ids:
            sys.exit(f"{t['name']} points at talent {need}, which isn't in the tree")
    # the page draws an arrow straight down a column, so a prerequisite has to sit above, in the same tree and column
    for need in t['needs']:
        s = ids[need]
        if (s['tab'], s['col']) != (t['tab'], t['col']) or s['row'] >= t['row']:
            sys.exit(f"{s['name']} -> {t['name']} isn't straight down a column; the page can't draw that arrow")

# the page lists talents tab by tab, row by row, left to right; the build in the URL is one digit each, in this order
out.sort(key=lambda t: (t['tab'], t['row'], t['col']))
data = {
    'build': BUILD, 'points': info['points'], 'firstLevel': FIRST_LEVEL,
    'tabs': [{'name': t['name'], 'cols': t['cols'], 'rows': max(x['row'] for x in out if x['tab'] == t['index'])} for t in tree['tabs']],
    'talents': out,
}
OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n')
print(f"{len(out)} talents, {data['points']} points, build {BUILD} -> {OUT.relative_to(ROOT)}")

ICONS.mkdir(parents=True, exist_ok=True)
for t in out:
    f = ICONS / f"{t['icon']}.jpg"
    if f.exists():
        continue
    req = urllib.request.Request(f"https://wow.zamimg.com/images/wow/icons/large/{t['icon']}.jpg", headers={'User-Agent': 'Mozilla/5.0'})
    f.write_bytes(urllib.request.urlopen(req, timeout=30).read())
    print('icon', f.name)
    time.sleep(0.2)
