"""Resolve diff3 conflict hunks in one file by an ordered list of choices.
Each choice: 'ours', 'theirs', 'base', or a literal replacement string, or a
callable(ours, base, theirs) -> str. Usage: import and call resolve(path, choices)."""
import re
HUNK = re.compile(r'<<<<<<< [^\n]*\n(.*?)\|\|\|\|\|\|\| [^\n]*\n(.*?)=======\n(.*?)>>>>>>> [^\n]*\n', re.S)
def resolve(path, choices):
    s = open(path).read()
    hunks = HUNK.findall(s)
    assert len(hunks) == len(choices), (path, len(hunks), len(choices))
    it = iter(choices)
    def sub(m):
        c = next(it); o, b, t = m.group(1), m.group(2), m.group(3)
        if c == 'ours': return o
        if c == 'theirs': return t
        if c == 'base': return b
        if callable(c): return c(o, b, t)
        return c
    s = HUNK.sub(sub, s)
    assert '<<<<<<< ' not in s and '>>>>>>> ' not in s, path
    open(path, 'w').write(s)
