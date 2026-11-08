"""Install only the reviewed complete actual producer afterimage."""
import gzip
import hashlib
import json
from pathlib import Path
import sys

assert sys.argv[1:] in ([], ['--restore-rejected-draft'], ['--v2'])
v2 = sys.argv[1:] == ['--v2']
proposal = Path('ci-logs/issue-784-restart-2/current-module-freeze-source-proposal' + ('-v2' if v2 else '') + '.json.gz')
if not proposal.exists():
    proposal = Path('docs/case-studies/issue-784/evidence/module-item-freeze') / proposal.name
packed = proposal.read_bytes()
assert hashlib.sha256(packed).hexdigest() == ('0c2f9e58078633a9b93019b107539abbb5cbd1bd1fe9792590918e231cf019bb' if v2 else 'fc3742ff8d6d5f932ea639002dbc039c52bbe9bc1cf66e0bc519f2cc76cc5a93')
packet = json.loads(gzip.decompress(packed))
row = packet['row']
assert not packet['installed'] and not packet['sourceAuthority'] and not packet['runtimeAuthority']
assert row['path'] == 'tools/translation/source-module-views.mjs'
assert [stage['phase'] for stage in row['stages']] == ['language', 'repository']
assert row['nativeItemFreeze']['inverse'] == row['native']['language']
path = Path(row['path'])
if sys.argv[1:] == ['--restore-rejected-draft']:
    assert path.read_bytes() == row['after'].encode()
    path.write_bytes(row['before'].encode())
    assert path.read_bytes() == row['before'].encode()
    print(json.dumps({'path': str(path), 'restoredRejectedDraft': True,
                      'completeProposalRetained': True, 'fullGateQualified': False}))
    raise SystemExit(0)
assert not sys.argv[1:] or v2
assert path.read_bytes() == row['before'].encode()
after = row['after'].encode()
assert hashlib.sha256(after).hexdigest() == row['afterSha256']
path.write_bytes(after)
assert path.read_bytes() == after
print(json.dumps({'path': str(path), 'bytes': len(after), 'sha256': row['afterSha256'],
                  'installed': True, 'fullGateQualified': False}))
