#!/usr/bin/env python3
"""List positive `X.contains("literal")` assertions whose literal is missing
from every repository file the test binary reads. A rough static scan: it
reports candidates for stale assertions; each one is then checked by hand."""
import glob, re, sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
lit = re.compile(r'(!?)\s*([a-z_]+)\s*\.contains\(\s*(r#"(.*?)"#|"((?:[^"\\]|\\.)*)")', re.S)
read = re.compile(r'read_lf\("([^"]+)"\)|include_str!\("([^"]+)"\)|read_to_string\(repository::path\("([^"]+)"\)')
def unescape(s):
    return s.encode('utf-8').decode('unicode_escape').encode('latin-1').decode('utf-8')
for test in sorted((root / 'rust/tests').glob('*.rs')):
    src = test.read_text()
    files = set()
    for m in read.finditer(src):
        name = next(g for g in m.groups() if g)
        for base in (root / 'rust', root, test.parent):
            p = (base / name)
            if p.is_file():
                files.add(p.resolve()); break
    if not files:
        continue
    corpus = '\n'.join(p.read_text(errors='replace').replace('\r\n', '\n') for p in files)
    for m in lit.finditer(src):
        neg, var, _, raw, esc = m.groups()
        if neg or '{' in (esc or raw or '') and 'format' in src[max(0, m.start()-40):m.start()]:
            continue
        text = raw if raw is not None else unescape(esc)
        if '{{' in text:
            text = text.replace('{{', '{').replace('}}', '}') if 'format!' in src[max(0, m.start()-60):m.start()] else text
        if text not in corpus:
            line = src[:m.start()].count('\n') + 1
            print(f'{test.relative_to(root)}:{line}: {var}.contains({text[:90]!r})')
