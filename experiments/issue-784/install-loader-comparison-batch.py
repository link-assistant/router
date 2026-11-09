"""Install only complete reviewed producer afterimages with unchanged inputs."""
import gzip
import hashlib
import json
from pathlib import Path
import sys

summary = Path(sys.argv[1])
receipt = Path(sys.argv[2])
assert not receipt.exists()
plan = json.loads(summary.read_bytes())
digest = lambda value: hashlib.sha256(value).hexdigest()
root = Path.cwd().resolve()
for row in plan['inputs']:
    assert digest(Path(row['path']).read_bytes()) == row['sha256']
rows = []
for entry in plan['rows']:
    raw = gzip.open(entry['output'], 'rb').read()
    assert len(raw) == entry['bytes'] and digest(raw) == entry['sha256']
    row = json.loads(raw)
    path = Path(row['path'])
    assert path.resolve().is_relative_to(root / 'tools/translation')
    assert not path.is_symlink() and path.is_file()
    assert path.read_text() == row['current']
    assert digest(row['after'].encode()) == entry['afterSha256']
    assert row.get('inverse', row['equation']['inverse']) == row['before']
    assert row['equation']['after'] == row['after']
    assert [stage['phase'] for stage in row['equation']['stages']] == ['language', 'repository']
    rows.append(row)
changed = []
for row in rows:
    path = Path(row['path'])
    assert path.read_text() == row['current']
    if row['current'] != row['after']:
        path.write_text(row['after'])
        assert path.read_text() == row['after']
        changed.append({'path': row['path'], 'beforeSha256': digest(row['current'].encode()),
                        'afterSha256': digest(row['after'].encode())})
result = {'summary': str(summary), 'summarySha256': digest(summary.read_bytes()),
          'changed': changed, 'completeProducerAfterimages': True, 'fullGatePassed': False}
receipt.write_text(json.dumps(result, indent=2))
print(json.dumps(result))
