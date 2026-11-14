"""Complete custody for the terminal published-head artifact snapshot.

This preserves failed receiving evidence. It never installs computed output.
"""
import gzip
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
snapshot = base / 'current-f93-artifact-snapshot-3.json'
normalized = base / 'current-f93-artifact-snapshot-3-normalized.json'
summary = base / 'current-f93-terminal-artifact-collection.json'
pages = json.loads(snapshot.read_bytes())
assert isinstance(pages, list) and pages
artifacts = [row for page in pages for row in page['artifacts']]
assert len(artifacts) == 42 and len({row['id'] for row in artifacts}) == 42
assert not normalized.exists() and not summary.exists()
with normalized.open('x') as output:
    for page in pages:
        output.write(json.dumps(page, separators=(',', ':')) + '\n')
records = []
for artifact in artifacts:
    identity = artifact['id']
    assert artifact['workflow_run']['head_sha'] == 'f93b01795a935317942adfe7d329f636dcd1848b'
    if identity == 13813764049:
        receipt = base / 'checkpointf93-canonical-complete-decoded.json.gz'
        with gzip.open(receipt, 'rt') as source:
            value = json.load(source)
        # Original complete encoded ZIP checks and all decoded payloads have
        # their own verified custody. Do not duplicate its 59 MB ZIP container.
        assert value['metadata'] == artifact
        assert value['completeMemberReadbackAndCrcVerified']
        assert value['completeDecodedPayloadsRetained']
        assert Path(value['retainedArchive']).is_file()
        code = 0
    else:
        receipt = base / ('checkpointf93-artifact-' + str(identity) + '.zip.json')
        if receipt.exists():
            value = json.loads(receipt.read_bytes())
            assert value['metadata'] == artifact
            assert value['completeReadbackAndCrcVerified']
            assert Path(value['file']).is_file()
            code = 0
        else:
            code = subprocess.run(['python3', '-B',
                'experiments/issue-784/collect-whole-artifact-xz.py', str(normalized),
                str(identity), '987fa0db2ca80765ec26cead46f28eac9c1e8f07',
                'checkpointf93']).returncode
    record = dict(id=identity, name=artifact['name'], exitCode=code, receipt=str(receipt))
    records.append(record)
    print(json.dumps(record), flush=True)
    if code:
        break
with summary.open('x') as output:
    json.dump(dict(headSha='f93b01795a935317942adfe7d329f636dcd1848b',
        runId=42921384009, records=records,
        terminalSnapshotComplete=len(records) == 42 and all(row['exitCode'] == 0 for row in records),
        artifactInstalled=False, semanticAuthority=False, runtimeParity=False), output)
raise SystemExit(0 if len(records) == 42 and all(row['exitCode'] == 0 for row in records) else 1)
