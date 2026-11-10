"""Review byte-exact actual CI generator output as DATA, never as a private plan.

The original producer ran against a tested merge with the identical published
tree. Review every member before changing any file. Installation is a separate
invocation pinned to the reviewed receipt hash; independent semantic review and
the original fresh producer remain mandatory afterwards.
"""
import argparse
import gzip
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import stat
import subprocess
import zipfile

BASE = Path('ci-logs/issue-784-restart-2')
ROOTS = ['tools/translation/meta', 'js/generated/rust-draft', 'ts/generated/rust-draft',
         'tools/translation/projects', 'js/generated/rust-project', 'ts/generated/rust-project']
INVENTORY = 'parity/rust-source-inventory.json'
LIMIT = 2866933760
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--install-reviewed', help='SHA256 of the complete existing review receipt')
parser.add_argument('--head', default='ec6005a8358428a560bb7c685d52a32b174a74f6')
parser.add_argument('--published-head')
parser.add_argument('--merge', default='a74e300516ee0dbc068e170412be99a470227ce5')
parser.add_argument('--prefix', default='current-ec600')
parser.add_argument('--snapshot', default='current-ec600-artifacts-9.json')
parser.add_argument('--artifact', type=int, default=13672361496)
parser.add_argument('--retained-archive', type=Path)
args = parser.parse_args()
import re
HEAD, MERGE, PUBLISHED = args.head, args.merge, args.published_head or args.head
assert all(re.fullmatch(r'[a-f0-9]{40}', value) for value in [HEAD, MERGE, PUBLISHED])
assert re.fullmatch(r'[a-z0-9-]+', args.prefix)
assert re.fullmatch(r'[a-z0-9.-]+', args.snapshot)
receipt_path = BASE / (args.prefix + '-canonical-output-review-v2.json.gz')
installation_path = BASE / (args.prefix + '-canonical-output-installation.json.gz')
active_paths = set()
for process in Path('/proc').iterdir():
    if not process.name.isdecimal():
        continue
    try:
        if any(line.startswith('State:\tZ') for line in (process / 'status').read_text().splitlines()):
            continue
        for line in (process / 'maps').read_text().splitlines():
            fields = line.split(None, 5)
            if len(fields) == 6:
                active_paths.add(fields[5])
        for descriptor in (process / 'fd').iterdir():
            try:
                active_paths.add(os.readlink(descriptor))
            except (FileNotFoundError, ProcessLookupError):
                pass
    except PermissionError:
        if process.stat().st_uid == os.getuid():
            raise
    except (FileNotFoundError, ProcessLookupError):
        pass


def guard():
    observed = int(Path('/sys/fs/cgroup/memory.current').read_text())
    if observed >= LIMIT:
        raise MemoryError('Original fixed cgroup observer threshold reached: ' + str(observed))


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git(*arguments):
    return subprocess.check_output(['git', *arguments]).decode().strip()


def safe(path):
    parts = PurePosixPath(path).parts
    assert path and not path.startswith('/') and '\\' not in path
    assert str(PurePosixPath(path)) == path and all(p not in ('.', '..') for p in parts)
    current = Path('.')
    for part in parts:
        current /= part
        if current.exists() or current.is_symlink():
            assert not current.is_symlink(), path
    return Path(path)


def physical(path):
    file = safe(path)
    before = file.stat()
    assert stat.S_ISREG(before.st_mode) and before.st_size <= 67108864
    digest, count = hashlib.sha256(), 0
    with file.open('rb') as source:
        while block := source.read(65536):
            digest.update(block)
            count += len(block)
        if str(file.resolve()) not in active_paths and before.st_uid == os.getuid() and before.st_nlink == 1:
            os.posix_fadvise(source.fileno(), 0, 0, os.POSIX_FADV_DONTNEED)
    after = file.stat()
    assert (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns) == (
        after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns)
    assert count == before.st_size
    return dict(path=path, bytes=count, sha256=digest.hexdigest())


assert git('rev-parse', 'HEAD') == HEAD
merge = json.loads((BASE / (args.prefix + '-tested-merge.json')).read_bytes())
assert merge['sha'] == MERGE
assert [r['sha'] for r in merge['parents']] == ['eb2dad1c0a18394dc1aad46413e11401e74eb502', PUBLISHED]
assert merge['tree']['sha'] == git('rev-parse', PUBLISHED + '^{tree}')
capture_path = BASE / (args.prefix + '-canonical-physical-inputs-before.json.gz')
capture = json.loads(gzip.decompress(capture_path.read_bytes()))
assert capture['schema'] == 'canonical-physical-installation-inputs-v1'
assert capture['inputs']['head'] == HEAD and capture['compilerVersion'] == '5.9.3'
assert capture['gitTree'] == git('rev-parse', 'HEAD^{tree}')
inputs = capture['inputs']
tree = {}
for row in subprocess.check_output(['git', 'ls-tree', '-rz', '-r', '--full-tree', HEAD]).split(b'\0'):
    if row:
        header, name = row.split(b'\t', 1)
        mode, kind, identity = header.decode().split()
        tree[name.decode()] = (mode, kind, identity)
