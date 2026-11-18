#!/usr/bin/env python3
"""Build src/data/consumes.json: the consumables worth a warlock's bag slot in WoW Forever.

    python3 tools/consumes/gen.py ~/spelldb

Every consumable (item class 0) in the Forever client is read with its use text (spelldb), and sorted into a group by the
rules in `group_of`: flasks, elixirs, burst potions, mana and health, weapon oils, food and scrolls. Mana and health is
then split by shared cooldown (the client's spell category): potions, and the healthstone group (healthstones, runes,
Felwood's plants), which has a cooldown of its own. Within a group,
`line_of` names the buff an item gives (Fortitude, Defense, Spell damage), so the page can put like buffs together. Anything that fits none is left out; `EXTRA` adds the few the rules miss: the runes (not
filed as consumables), Felwood's plants (bind on pickup), the healthstones you conjure, and `QUEST`, the bind-on-pickup
buffs from repeatable quests, which are grouped by where you get them. Then Wowhead's Forever item XML (cached in tools/consumes/wowhead-cache/, not
committed; delete it to ask again) gives the source and, for crafted ones, the materials. An item with no source on Wowhead
is left out: the client is full of consumables that aren't in the game (test items, Season of Discovery leftovers).
"""
import csv, datetime, json, pathlib, re, subprocess, sys, time

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'src/data/consumes.json'
CACHE = pathlib.Path(__file__).parent / 'wowhead-cache'
SPELLDB = pathlib.Path(sys.argv[1]).expanduser().resolve()
sys.path.insert(0, str(SPELLDB))
import os; os.chdir(SPELLDB)
from spellbook import items                      # noqa: E402
from spellbook.config import BUILD               # noqa: E402

KIND = {1: 'Crafted', 2: 'Drop', 4: 'Quest', 5: 'Vendor'}   # Wowhead's source ids
LINK = {1: 'npc', 2: 'object', 5: 'quest', 6: 'spell'}      # sourcemore's t
SKILL = {171: 'Alchemy', 185: 'Cooking', 333: 'Enchanting', 202: 'Engineering', 164: 'Blacksmithing', 165: 'Leatherworking',
         197: 'Tailoring', 129: 'First Aid', 356: 'Fishing', 773: 'Inscription'}
SKIP = re.compile(r'Perishable|Endless|Experience|Testing|McWeaksauce', re.I)
EXTRA = {12662: 'restore', 20520: 'restore',   # Demonic Rune, Dark Rune: trade goods in the client
         11951: 'restore', 11952: 'restore'}   # Whipper Root Tuber, Night Dragon's Breath: bind on pickup
HEALTHSTONE = {5512: 6201, 5511: 6202, 5509: 5699, 5510: 11729, 9421: 11730}   # the stone each Create Healthstone rank makes, untalented
EXTRA.update({i: 'restore' for i in HEALTHSTONE})
POTION_CD, STONE_CD = 4, 1153                 # spell categories: each is one shared 2 min cooldown
# bind-on-pickup buffs handed out by repeatable quests, by place (that place is their heading on the page)
QUEST = {8423: 'Blasted Lands', 8411: 'Blasted Lands', 8424: 'Blasted Lands',      # Cerebral Cortex Compound, Lung Juice Cocktail, Gizzard Gum
         20079: "Zul'Gurub", 20081: "Zul'Gurub", 20080: "Zul'Gurub",              # Spirit, Swiftness and Sheen of Zanza
         **{i: 'Winterspring' for i in (12458, 12451, 12460, 12450, 12459, 12455, 12457)}}   # the Jujus: Guile, Power, Might, Flurry, Escape, Ember, Chill
EXTRA.update({i: 'quest' for i in QUEST})
# where Wowhead's Forever pages give no source: how Classic hands them out
FALLBACK = {11951: 'Cleansed Whipper Root in Felwood (as in Classic)', 11952: "Cleansed Night Dragon in Felwood (as in Classic)"}
OTHER_SCHOOL = re.compile(r'\b(frost|holy|nature|arcane spell)\b', re.I)


