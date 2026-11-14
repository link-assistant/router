"""Draft explicit whole-parent privacy source rules for independent review."""
import difflib
import gzip
import hashlib
import json
from pathlib import Path

profile = Path('tools/translation/source-profiles/core-unit-matches')
packet = json.loads(gzip.decompress((profile / 'application.json.gz').read_bytes()))
paths = ['rust/src/account_routing_policy.rs', 'rust/src/lib.rs',
         'rust/src/native_service_relay.rs', 'rust/src/proxy/upstream_headers.rs',
         'rust/src/responses_websocket.rs', 'rust/src/responses_websocket/relay.rs',
         'rust/src/server_router.rs']
rows = []
digest = lambda text: hashlib.sha256(text.encode()).hexdigest()
for path in paths:
    original = next(row for row in packet['files'] if row['path'] == path)
    before, after = original['source'], Path(path).read_text()
    assert digest(before) == original['sha256']
    left, right = before.splitlines(True), after.splitlines(True)
    edits = []
    for group in difflib.SequenceMatcher(None, left, right, autojunk=False).get_grouped_opcodes(3):
        expected = ''.join(left[group[0][1]:group[-1][2]])
        replacement = ''.join(right[group[0][3]:group[-1][4]])
        assert expected != replacement and before.count(expected) == 1
        edits.append({'expected': expected, 'replacement': replacement})
    restored = before
    for edit in edits:
        assert restored.count(edit['expected']) == 1
        restored = restored.replace(edit['expected'], edit['replacement'])
    assert restored == after
    rows.append({'path': path, 'beforeSha256': digest(before),
                 'afterSha256': digest(after), 'edits': edits})
result = {'schema': 'router-unit-privacy-source-rules-v1', 'files': rows,
          'addition': {'path': 'rust/src/geolocation.rs',
                       'sha256': digest(Path('rust/src/geolocation.rs').read_text())},
          'semanticAuthority': False}
target = Path('tools/translation/test/fixtures/unit-privacy-source-rules.json')
with target.open('x') as output:
    json.dump(result, output, indent=2)
    output.write('\n')
print(json.dumps({'files': len(rows), 'edits': sum(len(row['edits']) for row in rows),
                  'rulesSha256': hashlib.sha256(target.read_bytes()).hexdigest()}))