assert sorted(p for p in tree if p.endswith('.rs')) == inputs['tracked']
input_counts = {}
for label, rows in [('rust', inputs['corpus']['sources']), ('cargo', inputs['corpus']['cargo']),
                    ('compiler', inputs['compiler']), ('profiles', inputs['profiles']),
                    ('typescript', inputs['typescript'])]:
    for row in rows:
        guard()
        name = row.get('path', row.get('source'))
        if row.get('available') is False:
            assert name not in tree and not Path(name).exists()
            continue
        path = 'js/node_modules/typescript/' + name if label == 'typescript' else name
        assert physical(path) == dict(path=path, bytes=row['bytes'], sha256=row['sha256']), path
        if label != 'typescript':
            data = safe(path).read_bytes()
            mode, kind, oid = tree[path]
            assert kind == 'blob' and mode in ('100644', '100755')
            assert hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() == oid
            assert row.get('gitBlob', oid) == oid and row.get('mode', mode) == mode
    input_counts[label] = len(rows)
assert json.loads(Path('js/node_modules/typescript/package.json').read_bytes())['version'] == '5.9.3'
print(json.dumps(dict(stage='physical-inputs', counts=input_counts, tree=merge['tree']['sha'])), flush=True)

snapshot = json.loads((BASE / args.snapshot).read_bytes())
if isinstance(snapshot, dict):
    snapshot = [snapshot]
artifact, = [r for page in snapshot for r in page['artifacts'] if r['id'] == args.artifact]
assert artifact['name'] == 'bulk-drafts-' + MERGE and not artifact['expired']
assert artifact['workflow_run']['head_sha'] == PUBLISHED
assert 0 < artifact['size_in_bytes'] <= 96 * 1024 * 1024
assert re.fullmatch(r'sha256:[a-f0-9]{64}', artifact['digest'])
buffer = io.BytesIO()
child = None
if args.retained_archive:
    assert args.retained_archive.parent == BASE
    assert not args.retained_archive.is_symlink()
    source = args.retained_archive.open('rb')
else:
    child = subprocess.Popen(['gh', 'api', '--allow-escape-sequences',
                              'repos/link-assistant/router/actions/artifacts/'
                              + str(artifact['id']) + '/zip'], stdout=subprocess.PIPE)
    source = child.stdout
try:
    while block := source.read(65536):
        guard()
        buffer.write(block)
        assert buffer.tell() <= artifact['size_in_bytes']
    assert (child is None or child.wait() == 0) and buffer.tell() == artifact['size_in_bytes']
finally:
    source.close()
    if child is not None and child.poll() is None:
        child.terminate()
        child.wait()
assert artifact['digest'] == 'sha256:' + sha(buffer.getbuffer())


def decoded(archive, name, row):
    packed = archive.read(name)  # ZipFile checks this complete member's CRC.
    assert len(packed) == row['storedBytes'] and sha(packed) == row['storedSha256']
    with gzip.GzipFile(fileobj=io.BytesIO(packed)) as source:
        data = source.read(row['bytes'] + 1)
        assert len(data) == row['bytes'] and source.read(1) == b''
    assert sha(data) == row['sha256']
    return data


