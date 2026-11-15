"""Try the complete terminal run archive without accepting partial log bytes."""
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

base = Path('ci-logs/issue-784-restart-2')
path = base / 'checkpoint-e881-terminal-whole-run.zip'
snapshot = json.loads((base / 'checkpoint-e881-run-13.json').read_bytes())
assert snapshot['status'] == 'completed' and snapshot['headSha'] == 'e88183bb894b9ea62c9d6ae170c3fc099047685b'
roots = [Path('ci-logs'), Path('docs/case-studies/issue-784'),
         Path('experiments/issue-784'), Path('js/node_modules/.node-case-deadlines')]
total = sum(p.stat().st_size for root in roots for p in root.rglob('*')
            if p.is_file() and not p.is_symlink() and 'toolchain' not in p.parts)
limit = 12_000_000
assert total + limit < 500_000_000
with path.open('xb') as output, path.with_suffix('.stderr').open('xb') as errors:
    child = subprocess.Popen(['gh', 'api', 'repos/link-assistant/router/actions/runs/42784717613/logs'],
                             stdout=subprocess.PIPE, stderr=errors)
    length, exceeded = 0, False
    while block := child.stdout.read(65536):
        length += len(block)
        output.write(block)
        if length > limit:
            exceeded = True
            child.terminate()
            break
    code = child.wait()
record = {'schema': 'terminal-whole-run-log-recovery-v1', 'headSha': snapshot['headSha'],
          'runId': snapshot['databaseId'], 'bytes': length, 'exitCode': code,
          'maximumArchiveBytes': limit, 'byteLimitExceeded': exceeded, 'members': [],
          'wholeArchiveVerified': False}
if code == 0 and not exceeded:
    with zipfile.ZipFile(path) as archive:
        assert sum(item.file_size for item in archive.infolist()) < 128 * 1024 * 1024
        for item in archive.infolist():
            digest, count = hashlib.sha256(), 0
            with archive.open(item) as source:
                while block := source.read(65536):
                    count += len(block)
                    digest.update(block)
            assert count == item.file_size
            record['members'].append({'path': item.filename, 'bytes': count,
                                      'sha256': digest.hexdigest(), 'crc': item.CRC})
    record['wholeArchiveVerified'] = True
with (base / 'checkpoint-e881-terminal-whole-run-verification.json').open('x') as output:
    json.dump(record, output)
print(json.dumps({key: value for key, value in record.items() if key != 'members'}))
