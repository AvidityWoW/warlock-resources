"""Build src/data/weapons.json for The Grimoire: warlock-usable one-hand weapons, off-hands and staves in WoW Forever.

Stats come from the Forever client (via the spelldb code); sources from the cmangos classic-db dump (classic server data),
plus crafting recipes from the client. Items new to Forever have no classic source unless they're crafted.

python3 tools/weapons/gen.py <spelldb dir> <cmangos db.sql> <dir with Map.csv, AreaTable.csv, FactionTemplate.csv> src/data/weapons.json <wowhead cache dir>

Spell damage comes from Wowhead's Forever tooltips: the game servers add or change spell power on many items by hotfix, so
the client tables are missing it (Int, Sta, Spi and item level all match; only spell damage differs). Tooltips are fetched
once into the cache dir (one JSON per item) and reused; delete a file to refetch it. Without a tooltip, the client's numbers
below are used.

Spell damage: plain Spell Power / Spell Damage Done are named stats, but school damage (Shadow, Fire) is stored as stats with
no public name (88, 85), which spelldb leaves out, so they're read here from the item's stat budget the same way. A few old
items still carry it as an equip spell instead; those are read too.
"""
import collections, csv, datetime, json, os, re, sys, time, urllib.request

SPELLDB, DBSQL, DB2, OUT, WHCACHE = (sys.argv[1:6] + [None])[:5]
sys.path.insert(0, SPELLDB)
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import os; os.chdir(SPELLDB)
from spellbook import items                      # noqa: E402
from spellbook.db import q, q1, scalar           # noqa: E402
from spellbook.config import BUILD               # noqa: E402
import cdb                                       # noqa: E402

WARLOCK = 1 << 8
ALLIANCE_RACES, HORDE_RACES = 1 | 4 | 8 | 64, 2 | 16 | 32 | 128     # human dwarf night-elf gnome | orc undead tauren troll

# an item is listed only if it has spell damage (spell power, or Shadow or Fire damage); everything else is left out,
# including random-enchant items whose base stats have none (what their suffix rolls can't be shown)
POWER = ('sp', 'shadow', 'fire')
SCHOOL_STAT = {88: 'shadow', 85: 'fire'}          # unnamed stats: school spell damage (87 frost, 89 arcane: not for warlocks)
STAT_KEY = {'Spell Power': 'sp', 'Spell Damage Done': 'sp', 'Intellect': 'int', 'Stamina': 'sta', 'Spirit': 'spi',
            'Mana Regeneration': 'mp5', 'Crit Rating': 'crit', 'Hit Rating': 'hit', 'Haste Rating': 'haste'}
SCHOOL_MAGIC, SHADOW, FIRE = 126, 32, 4

csv_rows = lambda p: list(csv.DictReader(open(p, encoding='utf-8')))
item_rows = {r['ID']: r for r in csv_rows('data/csv/Item.csv')}
sparse = {r['ID']: r for r in csv_rows('data/csv/ItemSparse.csv')}


def slot_of(it, sp):
    c, sc, inv = it['ClassID'], it['SubclassID'], sp['InventoryType']
    if c == '2' and sc in ('7', '15') and inv in ('13', '21'): return 'main', ('Sword' if sc == '7' else 'Dagger')
    if c == '2' and sc in ('7', '15') and inv == '22': return 'off', ('Sword' if sc == '7' else 'Dagger')
    if inv == '23': return 'off', 'Held in off-hand'
    if c == '2' and sc == '10': return 'staff', 'Staff'
    return None, None


WH_URL = 'https://nether.wowhead.com/forever/tooltip/item/{}'


def wowhead_tooltip(item_id):
    """The item's Wowhead Forever tooltip HTML, from the cache (fetched once), or None."""
    if not WHCACHE: return None
    p = os.path.join(WHCACHE, f'{item_id}.json')
    if not os.path.exists(p):
        try:
            req = urllib.request.Request(WH_URL.format(item_id), headers={'User-Agent': 'Mozilla/5.0 (warlock-resources gear generator)'})
            open(p, 'wb').write(urllib.request.urlopen(req, timeout=20).read())
            time.sleep(0.15)
        except Exception as e:
            print('no tooltip for', item_id, e); return None
    try: return json.load(open(p, encoding='utf-8')).get('tooltip')
    except ValueError: return None


