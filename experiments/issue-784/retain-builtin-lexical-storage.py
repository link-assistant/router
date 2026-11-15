"""Capture complete lexical drafts and all attempts; never admit semantics."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[2]
os.chdir(root)
base = Path('ci-logs/issue-784-restart-2')
stem = 'builtin-lexical-storage-20261111'
archive = Path('docs/case-studies/issue-784/evidence') / (stem + '.tar.xz')
receipt = archive.with_name(stem + '.json.gz')
assert not archive.exists() and not receipt.exists()
paths = {Path(path) for path in [
    'tools/translation/static-rust-tokens.mjs',
    'tools/translation/macro-token-trees.mjs',
    'tools/translation/builtin-ast-builder-meta.mjs',
    'tools/translation/test/builtin-import-token-storage.test.mjs',
    'tools/translation/test/fixtures/builtin-import-token-storage-before.json.gz',
    'experiments/issue-784/capture-lexical-draft-source.mjs',
    'experiments/issue-784/summarize-complete-cpu-profile.mjs',
    'experiments/issue-784/retain-builtin-lexical-storage.py',
    'experiments/issue-784/run-observed-check.py',
    'experiments/issue-784/current-terminal-ci-repair-plan.md',
    'docs/case-studies/issue-784/builtin-lexical-storage-20261111.md',
    'changelog.d/20261111_075500_bounded_builtin_lexical_storage.md',
]}
prefixes = ('builtin-import-token-storage-', 'builtin-standard-inputs-lexical-',
            'builtin-standard-inputs-direct-freeze-', 'builtin-builder-lexical-',
            'builtin-lexical-original-', 'lexical-storage-',
            'struct-ordering-current-registry-proposal')
paths.update(path for path in base.iterdir()
             if path.is_file() and path.name.startswith(prefixes))
for path in list(paths):
    if path.suffix == '.log':
        for name in re.findall(r'^Complete Node deadline evidence: (.+)$',
                               path.read_text(), re.M):
            directory = Path(name).resolve().relative_to(root)
            assert directory.parent == Path('js/node_modules/.node-case-deadlines')
            paths.update(path for path in directory.iterdir() if path.is_file())


def allocation():
    total = 0
    for folder in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
                   'js/node_modules/.node-case-deadlines']:
        for directory, directories, files in os.walk(folder):
            directories[:] = [name for name in directories
                              if name not in ['toolchain', '__pycache__']]
            total += sum(Path(directory, name).stat().st_size for name in files)
    return total


before = allocation()
assert before < 497_000_000, before
rows = []
for path in sorted(paths):
    assert path.is_file() and not path.is_symlink()
    with path.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    rows.append(dict(path=str(path), originalPath=str(root / path),
                     bytes=path.stat().st_size, sha256=digest))
manifest = base / (stem + '-manifest.json')
with manifest.open('x') as stream:
    json.dump(dict(members=rows), stream, separators=(',', ':'))
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
raw_receipt = base / (stem + '-capture.json')
subprocess.run(['python3', '-B', 'tools/evidence/capture-packet.py',
                '--source-root', str(root), '--head', head,
                '--manifest', str(manifest), '--archive', str(archive),
                '--receipt', str(raw_receipt)], check=True)
raw = raw_receipt.read_bytes()
record = json.loads(raw)
assert record['allDecodedOriginalsVerified'] and record['allSelectedOriginalsUnchanged']
assert allocation() < 500_000_000
with receipt.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(receipt.read_bytes()) == raw
print(json.dumps(dict(archive=str(archive), receipt=str(receipt),
                     members=len(rows), archiveBytes=archive.stat().st_size,
                     evidenceBytesBefore=before, evidenceBytesAfter=allocation(),
                     sourceHead=head, fullGatePassed=False)))