def group_of(x, text):
    """Which section an item goes in, or None."""
    sub, bop = x['subName'], x['bonding'] == 'Binds when picked up'
    if SKIP.search(x['name']) or x['origin'] == 'sod': return None
    if re.search(r'applied to target weapon', text) and re.search(r'spell damage|mana', text): return 'oil'
    if bop: return None
    if sub == 'Flasks': return None if re.search(r'turn to stone|dodged', text) else 'flask'
    if sub == 'Elixirs':
        if re.search(r'spell (fire |shadow )?damage|(fire|shadow) spell damage|damage done by magical', text, re.I) and not OTHER_SCHOOL.search(text): return 'elixir'
        if re.search(r'Intellect|mana (every|per)|maximum health|Increases armor', text, re.I) and not re.search(r'Agility', text): return 'elixir'
        return None
    if sub == 'Potions':
        if re.search(r'Spell Damage', text): return 'burst'
        if re.search(r'(Restores|heals) [\d%]+ ?(mana|health)|Restores \d+ mana and', text) and 'Battlegrounds' not in text: return 'restore'
        return None
    if re.search(r'mana at the cost|Restores \d+ to \d+ mana', text): return 'restore'
    if sub == 'Food & Drink' and re.search(r'well fed and gain \d+ (Spell Damage|Intellect)', text, re.I): return 'food'
    if sub == 'Scrolls' and 'Intellect' in text: return 'scroll'
    return None


# the buff an item gives, first match wins; this is also the order the lines come in within a group
LINES = [('Familiars', r'familiar'), ('Healthstones', r'instantly restores \d+ life'), ('Runes', r'at the cost of'), ('Health now, damage after', r'suffer 75%'),
         ('Against one kind of enemy', r'against (elementals|undead)'), ('Fire damage', r'fire damage|fire spell'),
         ('Shadow damage', r'shadow damage'), ('Spell damage', r'spell damage|damage done by magical'),
         ('Mana regeneration', r'mana (every|per) 5|mana to the caster every'), ('Intellect', r'intellect'),
         ('Fortitude (maximum health)', r'maximum health'), ('Defense (armor)', r'armor'),
         ('Mana and health', r'mana and (\d+ )?health|health and \d+ mana'), ('Mana', r'mana'), ('Health', r'health'), ('Other', r'')]


def line_of(text):
    return next(i for i, (_, pat) in enumerate(LINES) if re.search(pat, text, re.I))


def effect_of(group, text):
    """The use text, trimmed to what it does."""
    if group == 'food':
        m = re.search(r'gain (\d+ (?:Spell Damage|Intellect)) for (\d+ min)', text, re.I)
        return f'Well Fed: {m.group(1)} for {m.group(2)}'
    t = re.sub(r'\$\?.*$', '', text)
    t = re.sub(r'\s*You can only have the effect of one flask at a time\.', '', t)
    t = re.sub(r'^While applied to target weapon it (\w)', lambda m: m.group(1).upper(), t)
    return re.sub(r'\s+', ' ', t).strip()


def get(url, path):
    if not path.exists():
        CACHE.mkdir(exist_ok=True)
        subprocess.run(['curl', '-s', '-m', '30', '-A', 'Mozilla/5.0', '-o', str(path), url], check=True)
        time.sleep(0.3)
    return path.read_text(errors='replace')


def zone(z):
    return json.loads(get(f'https://nether.wowhead.com/forever/tooltip/zone/{z}', CACHE / f'zone-{z}.json'))['name']


def wowhead(i):
    """(source, materials) from the item's Wowhead Forever XML; (None, []) when Wowhead has no source for it."""
    xml = get(f'https://www.wowhead.com/forever/item={i}&xml', CACHE / f'{i}.xml')
    m = re.search(r'<json><!\[CDATA\[(.*?)\]\]>', xml, re.S)
    if not m: return None, []
    j = json.loads('{' + m.group(1) + '}')
    src, more = j.get('source'), (j.get('sourcemore') or [{}])[0]
    if not src: return None, []
    kind = KIND.get(src[0], 'Other')
    mats = []
    if kind == 'Crafted':
        made = re.search(r'<createdBy>(.*?)</createdBy>', xml, re.S)
        mats = [{'id': int(a), 'name': n.replace('&amp;', '&').replace('&#039;', "'"), 'count': int(c)}
                for a, n, c in re.findall(r'<reagent id="(\d+)" name="([^"]*)"[^>]*count="(\d+)"', made.group(1) if made else '')]
        return {'kind': kind, 'text': SKILL.get(more.get('s'), 'Crafted'), 'link': {'type': 'spell', 'id': more['ti'], 'name': more['n']} if more.get('ti') else None, 'where': None}, mats
    link = {'type': LINK[more['t']], 'id': more['ti'], 'name': more['n']} if more.get('n') and more.get('t') in LINK else None
    where = zone(more['z']) if more.get('z') else None
    if kind == 'Drop' and not where: kind, link = 'World drop', None      # no one place: it drops all over
    return {'kind': kind, 'text': kind, 'link': link, 'where': where}, mats


