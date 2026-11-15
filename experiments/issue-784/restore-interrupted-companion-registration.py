"""Preserve and restore only this stopped installer's identified partial writes."""
import base64
import gzip
import hashlib
import importlib.util
import json
import lzma
from pathlib import Path
import shutil
import stat
import subprocess

base = Path('ci-logs/issue-784-restart-2')
receipt = json.loads((base / 'current-companion-registration-refresh.memory.json').read_bytes())
assert receipt['stopped'] and receipt['exitCode'] == 143
assert not Path('/proc/' + str(receipt['pid'])).exists()
assert all(not Path('/proc/' + str(pid)).exists() for pid in receipt['stoppedOwnedProcessIds'])
proposal = json.loads(lzma.decompress((base / 'current-companion-registry-proposal.json.xz').read_bytes()))
outputs = {row['path']: base64.b64decode(row['base64'], validate=True) for row in proposal['files']}
restorations = [
    ('tools/translation/isolated-project-batch.mjs', 'isolated-project-batch.mjs', 'parent-before.mjs'),
    ('tools/translation/isolated-project-driver.mjs', 'isolated-project-driver.mjs', 'driver-before.mjs'),
    ('tools/translation/source-profiles/isolated-project-compiler/manifest.json.gz', 'manifest.json.gz', None)]
temporary = Path('/tmp/router-784-reviewed-registration-mIh5ju')
history = Path('tools/translation/source-profiles/isolated-project-compiler/history-11aca637da6ba73c021ddc60e81badc7cb26e4a7.json.gz')
members, before, after = [], {}, {}
for name, generated, original in restorations:
    path = Path(name)
    before[path] = path.read_bytes()
    assert before[path] == outputs[generated]
    after[path] = subprocess.check_output(['git', 'show', 'HEAD:' + name])
    if original:
        assert after[path] == outputs[original]
paths = [Path(name) for name, _, _ in restorations] + [history] + sorted(temporary.rglob('*'))
for path in paths:
    assert not path.is_symlink()
    if path.is_dir():
        continue
    state = path.lstat()
    assert stat.S_ISREG(state.st_mode) and state.st_nlink == 1
    raw = path.read_bytes()
    if path.is_relative_to(temporary):
        assert raw == outputs[path.name]
    members.append(dict(path=str(path), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode(), allocatedBytes=state.st_blocks * 512))
spec = importlib.util.spec_from_file_location('pages', Path(__file__).with_name('completed-fingerprint-pages.py'))
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)
active, unreadable = pages.active_paths(Path.cwd().resolve())
assert not {str(path.resolve()) for path in paths}.intersection(active)
record = dict(schema='interrupted-companion-registration-restoration-v1',
    resourceReceipt=receipt, members=members, foreignUnreadableProcesses=unreadable,
    generatedAfterimagesVerified=True, restoredHeadOriginalsVerified=True,
    fullGatePassed=False, runtimeParity=False,
    temporaryLogicalBytes=sum(row['bytes'] for row in members if row['path'].startswith(str(temporary)) or row['path'] == str(history)),
    temporaryAllocatedBytes=sum(row['allocatedBytes'] for row in members if row['path'].startswith(str(temporary)) or row['path'] == str(history)))
raw = json.dumps(record, separators=(',', ':')).encode()
target = base / 'current-companion-interrupted-registration.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
for row in members:
    assert Path(row['path']).read_bytes() == base64.b64decode(row['base64'], validate=True)
for path in before:
    assert path.read_bytes() == before[path]
    path.write_bytes(after[path])
    assert path.read_bytes() == after[path]
history.unlink()
shutil.rmtree(temporary)
print(json.dumps(dict(target=str(target), completeMembers=len(members),
    restoredOutputs=len(restorations), temporaryLogicalBytes=record['temporaryLogicalBytes'],
    temporaryAllocatedBytes=record['temporaryAllocatedBytes'], allOwnedProcessesReaped=True)))