members, total, changes, gains, losses = [], 0, [], [], []
with zipfile.ZipFile(buffer) as archive:
    entries = archive.infolist()
    assert len(entries) <= 200001 and len({r.filename for r in entries}) == len(entries)
    assert all(not r.is_dir() and r.file_size <= 67108864 for r in entries)
    assert sum(r.file_size for r in entries) <= 1073741824
    manifest_path, = [r.filename for r in entries if r.filename.endswith('/manifest.json')]
    assert archive.getinfo(manifest_path).file_size <= 16 * 1024 * 1024
    manifest = json.loads(archive.read(manifest_path))
    assert manifest['schema'] == 'unqualified-complete-bulk-draft-v1'
    assert all(manifest[k] is False for k in ['semanticAuthority', 'sourceAuthority',
               'privatePlanAuthority', 'runtimeParity', 'rustExecuted'])
    expected_inputs = dict(inputs, head=MERGE)
    assert manifest['inputs'] == expected_inputs, 'Complete actual input vector mismatch'
    assert manifest['plan']['outputRoots'] == ROOTS
    assert manifest['plan']['outputPrefix'] is None
    declared = {r['path']: r for r in manifest['plan']['outputs']}
    assert len(declared) == len(manifest['plan']['outputs']) == len(manifest['members'])
    prefix, expected = manifest_path.removesuffix('manifest.json'), {manifest_path}
    before = {}
    for root in ROOTS:
        for path in safe(root).rglob('*'):
            assert not path.is_symlink()
            if path.is_file():
                name = str(path)
                before[name] = physical(name)
    before[INVENTORY] = physical(INVENTORY)
    # All pre-installation files must be clean, recoverable immutable Git blobs.
    for name in before:
        assert name in tree and tree[name][1] == 'blob', name
    dirty = subprocess.check_output(['git', 'diff', '--name-only', HEAD, '--', *ROOTS, INVENTORY])
    assert not dirty, dirty.decode()
    old_inventory = json.loads(Path(INVENTORY).read_bytes())
    source_changes = []
    for row in manifest['members']:
        guard()
        name = row['path']
        safe(name)
        assert name == INVENTORY or any(name.startswith(root + '/') for root in ROOTS)
        assert len(row['storedAs']) == 9 and row['storedAs'][:6].isdigit() and row['storedAs'].endswith('.gz')
        stored = prefix + row['storedAs']
        assert stored not in expected
        expected.add(stored)
        declaration = declared.pop(name)
        assert declaration['bytes'] == row['bytes'] <= 67108864
        assert declaration['sha256'] == row['sha256']
        data = decoded(archive, stored, row)
        current = dict(path=name, bytes=len(data), sha256=sha(data))
        old = before.get(name)
        if old != current:
            changes.append(dict(path=name, before=old, after=current))
        if name.startswith(ROOTS[0] + '/') and name.endswith('.meta.json'):
            meta = json.loads(data)
            source = safe(meta['sourcePath']).read_bytes().decode('utf-8')
            assert sha(source.encode()) == meta['sourceSha256']
            for item in meta['items']:
                # Rust spans use JavaScript UTF-16 indices; the independent
                # original reviewer verifies those without a Python index guess.
                assert sha(item['source'].encode()) == item['sha256']
            if old is None or old != current:
                previous = json.loads(Path(name).read_bytes()) if old is not None else {'sourceSha256': None, 'items': []}
                same = previous['sourceSha256'] == meta['sourceSha256']
                if not same:
                    source_changes.append(meta['sourcePath'])
                identity = lambda i: (i.get('term'), i.get('name'), i['span']['start'], i['span']['end'], i['sha256'])
                old_items = {identity(i): i for i in previous['items']}
                new_items = {identity(i): i for i in meta['items']}
                for target, current_items, others in [(gains, new_items, old_items), (losses, old_items, new_items)]:
                    for key, item in current_items.items():
                        if item['status'] == 'executable' and others.get(key, {}).get('status') != 'executable':
                            target.append(dict(source=meta['sourcePath'], term=item.get('term'), name=item.get('name'),
                                span=item['span'], sha256=item['sha256'], sameOriginalSource=same,
                                previousStatus=others.get(key, {}).get('status')))
        if name == INVENTORY:
            assert json.loads(data) == manifest['plan']['manifest']
        total += len(data)
        assert total <= 1073741824
        members.append(dict(**row, zipCrc=archive.getinfo(stored).CRC))
    assert not declared and expected == set(archive.namelist())
    assert total == manifest['completeBytes'] == manifest['plan']['expectedBytes']
    for name in sorted(set(before) - {r['path'] for r in members}):
        changes.append(dict(path=name, before=before[name], after=None))
    record = dict(schema='actual-canonical-output-review-v1', headSha=HEAD, mergeSha=MERGE,
        publishedHeadSha=PUBLISHED,
        testedMergeTree=merge['tree']['sha'], mergeTreeEqualsPublishedHead=True,
        inputCapturePath=str(capture_path), inputCaptureSha256=sha(capture_path.read_bytes()),
        completePhysicalInputVectorsEqual=True, inputCounts=input_counts, artifact=artifact,
        members=members, completeBytes=total, completeOutputCensusVerified=True,
        allNestedCrcSha256AndLengthsVerified=True, changes=changes,
        previousTotals=old_inventory['totals'], totals=manifest['plan']['manifest']['totals'],
        previousFunctionCoverage=old_inventory['functionCoverage'],
        functionCoverage=manifest['plan']['manifest']['functionCoverage'],
        changedOriginalSources=source_changes, executableItemGains=gains, executableItemLosses=losses,
        itemComparisonScope='Every changed and newly added standalone metadata output; UTF-16 span validation remains independent.',
        semanticAuthority=False, sourceAuthority=False, privatePlanAuthority=False,
        runtimeParity=False, fullGatePassed=False, rustExecuted=False,
        scope='Complete actual CI output DATA. Input freshness and byte review are not semantic qualification. '
              'Original fresh generation, semantic review, strict parity and same-SHA CI remain required.')
    raw = json.dumps(record, separators=(',', ':')).encode()
    packed = gzip.compress(raw, mtime=0)
    if args.install_reviewed:
        assert sha(receipt_path.read_bytes()) == args.install_reviewed
        assert json.loads(gzip.decompress(receipt_path.read_bytes())) == record
        assert not installation_path.exists()
        by_path = {row['path']: row for row in members}
        touched = []

        def atomic_write(name, content):
            destination = safe(name)
            destination.parent.mkdir(parents=True, exist_ok=True)
            temporary = destination.with_name('.' + destination.name + '.issue-784-canonical-install')
            assert not temporary.exists() and not temporary.is_symlink()
            try:
                with temporary.open('xb') as output:
                    output.write(content)
                    output.flush()
                    os.fsync(output.fileno())
                assert sha(temporary.read_bytes()) == sha(content)
                temporary.replace(destination)
                assert physical(name) == dict(path=name, bytes=len(content), sha256=sha(content))
            finally:
                if temporary.exists():
                    temporary.unlink()

        try:
            for change in changes:
                guard()
                name, old, new = change['path'], change['before'], change['after']
                assert physical(name) == old if old else not safe(name).exists()
                touched.append(change)
                if new:
                    row = by_path[name]
                    atomic_write(name, decoded(archive, prefix + row['storedAs'], row))
                else:
                    safe(name).unlink()
            for row in members:
                assert physical(row['path']) == {k: row[k] for k in ['path', 'bytes', 'sha256']}
            assert git('rev-parse', 'HEAD') == HEAD
        except BaseException:
            # Roll back only files mutated by this invocation, from their exact
            # immutable original Git blobs. Never discard unrelated work.
            child = subprocess.Popen(['git', 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
            try:
                for change in reversed(touched):
                    name, old = change['path'], change['before']
                    if old is None:
                        if safe(name).exists():
                            safe(name).unlink()
                        continue
                    oid = tree[name][2]
                    child.stdin.write((oid + '\n').encode())
                    child.stdin.flush()
                    received, kind, length = child.stdout.readline().decode().split()
                    assert received == oid and kind == 'blob' and int(length) == old['bytes']
                    content = child.stdout.read(int(length))
                    assert child.stdout.read(1) == b'\n' and sha(content) == old['sha256']
                    atomic_write(name, content)
            finally:
                child.stdin.close()
                child.stdout.close()
                assert child.wait() == 0
            raise
        installation = dict(schema='actual-canonical-output-installation-v1', headSha=HEAD,
            reviewPath=str(receipt_path), reviewSha256=args.install_reviewed,
            artifact=artifact, completeOutputFiles=len(members), completeOutputBytes=total,
            installedChangedFiles=changes, allInstalledOutputBytesReadBack=True,
            completeCurrentInputCaptureRequiredAfterInstallation=True,
            independentSemanticReviewPassed=False, freshOriginalProducerPassed=False,
            semanticAuthority=False, runtimeParity=False, fullGatePassed=False, rustExecuted=False)
        raw = json.dumps(installation, separators=(',', ':')).encode()
        with installation_path.open('xb') as output:
            output.write(gzip.compress(raw, mtime=0))
        assert gzip.decompress(installation_path.read_bytes()) == raw
        print(json.dumps(dict(installation=str(installation_path), changedFiles=len(changes),
            allOutputFiles=len(members), completeBytes=total, semanticReviewPassed=False,
            freshOriginalProducerPassed=False)), flush=True)
    else:
        with receipt_path.open('xb') as output:
            output.write(packed)
        assert gzip.decompress(receipt_path.read_bytes()) == raw
        print(json.dumps(dict(receipt=str(receipt_path), receiptBytes=len(packed), receiptSha256=sha(packed),
            outputs=len(members), completeBytes=total, changed=len(changes),
            previousTotals=record['previousTotals'], totals=record['totals'],
            functionCoverage=record['functionCoverage'], gains=len(gains), losses=len(losses),
            changedOriginalSources=source_changes)), flush=True)
buffer.close()
