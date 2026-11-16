"""Build src/data/spellbook.json (Spells by level) and src/data/demons.json (Demons) for The Grimoire.

python3 tools/spellbook/gen.py <spelldb dir> [<wowhead cache dir>]

Everything comes from the Forever client tables in spelldb (data/spells.db, hotfixes applied):
- spells: SkillLineAbility rows of the three warlock skill lines (Affliction 355, Demonology 354, Destruction 593), minus
  Season of Discovery runes (AcquireMethod 3), passives, "... Effect" helper spells and talents that have no level of
  their own. The level is SpellLevels.
- demon abilities: the pets' skill lines (Imp 188, Voidwalker 204, Succubus 205, Felhunter 189); the Incubus has none of
  its own and shares the Succubus's. Grimoires are the ItemSparse rows named "Grimoire of <ability> (Rank N)", with the
  client's vendor price.
Wowhead's Forever tooltips (https://nether.wowhead.com/forever/tooltip/spell/<id>, cached one JSON per spell in the cache
dir, refetched when missing) add the one thing the client lacks: which spells are marked "Talent". The client's Talent
table is the Classic tree and misses Forever's new ones (Wrack, Bane of Havoc, Conflagrate from 25). The tooltip's
"Requires level" is also checked against the client's level; a mismatch stops the build.

How a spell is learned: the client can't tell a trainer spell from a quest reward, so the quest ones are listed in QUEST
below. They are the spell rewards of Classic's warlock quests (cmangos classic-db quest_template.RewSpell), each
confirmed on Wowhead's Forever quest page ("You will learn"). Trainer costs are not in the client and are left out.
"""
import html, json, os, re, sqlite3, sys, time, urllib.request

SPELLDB = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'wowhead-cache')
OUT = os.path.join(HERE, '..', '..', 'src', 'data')
db = sqlite3.connect(f'file:{SPELLDB}/data/spells.db?mode=ro', uri=True)
BUILD = db.execute("select value from Meta where key='build'").fetchone()[0]

TREES = {'355': 'Affliction', '354': 'Demonology', '593': 'Destruction'}
PETS = {'188': 'Imp', '204': 'Voidwalker', '205': 'Succubus', '189': 'Felhunter'}
# spell id -> the quest that teaches it (the last quest of its chain; see src/data/quests.ts)
QUEST = {688: 'imp', 697: 'voidwalker', 712: 'succubus', 713: 'incubus', 691: 'felhunter', 5784: 'felsteed', 1122: 'infernal',
         18540: 'doomguard', 23161: 'dreadsteed'}
# taught by an item: its tooltip on Wowhead Forever says "Teaches <spell>". The four rank books dropped in Ahn'Qiraj (and
# Shadow Ward's in Naxxramas's time) in Classic; where they come from in Forever isn't known.
ITEM = {437169: 'Grimoire of Portal of Summoning', 25307: 'Grimoire of Shadow Bolt X', 25309: 'Grimoire of Immolate VIII',
        25311: 'Grimoire of Corruption VII', 28610: 'Grimoire of Shadow Ward IV'}
# not spells you learn: a rune's helper that the client marks as known from the start, and a talent's stun
SKIP = ('Metamorphosis : Demon Charge', 'Pyroclasm')
UNKNOWN = set()                                         # spells nothing found so far teaches (none now)
MOUNTS = (5784, 23161)                                  # in the Riding skill line, not a warlock one
PASSIVE = 0x40


def tooltip(spell):
    path = os.path.join(CACHE, f'{spell}.json')
    if not os.path.exists(path) or os.path.getsize(path) < 40:
        os.makedirs(CACHE, exist_ok=True)
        with urllib.request.urlopen(f'https://nether.wowhead.com/forever/tooltip/spell/{spell}') as r:
            open(path, 'wb').write(r.read())
        time.sleep(0.2)
    j = json.load(open(path, encoding='utf-8'))
    return j['name'], re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', j.get('tooltip', ''))))


def rows(lines):
    marks = ','.join('?' * len(lines))
    return db.execute(f"""select distinct a.SkillLine, a.Spell, n.Name_lang, s.NameSubtext_lang, a.AcquireMethod,
        l.BaseLevel, l.SpellLevel, m.Attributes_0
        from SkillLineAbility a join SpellName n on n.ID = a.Spell left join Spell s on s.ID = a.Spell
        left join SpellLevels l on l.SpellID = a.Spell left join SpellMisc m on m.SpellID = a.Spell
        where a.SkillLine in ({marks}) and a.AcquireMethod != '3'""", list(lines)).fetchall()