def wowhead_power(tip):
    """{'sp', 'shadow', 'fire'} from a tooltip's Equip lines; party-wide auras (Atiesh) and healing-only lines don't count."""
    text = re.sub(r'<[^>]+>', '', tip)
    out = {}
    for line in re.split(r'(?=Equip: )', text):
        if 'party members' in line: continue
        m = re.search(r'Increases damage and healing done by magical spells and effects by up to (\d+)', line) \
            or re.search(r'and damage done by up to (\d+) for all magical spells', line) \
            or re.search(r'Increases damage done by magical spells and effects by up to (\d+)', line) \
            or re.search(r'\+(\d+) Spell Power', line)
        if m: out['sp'] = out.get('sp', 0) + int(m.group(1))
        for school in ('Shadow', 'Fire'):
            m = re.search(rf'Increases damage done by {school} spells and effects by up to (\d+)', line)
            if m: out[school.lower()] = out.get(school.lower(), 0) + int(m.group(1))
    return out


def stats_of(item_id):
    """({stat key: value}, [extra equip lines]) for one item."""
    it = items.item(int(item_id))
    st = collections.Counter()
    for s in it['stats']:
        k = STAT_KEY.get(s['name'])
        if k: st[k] += s['value']
    sp = sparse[item_id]                          # school damage: its share of the item's stat budget, like the named stats
    slot, col = items._BUDGET_SLOT.get(int(sp['InventoryType'])), items._GOOD.get(int(sp['OverallQualityID']))
    rp = q1("select * from RandPropPoints where ID=?", (sp['ItemLevel'],))
    if slot is not None and col and rp:
        budget = float(rp.get(f"{col}_{slot}") or 0)
        for i in range(10):
            k, pct = SCHOOL_STAT.get(int(sp.get(f'StatModifier_bonusStat_{i}') or -1)), float(sp.get(f'StatPercentEditor_{i}') or 0)
            if k and pct: st[k] += int(round(budget * pct / 10000))
    for e in it['effects']:
        if e['how'] != 'Equip': continue
        for fx in q("select EffectAura,EffectMiscValue_0,EffectBasePointsF from SpellEffect where SpellID=?", (str(e['spell']),)):
            aura, mask, pts = int(fx['EffectAura'] or 0), int(fx['EffectMiscValue_0'] or 0), round(float(fx['EffectBasePointsF'] or 0)) + 1
            if aura == 13 and mask & SCHOOL_MAGIC == SCHOOL_MAGIC: st['sp'] += pts           # damage done, all schools
            elif aura == 13 and mask == SHADOW: st['shadow'] += pts
            elif aura == 13 and mask == FIRE: st['fire'] += pts
    tip = wowhead_tooltip(item_id)                  # the live game's spell damage wins over the client's
    if tip is not None:
        for k in ('sp', 'shadow', 'fire'): st.pop(k, None)
        st.update(wowhead_power(tip))
    return dict(st), it


# ---- candidates
cands = {}
for iid, sp in sparse.items():
    it = item_rows.get(iid)
    if not it: continue
    slot, typ = slot_of(it, sp)
    if not slot: continue
    mask = int(sp['AllowableClass'])
    if mask not in (-1, 0) and not mask & WARLOCK: continue
    name = sp['Display_lang']
    if int(sp['OverallQualityID']) < 1 or items._junk(name) or re.search(r'^Monster -|\bTest\b|\[PH\]|Deprecated|^\d+ (Epic|Green|Blue)|DEBUG', name, re.I):
        continue
    cands[iid] = (slot, typ, sp)

# ---- sources
D = cdb.load(DBSQL, ['creature_loot_template', 'reference_loot_template', 'gameobject_loot_template', 'item_loot_template', 'npc_vendor',
                     'npc_vendor_template', 'creature_template', 'creature', 'gameobject_template', 'gameobject', 'quest_template', 'item_template'])
maps = {r['ID']: r for r in csv_rows(f'{DB2}/Map.csv')}
areas = {r['ID']: r['AreaName_lang'] for r in csv_rows(f'{DB2}/AreaTable.csv')}
ftmpl = {r['ID']: r for r in csv_rows(f'{DB2}/FactionTemplate.csv')}
ctmpl = {r['Entry']: r for r in D['creature_template']}
gtmpl = {r['entry']: r for r in D['gameobject_template']}
itmpl = {r['entry']: r for r in D['item_template']}
cmaps = collections.defaultdict(set)
for r in D['creature']: cmaps[r['id']].add(r['map'])
gmaps = collections.defaultdict(set)
for r in D['gameobject']: gmaps[r['id']].add(r['map'])


