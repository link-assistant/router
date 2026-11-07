"""Review every retained source/stage and the single generated import change."""
import gzip
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
packet = root / 'ci-logs/issue-784-restart-2/whole-owner-proposal.json.gz'
packed = packet.read_bytes()
raw = gzip.decompress(packed)
plan = json.loads(raw)
assert plan['typescriptVersion'] == '5.9.3'
assert len(plan['files']) == 19 and len(plan['physicalOverlays']) == 15
sha = lambda value: hashlib.sha256(value.encode()).hexdigest()
for row in plan['inputs'] + plan['prerequisiteInputs']:
    actual = (root / row['path']).read_bytes()
    assert hashlib.sha256(actual).hexdigest() == row['sha256']
    if 'source' in row:
        assert actual == row['source'].encode()
for row in plan['files'] + plan['physicalOverlays']:
    assert sha(row['before']) == row['beforeSha256']
    assert sha(row['after']) == row['afterSha256']
    assert row['inverse'] == row['before']
    assert json.loads(row['beforeMeta'])['source'] == row['before']
    assert json.loads(row['afterMeta'])['source'] == row['after']
    assert [stage['phase'] for stage in row['stages']] == ['language', 'repository']
    for stage in row['stages']:
        assert json.loads(stage['beforeMeta'])['source'] == stage['before']
        assert json.loads(stage['afterMeta'])['source'] == stage['after']
        assert stage['completeInverse'] is True
    assert row['nativeBindings']['nativeSemanticScopeChecked'] is True
changed = [row for row in plan['files'] if row['current'] != row['after']]
assert len(changed) == 1
row = changed[0]
assert row['path'] == 'tools/translation/operation-proof-byte-consumer-scope.mjs'
before = "from './original-lexing-intrinsics.mjs';"
after = "from './guarded-proof-lexing-intrinsics.mjs';"
assert row['current'].count(before) == 1
assert row['current'].replace(before, after) == row['after']
for row in plan['files']:
    assert (root / row['path']).read_text() == row['after']
receipt = {'proposalRawBytes': len(raw), 'proposalPackedBytes': len(packed),
           'proposalSha256': hashlib.sha256(packed).hexdigest(),
           'completeFiles': 19, 'completePhysicalOverlays': 15,
           'allOriginalInputsCurrent': True, 'allInstalledOutputsExact': True,
           'metadataSourceEquationsChecked': True,
           'independentCstReparsePerformed': False,
           'onlyGeneratedChange': changed[0]['path'] + ': lexing module literal',
           'sourceAuthority': False, 'runtimeParity': False, 'fullGatePass': False}
target = root / 'ci-logs/issue-784-restart-2/whole-owner-review.json'
target.write_text(json.dumps(receipt) + '\n')
print(json.dumps(receipt))