def level_of(base, spell):
    return int(spell) if spell not in (None, '0') else int(base) if base not in (None, '0') else None


def rank_of(sub):
    m = re.match(r'Rank (\d+)', sub or '')
    return int(m.group(1)) if m else None


def checked(spell, name, level):
    """the Wowhead tooltip's text, after checking its name and level against the client's"""
    wh_name, tip = tooltip(spell)
    m = re.search(r'Requires level (\d+)', tip)
    if wh_name != name or (m and int(m.group(1)) != level):
        sys.exit(f'{spell} {name} (level {level}): Wowhead says {wh_name}, {m and m.group(1)}')
    return tip


# ---- spells by level
spells, seen = [], set()
for line, spell, name, sub, acq, base, lvl, attr in rows(TREES):
    sid, level = int(spell), level_of(base, lvl)
    if sid in seen or level is None or name.endswith(' Effect') or int(attr or 0) & PASSIVE:
        continue
    seen.add(sid)
    tip = checked(sid, name, level)
    if name in SKIP:
        continue
    how = ('start' if acq == '2' else 'quest' if sid in QUEST else 'item' if sid in ITEM else 'unknown' if sid in UNKNOWN
           else 'talent' if ' Talent ' in tip else 'train')
    if how == 'talent' and level <= 1:
        continue                      # a talent with no level of its own (Soul Link, Bane of Havoc): it comes with the point
    spells.append({'id': sid, 'name': name, 'rank': rank_of(sub), 'level': level, 'tree': TREES[line], 'how': how})
for sid in MOUNTS:
    name = db.execute('select Name_lang from SpellName where ID = ?', (str(sid),)).fetchone()[0]
    base, lvl = db.execute('select BaseLevel, SpellLevel from SpellLevels where SpellID = ?', (str(sid),)).fetchone()
    checked(sid, name, level_of(base, lvl))
    spells.append({'id': sid, 'name': name, 'rank': None, 'level': level_of(base, lvl), 'tree': 'Mount', 'how': 'quest'})

spells.sort(key=lambda s: (s['level'], s['tree'], s['name'], s['rank'] or 0))
first = {}
for s in spells:
    f = first.setdefault(s['name'], s)
    if f is s:
        s['first'] = True
    elif f['how'] == 'talent':
        s['talent'] = True            # a trained rank of a spell whose first rank is a talent
    if s['how'] == 'quest':
        s['quest'] = QUEST[s['id']]
    if s['how'] == 'item':
        s['item'] = ITEM[s['id']]

one = lambda o: json.dumps(o, separators=(',', ':'), ensure_ascii=False)     # one row per line, so diffs read well
with open(os.path.join(OUT, 'spellbook.json'), 'w', encoding='utf-8') as f:
    f.write('{"build":%s,"spells":[\n%s\n]}\n' % (one(BUILD), ',\n'.join(one(s) for s in spells)))

# ---- demon abilities
grimoires = {n: (int(i), int(p), int(r)) for i, n, p, r in
             db.execute("select ID, Display_lang, BuyPrice, RequiredLevel from ItemSparse where Display_lang like 'Grimoire of %'")}
demons = {}
for line, spell, name, sub, acq, base, lvl, attr in rows(PETS):
    level = level_of(base, lvl)
    if level is None or name.endswith(' Effect') or name.startswith(('Tamed Pet', 'Warlock Pet')):
        continue
    sid, rank = int(spell), rank_of(sub)
    checked(sid, name, level)
    r = {'id': sid, 'name': name, 'rank': rank, 'level': level}
    if acq == '2':
        r['innate'] = True            # the demon knows it when summoned
    else:
        g = grimoires.get(f'Grimoire of {name} (Rank {rank})') or grimoires.get(f'Grimoire of {name}')
        if not g:
            sys.exit(f'no grimoire for {name} rank {rank}')
        if g[2] != level:
            sys.exit(f'grimoire of {name} rank {rank} needs level {g[2]}, the spell {level}')
        r['grimoire'], r['price'] = g[0], g[1]
    demons.setdefault(PETS[line], []).append(r)
for d in demons.values():
    d.sort(key=lambda r: (r['level'], r['name']))

with open(os.path.join(OUT, 'demons.json'), 'w', encoding='utf-8') as f:
    f.write('{"build":%s,"abilities":{\n%s\n}}\n' % (one(BUILD), ',\n'.join(
        '%s:[\n%s\n]' % (one(k), ',\n'.join(one(r) for r in v)) for k, v in demons.items())))
print(len(spells), 'spells;', {k: len(v) for k, v in demons.items()})