def instance(map_ids):
    """Name of the dungeon/raid when every spawn is inside one, else None."""
    names = {maps[m]['MapName_lang'] for m in map_ids if m in maps and maps[m].get('InstanceType') not in ('0', '', None)}
    world = [m for m in map_ids if m in maps and maps[m].get('InstanceType') in ('0', '', None)]
    return next(iter(names)) if len(names) == 1 and not world else None


def side_of_faction(tid):
    f = ftmpl.get(tid)
    if not f: return None
    g = int(f['FriendGroup'] or 0) | int(f['FactionGroup'] or 0)
    a, h = bool(g & 2), bool(g & 4)
    return 'Alliance' if a and not h else 'Horde' if h and not a else None


def side_of_races(mask):
    m = int(mask or 0)
    if not m: return None
    a, h = bool(m & ALLIANCE_RACES), bool(m & HORDE_RACES)
    return 'Alliance' if a and not h else 'Horde' if h and not a else None


# references: which reference tables (transitively) hold each item
ref_items = collections.defaultdict(set)              # ref entry -> items
ref_refs = collections.defaultdict(set)               # ref entry -> nested ref entries
for r in D['reference_loot_template']:
    if int(r['mincountOrRef']) < 0: ref_refs[r['entry']].add(str(-int(r['mincountOrRef'])))
    else: ref_items[r['entry']].add(r['item'])
def ref_closure(ref, seen=None):
    seen = seen or set()
    if ref in seen: return set()
    seen.add(ref)
    out = set(ref_items[ref])
    for n in ref_refs[ref]: out |= ref_closure(n, seen)
    return out
ref_all = {ref: ref_closure(ref) for ref in set(ref_items) | set(ref_refs)}


def holders(table):
    """item -> [(holder entry, chance, via reference?)]"""
    out = collections.defaultdict(list)
    for r in D[table]:
        mc = int(r['mincountOrRef'])
        if mc < 0:
            for i in ref_all.get(str(-mc), ()): out[i].append((r['entry'], 0.0, True))
        else:
            out[r['item']].append((r['entry'], abs(float(r['ChanceOrQuestChance'] or 0)), False))
    return out
creature_drops, go_drops, item_drops = holders('creature_loot_template'), holders('gameobject_loot_template'), holders('item_loot_template')
# loot templates are keyed by the template's LootId, not always the creature entry
loot_to_creatures = collections.defaultdict(list)
for e, c in ctmpl.items():
    if c.get('LootId') not in (None, '', '0'): loot_to_creatures[c['LootId']].append(e)
loot_to_go = collections.defaultdict(list)
for e, g in gtmpl.items():
    if g['type'] in ('3', '25'): loot_to_go[g['data1']].append(e)           # chest / fishing hole: data1 is the loot id

vendors = collections.defaultdict(list)
vtmpl = collections.defaultdict(list)
for r in D['npc_vendor_template']: vtmpl[r['entry']].append(r['item'])
for r in D['npc_vendor']: vendors[r['item']].append(r['entry'])
for e, c in ctmpl.items():
    for i in vtmpl.get(c.get('VendorTemplateId') or '0', ()): vendors[i].append(e)

quests = collections.defaultdict(list)
for r in D['quest_template']:
    rc = int(r['RequiredClasses'] or 0)
    if rc and not rc & WARLOCK: continue                                     # another class's quest
    for k in [f'RewChoiceItemId{i}' for i in range(1, 7)] + [f'RewItemId{i}' for i in range(1, 5)]:
        if r[k] not in ('0', ''): quests[r[k]].append(r)

crafted = {}
for e in q("select SpellID, EffectItemType from SpellEffect where Effect='24'"):
    if e['EffectItemType'] in cands and e['EffectItemType'] not in crafted:
        skill = scalar("select s.DisplayName_lang from SkillLineAbility a join SkillLine s on s.ID=a.SkillLine where a.Spell=?", (e['SpellID'],))
        if skill: crafted[e['EffectItemType']] = (int(e['SpellID']), skill)


