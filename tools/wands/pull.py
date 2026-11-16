#!/usr/bin/env python3
"""Add wands that have turned up on Wowhead's Forever site to src/data/wands.json.

    python3 tools/wands/pull.py ~/spelldb

The client's Item table (spelldb, class 2 subclass 19) lists every wand ID, but many have no stats there. For each ID the
site doesn't have yet, this asks Wowhead for the item's XML; an ID Wowhead doesn't know is skipped (it may appear later, so
run this again). Wands already in the file are left as they are, except that a `noSource` wand moves up once Wowhead gives
it a source. Left out: test and monster items, and wands a warlock can't use. Fetched XML is cached in
tools/wands/wowhead-cache/ (not committed); delete it to ask again.
"""
import datetime, json, pathlib, re, sqlite3, subprocess, sys, time

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'src/data/wands.json'
CACHE = pathlib.Path(__file__).parent / 'wowhead-cache'
UA = 'Mozilla/5.0'
JUNK = re.compile(r'\bTest\b|Deprecated|^Monster - |\[PH\]|^\d+ (Epic|Green) |^Chilton Wand$')
WARLOCK = 256   # class mask
KIND = {1: 'Crafted', 2: 'Drop', 4: 'Quest', 5: 'Vendor'}   # Wowhead's source ids
LINK = {1: 'npc', 2: 'object', 5: 'quest', 6: 'spell'}      # sourcemore's t


def get(url, path):
    if not path.exists():
        CACHE.mkdir(exist_ok=True)
        subprocess.run(['curl', '-s', '-m', '30', '-A', UA, '-o', str(path), url], check=True)
        time.sleep(0.3)
    return path.read_text(errors='replace')


def zone(z):
    return json.loads(get(f'https://nether.wowhead.com/forever/tooltip/zone/{z}', CACHE / f'zone-{z}.json'))['name']


def wand(i, fresh=False):
    """The item as a wands.json row, or None if Wowhead doesn't have it or it isn't one for the list."""
    path = CACHE / f'{i}.xml'
    if fresh and path.exists():
        path.unlink()
    xml = get(f'https://www.wowhead.com/forever/item={i}&xml', path)
    if '<item id=' not in xml:
        path.unlink()   # not on Wowhead yet: ask again next time
        return None
    j = json.loads('{' + re.search(r'<json><!\[CDATA\[(.*?)\]\]>', xml, re.S).group(1) + '}')
    tip = re.search(r'<htmlTooltip><!\[CDATA\[(.*?)\]\]></htmlTooltip>', xml, re.S).group(1)
    if JUNK.search(j['name']) or j['quality'] < 1 or (j.get('reqclass') and not j['reqclass'] & WARLOCK):
        return None
    lo, hi, school = re.search(r'<!--dmg-->(\d+) - (\d+) (?:(\w+) )?Damage', tip).groups()
    speed = float(re.search(r'<!--spd-->([\d.]+)', tip).group(1))
    lo, hi = int(lo), int(hi)
    src, more = j.get('source'), (j.get('sourcemore') or [{}])[0]
    source = None
    if src:
        kind = KIND.get(src[0], 'Other')
        link = {'type': LINK[more['t']], 'id': more['ti'], 'name': more['n']} if more.get('n') and more.get('t') in LINK else None
        where = zone(more['z']) if more.get('z') else None
        if kind == 'Drop' and not more and 'Binds when equipped' in tip:
            kind = 'World drop'
        text = kind if link or not where else f'{kind} in {where}'
        source = {'kind': kind, 'text': text, 'link': link, 'where': where if link else None}
    return {'id': i, 'name': j['name'], 'quality': j['quality'], 'ilvl': j['level'], 'req': j.get('reqlevel'), 'side': None,
            'school': school or 'Physical', 'dps': round((lo + hi) / 2 / speed, 3), 'damage': [lo, hi], 'speed': speed, 'source': source}


def main():
    db = pathlib.Path(sys.argv[1]).expanduser()
    con = sqlite3.connect(f'file:{db}/data/spells.db?mode=ro', uri=True)
    ids = sorted(int(r[0]) for r in con.execute("select ID from Item where ClassID='2' and SubclassID='19'"))
    sys.path.insert(0, str(db))
    from spellbook.config import BUILD
    data = json.loads(OUT.read_text())
    have = {w['id'] for w in data['wands'] + data['noSource']}
    added, sourced = [], []
    for w in list(data['noSource']):
        new = wand(w['id'], fresh=True)
        if new and new['source']:
            data['noSource'].remove(w)
            data['wands'].append(new)
            sourced.append(new)
    for i in ids:
        if i not in have and (w := wand(i)):
            (data['wands'] if w['source'] else data['noSource']).append(w)
            added.append(w)
    data['wands'].sort(key=lambda w: (w['req'] or 0, w['ilvl']))   # the page sorts for itself; this keeps the diff small
    data['noSource'].sort(key=lambda w: w['ilvl'])
    if added or sourced:
        data['build'], data['pulled'] = BUILD.rsplit('.', 1)[0] if BUILD.count('.') > 3 else BUILD, datetime.date.today().isoformat()
        OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False))
    for label, rows in (('Added', added), ('Now has a source', sourced)):
        for w in rows:
            s = w['source']
            print(f"{label}: {w['name']} ({w['id']}), level {w['req']}, {w['dps']:.1f} DPS {w['school']}, "
                  + (f"{s['text']}{': ' + s['link']['name'] if s['link'] else ''}{' (' + s['where'] + ')' if s['where'] else ''}" if s else 'no source'))
    print(f"{len(added)} added, {len(sourced)} gained a source; {len(data['wands'])} wands, {len(data['noSource'])} without a source")


if __name__ == '__main__':
    main()
