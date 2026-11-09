"""Recover two selected original producers from verified published Git blobs.

Stream the complete compressed bytes; retain only the bounded selected source.
This is source authorship data, never a remembered compiler verdict.
"""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile

base = Path('docs/case-studies/issue-784/evidence')
targets = [
    ('project-retention', 'project-facade-final-producer.json.gz'),
    ('native-regeneration', 'native-regeneration-batch-proposal.json.gz'),
]
for kind, name in targets:
    original = json.load(gzip.open(base / (kind + '-complete.json.gz')))
    retirement = json.load(gzip.open(base / (kind + '-complete-local-retirement.json.gz')))
    member = next(row for row in original['members'] if row['path'].endswith('/' + name))
    child = subprocess.Popen(['git', 'cat-file', 'blob', retirement['gitBlob']],
                             stdout=subprocess.PIPE)
    digest, size = hashlib.sha256(), 0

    class Reader:
        def read(self, length):
            global size
            assert length >= 0
            block = child.stdout.read(min(length, 65536))
            size += len(block)
            assert size <= retirement['bytes']
            digest.update(block)
            return block

    reader = Reader()
    selected = None
    try:
        with tarfile.open(fileobj=reader, mode='r|xz') as archive:
            for row in archive:
                if row.name != member['path']:
                    continue
                assert row.isfile() and row.size == member['bytes'] < 2 * 1024 * 1024
                selected = archive.extractfile(row).read()
                assert len(selected) == member['bytes']
                assert hashlib.sha256(selected).hexdigest() == member['sha256']
                break
        while reader.read(65536):
            pass
        assert child.wait() == 0
    finally:
        child.stdout.close()
        if child.poll() is None:
            child.terminate()
            child.wait()
    assert size == retirement['bytes'] and digest.hexdigest() == retirement['sha256']
    assert selected is not None
    plan = json.loads(gzip.decompress(selected))
    if 'files' in plan:
        plan = plan['files'][0]
    for key in ('before', 'after'):
        source = plan[key]
        assert isinstance(source, str) and len(source.encode()) < 262144
        target = Path('experiments/issue-784') / (kind + '-profile-' + key + '.mjs.txt')
        target.write_text(source)
        print(json.dumps(dict(path=str(target), bytes=len(source.encode()),
                              sha256=hashlib.sha256(source.encode()).hexdigest())))
