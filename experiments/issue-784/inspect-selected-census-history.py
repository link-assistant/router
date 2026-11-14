"""Compare the four complete archived census sources with current physical inputs."""
import difflib
import gzip
import hashlib
import json
from pathlib import Path

archive = Path('tools/translation/source-profiles/selected-git-census/complete-originals.json.gz')
rows = json.loads(gzip.decompress(archive.read_bytes()))['rows']
for row in rows:
    before = row['source']
    assert len(before.encode()) == row['bytes']
    assert hashlib.sha256(before.encode()).hexdigest() == row['sha256']
    after = Path(row['path']).read_text()
    print(json.dumps(dict(path=row['path'], originalBytes=row['bytes'],
                         currentBytes=len(after.encode()),
                         currentSha256=hashlib.sha256(after.encode()).hexdigest())))
    for line in difflib.unified_diff(before.splitlines(), after.splitlines(),
                                    fromfile='archived/' + row['path'],
                                    tofile='physical/' + row['path'], n=2):
        if len(line) > 1500:
            print(line[:1500] + ' [COMPLETE LINE SHA256 ' + hashlib.sha256(line.encode()).hexdigest() + ']')
        else:
            print(line)