def main():
    from spellbook.db import scalar
    fx = {r['ID']: r for r in csv.DictReader(open('data/csv/ItemEffect.csv', encoding='utf-8'))}
    item_fx = {}
    for r in csv.DictReader(open('data/csv/ItemXItemEffect.csv', encoding='utf-8')): item_fx.setdefault(r['ItemID'], []).append(fx.get(r['ItemEffectID']))

    def cooldown(i):
        """the shared cooldown an item's use is on: the category on the item, else on its spell"""
        for e in item_fx.get(str(i), []):
            if e: return int(e['SpellCategoryID']) or int(scalar('select Category from SpellCategories where SpellID=?', (e['SpellID'],)) or 0)
        return 0

    item = {r['ID']: r for r in csv.DictReader(open('data/csv/Item.csv', encoding='utf-8'))}
    rows, unsourced = [], []
    for r in csv.DictReader(open('data/csv/ItemSparse.csv', encoding='utf-8')):
        if item.get(r['ID'], {}).get('ClassID') != '0' and int(r['ID']) not in EXTRA: continue
        x = items.item(int(r['ID']))
        if x['junk'] or items._junk(x['name']): continue
        text = ' '.join(e['text'] or '' for e in x['effects'] if e['how'].startswith('Use'))
        g = EXTRA.get(x['id']) or group_of(x, text)
        if not g or not x['reqLevel'] and g == 'restore' and x['id'] not in EXTRA: continue
        if g == 'restore':
            g = {POTION_CD: 'potion', STONE_CD: 'stone'}.get(cooldown(x['id']))
            if not g: sys.exit(f"{x['name']}: neither the potion nor the healthstone cooldown")
        if g == 'burst' and cooldown(x['id']) != POTION_CD: sys.exit(f"{x['name']}: not on the potion cooldown")
        if x['id'] in HEALTHSTONE:
            src, mats = {'kind': 'Other', 'text': 'Conjured', 'link': {'type': 'spell', 'id': HEALTHSTONE[x['id']], 'name': 'Create Healthstone'}, 'where': None}, []
        else: src, mats = wowhead(x['id'])
        if not src and x['id'] in FALLBACK: src = {'kind': 'Other', 'text': FALLBACK[x['id']], 'link': None, 'where': None}
        if not src:
            unsourced.append(x['name']); continue
        rows.append({'id': x['id'], 'name': x['name'], 'quality': x['quality'], 'req': x['reqLevel'] or None, 'ilvl': x['level'],
                     'group': g, 'line': line_of(effect_of(g, text)), 'effect': effect_of(g, text), 'source': src, 'mats': mats})
    rows.sort(key=lambda w: (list(QUEST).index(w['id']) if w['id'] in QUEST else w['line'], w['req'] or 0, w['ilvl'], w['name']))
    for w in rows:
        del w['ilvl']
        w['line'] = QUEST.get(w['id']) or LINES[w['line']][0]
    out = {'build': BUILD.rsplit('.', 1)[0] if BUILD.count('.') > 3 else BUILD, 'pulled': datetime.date.today().isoformat(), 'items': rows}
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False))
    by = {}
    for w in rows: by[w['group']] = by.get(w['group'], 0) + 1
    print(len(rows), 'consumables', by)
    print(len(unsourced), 'left out with no source on Wowhead:', ', '.join(sorted(set(unsourced))))


if __name__ == '__main__':
    main()
