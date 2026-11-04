"""Minimal reader for the cmangos classic-db SQL dump: column names from CREATE TABLE, rows from INSERT statements."""
import re
def _values(s, i):
    """Yield tuples from a VALUES list starting at s[i]; stops at the terminating ';'."""
    n = len(s)
    while i < n:
        while s[i] in ' \n\r\t,': i += 1
        if s[i] == ';': return
        assert s[i] == '(', s[i:i+40]
        i += 1; row = []; cur = []; q = False
        while True:
            c = s[i]
            if q:
                if c == '\\': cur.append(s[i+1]); i += 2; continue
                if c == "'":
                    if s[i+1] == "'": cur.append("'"); i += 2; continue
                    q = False; i += 1; continue
                cur.append(c); i += 1; continue
            if c == "'": q = True; i += 1; continue
            if c == ',': row.append(''.join(cur).strip()); cur = []; i += 1; continue
            if c == ')': row.append(''.join(cur).strip()); i += 1; break
            cur.append(c); i += 1
        yield row
def load(path, tables):
    s = open(path, encoding='utf-8', errors='replace').read()
    cols = {}
    for m in re.finditer(r'CREATE TABLE `(\w+)` \((.*?)\n\)', s, re.S):
        if m.group(1) in tables:
            cols[m.group(1)] = re.findall(r'^\s*`(\w+)`', m.group(2), re.M)
    out = {t: [] for t in tables}
    for m in re.finditer(r'INSERT INTO `(\w+)`(?: \([^)]*\))? VALUES', s):
        t = m.group(1)
        if t not in tables: continue
        for row in _values(s, m.end()):
            out[t].append(dict(zip(cols[t], row)))
    return out
