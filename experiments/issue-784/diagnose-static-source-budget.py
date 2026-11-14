"""Finite textual import-size diagnostic; not a native graph or closure proof."""
import hashlib
import json
from pathlib import Path
import posixpath
import re

root = Path.cwd()
pending = [
    'tools/translation/extensions/host-contracts.mjs',
    'tools/translation/project.mjs', 'tools/translation/translate.mjs',
    'tools/translation/semantic-meta.mjs',
] + ['tools/translation/vendor/meta-language/translation/' + name
     for name in ['rust.js', 'check.js', 'emit-javascript.js']]
rows, edges = {}, []
pattern = re.compile(r'^\s*(?:import|export)\s+[^;\n]*?\bfrom\s*[\'"]([^\'"\n]+)[\'"]', re.M)
total = 0
while pending:
    path = pending.pop(0)
    if path in rows:
        continue
    assert len(rows) < 512
    raw = (root / path).read_bytes()
    assert len(raw) <= 8 * 1024 * 1024
    total += len(raw)
    assert total < 32 * 1024 * 1024
    rows[path] = {'path': path, 'bytes': len(raw),
                  'sha256': hashlib.sha256(raw).hexdigest()}
    for specifier in pattern.findall(raw.decode('utf-8')):
        if not specifier.startswith('.'):
            continue
        target = posixpath.normpath(posixpath.join(posixpath.dirname(path), specifier))
        assert not target.startswith('../')
        edges.append({'from': path, 'to': target})
        pending.append(target)
result = {'schema': 'textual-static-import-size-diagnostic-v1',
          'originalByteSum': total, 'rows': list(rows.values()), 'edges': edges,
          'nativeSyntaxChecked': False, 'completeGraphProved': False,
          'sourceAuthority': False, 'runtimeAuthority': False}
output = root / 'ci-logs/issue-784-restart-2/static-source-budget-textual-diagnostic.json'
with output.open('x') as stream:
    json.dump(result, stream)
print(json.dumps({'originalByteSum': total, 'modules': len(rows),
                  'largest': sorted(rows.values(), key=lambda row: -row['bytes'])[:12],
                  'completeGraphProved': False}))