def source(iid):
    """(source dict, side) — the easiest-to-name way to get it — or (None, None)."""
    if iid in quests:
        qs = sorted(quests[iid], key=lambda r: int(r['QuestLevel'] or 0))
        r = qs[0]
        z = int(r['ZoneOrSort'] or 0)
        sides = {side_of_races(x['RequiredRaces']) for x in qs}
        return ({'kind': 'Quest', 'text': 'Quest', 'link': {'type': 'quest', 'id': int(r['entry']), 'name': r['Title']},
                 'where': areas.get(str(z)) if z > 0 else None, 'minLevel': int(r['MinLevel'] or 0)}, sides.pop() if len(sides) == 1 else None)
    if iid in vendors:
        vs = [v for v in vendors[iid] if v in ctmpl and cmaps.get(v)]
        if vs:
            v = vs[0]; sides = {side_of_faction(ctmpl[x]['Faction']) for x in vs}
            return ({'kind': 'Vendor', 'text': 'Vendor', 'link': {'type': 'npc', 'id': int(v), 'name': ctmpl[v]['Name']},
                     'where': instance(cmaps[v])}, sides.pop() if len(sides) == 1 else None)
    if iid in crafted:
        sid, skill = crafted[iid]
        return {'kind': 'Crafted', 'text': 'Crafted', 'link': {'type': 'spell', 'id': sid, 'name': skill}, 'where': None}, None
    drops = [(c, ch, ref) for loot, ch, ref in creature_drops.get(iid, []) for c in loot_to_creatures.get(loot, []) if cmaps.get(c)]
    if drops:
        mobs = {c for c, _, _ in drops}
        if len(mobs) >= 10 or all(ref for _, _, ref in drops) and len(mobs) >= 4:
            return {'kind': 'World drop', 'text': 'World drop', 'link': None, 'where': None}, None
        c = max(drops, key=lambda d: (d[1], int(ctmpl[d[0]]['MaxLevel'] or 0)))[0]
        return {'kind': 'Drop', 'text': 'Drop', 'link': {'type': 'npc', 'id': int(c), 'name': ctmpl[c]['Name']}, 'where': instance(cmaps[c])}, None
    gos = [g for loot, _, _ in go_drops.get(iid, []) for g in loot_to_go.get(loot, []) if gmaps.get(g)]
    if gos:
        if len(set(gos)) >= 10: return {'kind': 'World drop', 'text': 'World drop', 'link': None, 'where': None}, None
        g = gos[0]
        return {'kind': 'Other', 'text': f"Container: {gtmpl[g]['name']}", 'link': None, 'where': instance(gmaps[g])}, None
    box = [b for b, _, _ in item_drops.get(iid, []) if b in sparse]
    if box:
        return {'kind': 'Other', 'text': 'Contained in', 'link': {'type': 'item', 'id': int(box[0]), 'name': sparse[box[0]]['Display_lang']}, 'where': None}, None
    return None, None


out = {'build': BUILD.rsplit('.', 1)[0] if BUILD.count('.') > 3 else BUILD, 'pulled': datetime.date.today().isoformat(),
       'sourceNote': 'Classic 1.12 server data (cmangos classic-db), plus crafting recipes from the game client',
       'items': [], 'noSource': []}
skipped = 0
for iid, (slot, typ, sp) in sorted(cands.items(), key=lambda kv: (int(kv[1][2]['RequiredLevel'] or 0), int(kv[1][2]['ItemLevel']), kv[1][2]['Display_lang'])):
    st, it = stats_of(iid)
    src, side = source(iid)
    side = side or side_of_races(sp.get('AllowableRace_0'))
    row = {'id': int(iid), 'name': sp['Display_lang'], 'quality': int(sp['OverallQualityID']), 'ilvl': int(sp['ItemLevel']),
           'req': int(sp['RequiredLevel']) or None, 'slot': slot, 'type': typ, 'side': side, 'stats': st, 'source': src}
    # Many quest rewards have no level requirement: file them under the quest's level, anything else under an estimate
    ql = src.pop('minLevel', 0) if src else 0
    if not row['req']:
        row['req'], row['reqFrom'] = (ql, 'quest') if ql else (max(1, row['ilvl'] - 5), 'ilvl')
    t = itmpl.get(iid)
    if t and int(t.get('RandomProperty') or 0): row['affixes'] = True
    if not any(st.get(k) for k in POWER):
        skipped += 1; continue                    # no spell damage: not worth a warlock's weapon slot
    (out['items'] if src else out['noSource']).append(row)
for k in ('items', 'noSource'):
    out[k].sort(key=lambda r: (r['req'], r['ilvl'], r['name']))                 # level order, now every item has a level
json.dump(out, open(OUT, 'w'), indent=1, ensure_ascii=False)
c = collections.Counter((r['slot'], r['source']['kind']) for r in out['items'])
print(len(out['items']), 'with a source,', len(out['noSource']), 'without,', skipped, 'left out (no spell damage) |', dict(sorted(c.items())))
