"""Change the authored producer; its copied variant uses the public generator."""
from pathlib import Path

path = Path('tools/translation/prepare-real-source-fixtures.mjs')
source = path.read_text()
marker = '\n// Generated invocation-local source/CST allocation variant; original producer stays exact.\n'
original, generated = source.split(marker)
before = 'packed=gzipSync(stored.raw,{level:1,mtime:0})'
assert original.count(before) == generated.count(before) == 1
original = original.replace(before, 'packed=gzipSync(stored.raw,{level:9,mtime:0})')
path.write_text(original + marker + generated)
