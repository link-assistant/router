"""Sequential complete current-head artifact custody; never install drafts."""
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
snapshot = base / 'current-f93-artifact-snapshot-1.json'
pending, decoder, artifacts = snapshot.read_text(), json.JSONDecoder(), []
while pending.strip():
    value, end = decoder.raw_decode(pending.lstrip())
    pending = pending.lstrip()[end:]
    artifacts.extend(value['artifacts'])
assert len(artifacts) == 36 and len({row['id'] for row in artifacts}) == 36
records = []
for artifact in artifacts:
    identity = artifact['id']
    receipt = base / ('checkpointf93-artifact-' + str(identity) + '.zip.json')
    target = receipt.with_suffix('.xz')
    if receipt.exists():
        value = json.loads(receipt.read_bytes())
        assert value['metadata'] == artifact and value['completeReadbackAndCrcVerified']
        assert Path(value['file']) == target and target.is_file()
        code = 0
    else:
        code = subprocess.run(['python3', '-B',
            'experiments/issue-784/collect-whole-artifact-xz.py', str(snapshot),
            str(identity), '987fa0db2ca80765ec26cead46f28eac9c1e8f07',
            'checkpointf93']).returncode
    records.append({'id': identity, 'name': artifact['name'], 'exitCode': code,
                    'receipt': str(receipt)})
    print(json.dumps(records[-1]), flush=True)
    if code:
        break
with (base / 'current-f93-whole-artifact-collection-1.json').open('x') as output:
    json.dump({'headSha': 'f93b01795a935317942adfe7d329f636dcd1848b',
        'runId': 42921384009, 'records': records,
        'snapshotComplete': len(records) == len(artifacts) and all(not row['exitCode'] for row in records),
        'completeCycleCollected': False, 'artifactInstalled': False}, output)
raise SystemExit(records[-1]['exitCode'])
