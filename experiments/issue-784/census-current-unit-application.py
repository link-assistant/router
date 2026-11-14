"""Compare complete current application files against the retained unit packet."""
import gzip
import hashlib
import json
from pathlib import Path

archive = Path('tools/translation/source-profiles/core-unit-matches/application.json.gz')
packet = json.loads(gzip.decompress(archive.read_bytes()))
differences = []
for row in packet['files']:
    assert hashlib.sha256(row['source'].encode()).hexdigest() == row['sha256']
    path = Path(row['path'])
    current = path.read_bytes()
    if current != row['source'].encode():
        differences.append({'path': row['path'], 'beforeSha256': row['sha256'],
                            'beforeBytes': len(row['source'].encode()),
                            'currentSha256': hashlib.sha256(current).hexdigest(),
                            'currentBytes': len(current)})
result = {'files': len(packet['files']), 'differences': differences,
          'semanticAuthority': False}
target = Path('ci-logs/issue-784-restart-2/current-unit-application-whole-source-differences.json')
with target.open('x') as output:
    json.dump(result, output, indent=2)
    output.write('\n')
print(json.dumps(result))
