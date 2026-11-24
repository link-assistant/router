#!/usr/bin/env python3
"""Sequential complete captures with authenticated resume; never adopt or retire."""
import argparse
import contextlib
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import signal
import stat
import subprocess
import sys
import time

from archive_range import _parent, _identity, _named_identity
from decoded_original import _metadata
from packet import PacketStore, canonical, relative, size, digest

MIB = 1024 * 1024
SHARD = 64 * MIB
MEMBER = 128 * MIB
ARCHIVE = 256 * MIB
PACKET = 1024 * MIB
RSS = 1024 * MIB
METADATA = 16 * MIB
BATCH_SECONDS = 3600
CODE = ('capture-shards.py', 'capture-packet.py', 'shard-packets.py',
        'archive_range.py', 'packet.py', 'decoded_original.py')
COMPRESSION = {'format': 'xz', 'preset': 9, 'dictionaryBytes': 64 * MIB}


def _encode(value):
    return (json.dumps(value, indent=2, allow_nan=False) + '\n').encode()


def _absolute(value):
    if type(value) is not str or not Path(value).is_absolute() or len(value.encode()) > 4096 or any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError('Bounded absolute source path required')
    path = canonical(value)
    if str(path) != value or any(p in ('.', '..') for p in value.split('/')):
        raise ValueError('Canonical complete source path required')
    return path


def _logical(value):
    relative(value)
    if len(value.encode()) > 4096 or any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError('Bounded original logical name required')
    return value


def _id(value):
    if type(value) is not str or not re.fullmatch('[a-z0-9][a-z0-9-]{0,95}', value):
        raise ValueError('Bounded stable capture id required')
    return value


def _pin(value):
    if type(value) is not dict or set(value) != {'path', 'bytes', 'sha256'}:
        raise ValueError('Exact complete file pin required')
    _absolute(value['path']); size(value['bytes'], METADATA); digest(value['sha256'])
    return value


def _check(deadline):
    if time.monotonic() >= deadline:
        raise TimeoutError('Complete batch/job deadline exceeded')


def _hash(path, maximum, check):
    parent = descriptor = None
    try:
        parent = _parent(path)
        descriptor = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
        before = _identity(descriptor)
        if before['st_size'] > maximum or _named_identity(path) != before:
            raise ValueError('Complete file bound or fd/name differs')
        h, count = hashlib.sha256(), 0
        while True:
            check()
            data = os.read(descriptor, 1024 * 1024)
            if not data:
                break
            count += len(data)
            if count > maximum or count > before['st_size']:
                raise ValueError('Complete file grew beyond bound')
            h.update(data)
        if _identity(descriptor) != before or _named_identity(path) != before or count != before['st_size']:
            raise ValueError('Complete file identity/length changed')
        return {'path': str(path), 'bytes': count, 'sha256': h.hexdigest()}, before
    finally:
        for fd in (descriptor, parent):
            if fd is not None:
                os.close(fd)


def _read(pin, check):
    _pin(pin)
    value, fact = _metadata(_absolute(pin['path']), METADATA, check)
    if {k: fact[k] for k in ('path', 'bytes', 'sha256')} != pin:
        raise ValueError('Complete metadata pin changed')
    return value, fact


def _same(facts, check):
    for original in facts:
        actual, identity = _hash(Path(original['path']), METADATA, check)
        if actual != {k: original[k] for k in ('path', 'bytes', 'sha256')} or identity != original['identity']:
            raise ValueError('Full source/control changed after verification')


def _directory(path, create=False):
    parent = _parent(path)
    descriptor = None
    try:
        if create:
            os.mkdir(path.name, mode=0o700, dir_fd=parent)
        descriptor = os.open(path.name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent)
        state = os.fstat(descriptor)
        named = os.stat(path.name, dir_fd=parent, follow_symlinks=False)
        identity = (state.st_dev, state.st_ino, state.st_mode)
        if not stat.S_ISDIR(state.st_mode) or identity != (named.st_dev, named.st_ino, named.st_mode):
            raise ValueError('Plain stable capture directory required')
        return identity
    finally:
        if descriptor is not None: os.close(descriptor)
        os.close(parent)


def _guard(path, identity):
    if _directory(path) != identity:
        raise ValueError('Capture output directory changed')


def _fresh(path, value, check):
    raw = _encode(value)
    if len(raw) > 64 * MIB:
        raise ValueError('Bounded complete control output required')
    parent = fd = None
    try:
        check(); parent = _parent(path)
        fd = os.open(path.name, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=parent)
        position = 0
        while position < len(raw):
            check(); written = os.write(fd, raw[position:position + 65536])
            if written <= 0:
                raise ValueError('No complete control write progress')
            position += written
        before = _identity(fd)
        os.lseek(fd, 0, os.SEEK_SET); position = 0
        while data := os.read(fd, 65536):
            check()
            if data != raw[position:position + len(data)]:
                raise ValueError('Complete control readback differs')
            position += len(data)
        if position != len(raw) or _identity(fd) != before or _named_identity(path) != before:
            raise ValueError('Fresh complete control identity differs')
        return {'path': str(path), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(), 'identity': before}
    finally:
        for item in (fd, parent):
            if item is not None:
                os.close(item)


def _environment():
    env = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
    env.update(GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    return env


def _git(root, deadline, *args, raw=False):
    _check(deadline)
    child = subprocess.Popen(['git', '-c', 'gc.auto=0', '-c', 'maintenance.auto=false', *args],
                             cwd=root, env=_environment(), stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                             start_new_session=True)
    try:
        out, err = child.communicate(timeout=min(5, max(.01, deadline - time.monotonic())))
        if child.returncode or len(out) > MIB or err:
            raise ValueError('Exact source Git observation failed')
        return out if raw else out.decode().strip()
    finally:
        if child.returncode is None:
            try: os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError: pass
            child.wait()
        child.stdout.close(); child.stderr.close()


def _source(source, deadline):
    if type(source) is not dict or set(source) != {'root', 'head', 'code'}:
        raise ValueError('Exact source root/head/code required')
    root = _absolute(source['root']); digest(source['head'], 40)
    if set(source['code']) != set(CODE):
        raise ValueError('Complete fixed capture/reader code set required')
    if _git(root, deadline, 'rev-parse', '--show-toplevel') != str(root) or _git(root, deadline, 'rev-parse', 'HEAD') != source['head'] or _git(root, deadline, 'status', '--porcelain'):
        raise ValueError('Clean exact source HEAD required')
    facts = []
    for name in CODE:
        declared = source['code'][name]
        if type(declared) is not dict or set(declared) != {'bytes', 'sha256'}:
            raise ValueError('Closed source code pin required')
        actual, identity = _hash(root / 'tools/evidence' / name, METADATA, lambda: _check(deadline))
        if {k: actual[k] for k in ('bytes', 'sha256')} != declared:
            raise ValueError('Source code differs')
        facts.append({**actual, 'identity': identity})
    return facts


def _rows(job, check):
    if type(job) is not dict or not {'id', 'mode', 'manifest'} <= set(job) or set(job) - {'id', 'mode', 'manifest', 'reuse'}:
        raise ValueError('Closed complete capture job required')
    _id(job['id']); value, fact = _read(job['manifest'], check)
    if type(value) is not dict or set(value) != {'members'} or type(value['members']) is not list or not 1 <= len(value['members']) <= 8192:
        raise ValueError('Complete bounded members required')
    total, names = 0, set()
    for row in value['members']:
        check()
        if type(row) is not dict or set(row) != {'path', 'originalPath', 'bytes', 'sha256'}:
            raise ValueError('Exact four-field original required')
        _logical(row['path']); _absolute(row['originalPath']); size(row['bytes'], MEMBER); digest(row['sha256'])
        if row['path'] in names:
            raise ValueError('Duplicate complete logical original')
        names.add(row['path']); total += row['bytes']
    if total > PACKET:
        raise ValueError('Original1GiB packet bound')
    if job['mode'] == 'shard':
        if total > SHARD:
            raise ValueError('Original64MiB shard bound')
    elif job['mode'] == 'whole-original':
        if len(value['members']) != 1 or not SHARD < total <= MEMBER:
            raise ValueError('Oversized original must be ONE intact64..128MiB member')
    else:
        raise ValueError('Unknown bounded capture lane')
    return value['members'], fact


def _artifact(value):
    if type(value) is not dict or set(value) != {'bytes', 'sha256', 'source'}:
        raise ValueError('Complete archive/source descriptor required')
    size(value['bytes'], ARCHIVE); digest(value['sha256']); source = value['source']
    if type(source) is not dict:
        raise ValueError('Direct archive source required')
    if source.get('kind') == 'file' and set(source) == {'kind', 'path'}:
        _absolute(source['path'])
    elif source.get('kind') == 'packet' and set(source) == {'kind', 'caseRoot', 'index', 'name'}:
        _absolute(source['caseRoot']); _logical(source['index']); _logical(source['name'])
    else:
        raise ValueError('Only physical file or existing ordinary packet witness allowed')
    return value


def _originals(rows, check, hash_bodies=False):
    facts = []
    for row in rows:
        check(); path = Path(row['originalPath'])
        if hash_bodies:
            actual, identity = _hash(path, MEMBER, check)
            if (actual['bytes'], actual['sha256']) != (row['bytes'], row['sha256']):
                raise ValueError('Complete original body differs')
        else:
            identity = _named_identity(path)
            if identity['st_size'] != row['bytes']:
                raise ValueError('Complete original length differs')
        facts.append({'path': row['path'], 'originalPath': row['originalPath'], 'identity': identity})
    return facts


def _optional_identity(path):
    try:
        return _named_identity(path)
    except FileNotFoundError:
        return None


class _LocalArchive(PacketStore):
    """Reuse the unchanged complete packet decoder without a fake Git witness."""
    def __init__(self, path, identity, deadline):
        self.path, self.identity, self.deadline = path, identity, deadline

    @contextlib.contextmanager
    def verified_archive(self, name, **unused):
        self.check(); parent = _parent(self.path); fd = None
        try:
            fd = os.open(self.path.name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=parent)
            if _identity(fd) != self.identity or _named_identity(self.path) != self.identity:
                raise ValueError('Authenticated local archive changed')
            with os.fdopen(fd, 'rb', closefd=False) as stream:
                yield stream
            if _identity(fd) != self.identity or _named_identity(self.path) != self.identity:
                raise ValueError('Local archive changed during full member recovery')
        finally:
            if fd is not None: os.close(fd)
            os.close(parent)


def _receipt(receipt, rows, source, code):
    if receipt.get('schema') != 'complete-evidence-packet-v1' or type(receipt.get('members')) is not list or len(receipt['members']) != len(rows):
        raise ValueError('Complete actual capture receipt required')
    expected = {row['path']: row for row in rows}; seen = {}; aliases = 0
    for row in receipt['members']:
        if type(row) is not dict or not {'path', 'originalPath', 'bytes', 'sha256'} <= set(row):
            raise ValueError('Incomplete original receipt')
        original = {key: row[key] for key in ('path', 'originalPath', 'bytes', 'sha256')}
        _logical(original['path']); _absolute(original['originalPath']); size(original['bytes'], MEMBER); digest(original['sha256'])
        name = original['path']; extras = set(row) - set(original)
        if name in seen or original != expected.get(name):
            raise ValueError('Exact complete receipt originals differ')
        if extras:
            if extras != {'storedAsHardlink', 'fullByteEqualityBeforeHardlink'} or row['fullByteEqualityBeforeHardlink'] is not True:
                raise ValueError('Unknown receipt fields or hardlink boolean')
            target = row['storedAsHardlink']; _logical(target)
            if target not in seen or seen[target][1] or (seen[target][0]['bytes'], seen[target][0]['sha256']) != (original['bytes'], original['sha256']):
                raise ValueError('Invalid backward complete hardlink target')
            aliases += 1
        seen[name] = (original, bool(extras))
    if type(receipt.get('completeMembers')) is not int or type(receipt.get('completeOriginalBytes')) is not int or set(seen) != set(expected) or receipt.get('completeMembers') != len(rows) or receipt.get('completeOriginalBytes') != sum(row['bytes'] for row in rows):
        raise ValueError('Complete receipt membership differs')
    if type(receipt.get('capSeconds')) is not int or receipt.get('allDecodedOriginalsVerified') is not True or receipt.get('allSelectedOriginalsUnchanged') is not True or receipt.get('capSeconds') != 170 or receipt.get('compression') != COMPRESSION:
        raise ValueError('Actual full capture/budget evidence missing')
    if receipt.get('harnessSha256') != code['capture-packet.py']['sha256']:
        raise ValueError('Unqualified capture tool source')
    digest(receipt.get('sourceHead'), 40)
    return aliases


def _producer_source(receipt, source, deadline):
    # Producer code provenance is a full-byte Git join, never invented ancestry.
    head = receipt['sourceHead']; root = Path(source['root']); digest(head, 40)
    if _git(root, deadline, 'rev-parse', '--verify', head + '^{commit}') != head:
        raise ValueError('Original producer source commit unavailable')
    rows = []
    for name in ('capture-packet.py', 'archive_range.py'):
        path = 'tools/evidence/' + name
        entry = _git(root, deadline, 'ls-tree', head, '--', path).split('\t')
        if len(entry) != 2 or entry[1] != path:
            raise ValueError('Original producer source path missing')
        fields = entry[0].split()
        if len(fields) != 3 or fields[0] not in ('100644', '100755') or fields[1] != 'blob':
            raise ValueError('Original producer Git mode/type differs')
        digest(fields[2], 40)
        data = _git(root, deadline, 'cat-file', 'blob', fields[2], raw=True)
        fact = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
        if fact != source['code'][name]:
            raise ValueError('Original full producer/import source differs')
        rows.append({'path': path, 'mode': fields[0], 'blob': fields[2], **fact})
    return {'originalSourceHead': head, 'currentSourceHead': source['head'],
            'sourceHeadsEqual': head == source['head'], 'ancestryAsserted': False,
            'completeOriginalProducerGitSources': rows}


def authenticate(request, output, *, started=None):
    """Fixed read-only child: full archive+member+original checks, no capture."""
    started = time.monotonic() if started is None else started; seconds = request['seconds']
    if type(seconds) is not int or not 1 <= seconds <= 170:
        raise ValueError('Original bounded authentication deadline')
    deadline = started + seconds; check = lambda: _check(deadline)
    source = request['source']; code_before = _source(source, deadline)
    job = request['job']; rows, manifest = _rows(job, check)
    artifact = _artifact(request['archive']); receipt_value, receipt = _read(request['receipt'], check)
    aliases = _receipt(receipt_value, rows, source, source['code'])
    if receipt_value['manifestSha256'] != job['manifest']['sha256'] or (receipt_value['archiveBytes'], receipt_value['archiveSha256']) != (artifact['bytes'], artifact['sha256']):
        raise ValueError('Actual full capture archive/manifest binding differs')
    producer = _producer_source(receipt_value, source, deadline)
    provenance = []
    for pin in request['provenance']:
        unused, fact = _read(pin, check); provenance.append(fact)
    originals = _originals(rows, check, True)
    archive_identity = None
    archive_overlay = None
    if artifact['source']['kind'] == 'file':
        path = Path(artifact['source']['path']); fact, identity = _hash(path, ARCHIVE, check)
        if (fact['bytes'], fact['sha256']) != (artifact['bytes'], artifact['sha256']):
            raise ValueError('Full archive byte/hash differs')
        archive_identity = {'path': str(path), 'identity': identity}
        store = _LocalArchive(path, identity, deadline)
        report = store.verify_members(job['id'], rows)
        if _named_identity(path) != identity:
            raise ValueError('Full archive source changed')
    else:
        origin = artifact['source']
        unused, index_fact = _metadata(Path(origin['caseRoot']) / origin['index'], 4 * MIB, check)
        store = PacketStore(origin['caseRoot'], source['root'], origin['index'], cap_seconds=seconds)
        store.deadline = deadline
        if origin['name'] not in store.archives or store.archives[origin['name']][:2] != (artifact['bytes'], artifact['sha256']):
            raise ValueError('Existing direct Git archive witness differs')
        _same([index_fact], check)
        provenance.append(index_fact)
        physical = Path(origin['caseRoot']) / origin['name']
        archive_overlay = {'path': str(physical), 'identity': _optional_identity(physical)}
        report = store.verify_members(origin['name'], rows)
    if _originals(rows, check, True) != originals:
        raise ValueError('Complete original bodies/fd identities changed')
    _same([manifest, receipt, *provenance, *code_before], check)
    _source(source, deadline)
    result = {'schema': 'complete-local-capture-authentication-v1', 'job': job['id'], 'manifest': job['manifest'],
              'archive': artifact, 'captureReceipt': request['receipt'], 'captureSourceHead': receipt_value['sourceHead'], 'sourceProducerQualification': producer,
              'actualCaptureTool170CapEvidence': True, 'independentlyDecodedMembers': report,
              'exactFourFieldOriginals': len(rows), 'validatedHardlinkExtras': aliases,
              'fullOriginalBodiesAndNamedIdentitiesUnchanged': originals, 'sourceCodeAndMetadataUnchanged': True,
              'archiveIdentity': archive_identity, 'archivePhysicalOverlay': archive_overlay,
              'sourceControlFacts': [manifest, receipt, *provenance],
              'elapsedSeconds': time.monotonic() - started, 'capSeconds': seconds,
              'gitWitnessIssued': False, 'caseAdoption': False, 'retirement': False}
    output_fact = _fresh(output, result, check)
    _same([manifest, receipt, *provenance, *code_before], check)
    if _originals(rows, check) != originals:
        raise ValueError('Original changed at final authentication write')
    _source(source, deadline); _same([output_fact], check); check()
    return result


def _space(path):
    state = os.statvfs(path)
    return state.f_bavail * state.f_frsize


def _sample(child, deadline):
    _check(deadline)
    result = subprocess.run(['ps', '-axo', 'pid=,ppid=,rss='], capture_output=True, text=True,
                            timeout=min(2, max(.01, deadline - time.monotonic())))
    if result.returncode or result.stderr.strip():
        raise ValueError('Required aggregate RSS monitor unavailable')
    table = {int(a): (int(b), int(c) * 1024) for line in result.stdout.splitlines() if len(parts := line.split()) == 3 for a, b, c in [parts]}
    selected = {os.getpid()}
    while True:
        more = {pid for pid, (parent, unused) in table.items() if parent in selected} - selected
        if not more: break
        selected |= more
    return sum(table[pid][1] for pid in selected if pid in table)


def _monitor(argv, directory, source, deadline, disk_root, reserve, archive_path=None):
    """One fixed workload child, direct raw fds and kill/reap on every failure."""
    check = lambda: _check(deadline); check()
    _fresh(directory / 'command.json', {'argv': argv, 'sourceRoot': source, 'deadlineRemainingSeconds': deadline - time.monotonic()}, check)
    peak = 0; child = None; usage = None; reason = None; started = time.monotonic()
    with (directory / 'stdout.raw.log').open('xb') as stdout, (directory / 'stderr.raw.log').open('xb') as stderr, (directory / 'resource.jsonl').open('x') as samples:
        # Prove permission before any compressor child is created.
        if _sample(None, deadline) > RSS:
            raise MemoryError('Original aggregate1GiB RSS bound')
        try:
            env = _environment(); env['TMPDIR'] = str(directory)
            child = subprocess.Popen(argv, cwd=source, env=env, stdout=stdout, stderr=stderr, start_new_session=True)
            while True:
                pid, status, observed = os.wait4(child.pid, os.WNOHANG)
                if pid:
                    usage = observed; child.returncode = os.waitstatus_to_exitcode(status)
                    if child.returncode:
                        try: os.killpg(child.pid, signal.SIGKILL)
                        except ProcessLookupError: pass
                    if _space(disk_root) < reserve:
                        raise OSError('Disk reserve reached at child terminal; outputs retained')
                    break
                check(); rss = _sample(child, deadline); peak = max(peak, rss)
                free = _space(disk_root)
                samples.write(json.dumps({'elapsedSeconds': time.monotonic() - started, 'aggregateRssBytes': rss, 'diskFreeBytes': free}) + '\n'); samples.flush()
                if rss > RSS: raise MemoryError('Original aggregate1GiB RSS bound')
                if free < reserve: raise OSError('Disk reserve reached; partial retained')
                if archive_path is not None and archive_path.exists():
                    if _named_identity(archive_path)['st_size'] > ARCHIVE: raise ValueError('Original256MiB compressed bound')
                time.sleep(min(.25, max(0, deadline - time.monotonic())))
        except BaseException as error:
            reason = {'type': type(error).__name__, 'message': str(error)}
        finally:
            if child is not None and child.returncode is None:
                try: os.killpg(child.pid, signal.SIGKILL)
                except ProcessLookupError: pass
                unused, status, usage = os.wait4(child.pid, 0); child.returncode = os.waitstatus_to_exitcode(status)
    result = {'exitCode': child.returncode if child else None, 'elapsedSeconds': time.monotonic() - started,
              'peakSampledAggregateRssBytes': peak, 'wait4MaxRssBytes': usage.ru_maxrss * (1024 if sys.platform.startswith('linux') else 1) if usage else None,
              'userCpuSeconds': usage.ru_utime if usage else None, 'systemCpuSeconds': usage.ru_stime if usage else None,
              'childReaped': child is None or child.returncode is not None, 'error': reason}
    # Terminal failures are retained even after the task deadline; never success authority.
    _fresh(directory / 'terminal.json', result, lambda: None)
    if reason or result['exitCode'] != 0 or result['elapsedSeconds'] > 180 or peak > RSS or result['wait4MaxRssBytes'] is not None and result['wait4MaxRssBytes'] > RSS:
        raise RuntimeError('Bounded capture/authentication failed; all partials retained')
    return result


def _new_dir(parent, name, check):
    check(); path = parent / name; _directory(path, True); return path


def _next_run(output, check):
    entries = list(output.iterdir())
    if len(entries) > 8192:
        raise ValueError('Bounded local capture ledger required')
    for number in range(1, 4097):
        name = 'run-' + str(number).zfill(6)
        if not (output / name).exists():
            return _new_dir(output, name, check)
    raise ValueError('Complete run count bound')


def _job_source(job, directory, check):
    if 'reuse' in job:
        value = job['reuse']
        if type(value) is not dict or set(value) != {'archive', 'receipt', 'provenance'} or type(value['provenance']) is not list or len(value['provenance']) > 128:
            raise ValueError('Closed complete reuse descriptor required')
        _artifact(value['archive']); _pin(value['receipt'])
        for row in value['provenance']: _pin(row)
        return value, True
    if directory.exists():
        if not (directory / 'complete.json').exists():
            raise ValueError('Incomplete prior outputs retained; explicit newly reviewed attempt required, never automatic retry')
        value, complete_fact = _metadata(directory / 'complete.json', METADATA, check)
        if set(value) != {'schema', 'id', 'mode', 'manifest', 'archive', 'receipt', 'verification'} or value['schema'] != 'complete-local-capture-v1' or value['id'] != job['id'] or value['mode'] != job['mode'] or value['manifest'] != job['manifest']:
            raise ValueError('Foreign/stale complete capture record')
        _artifact(value['archive']); _pin(value['receipt']); _pin(value['verification'])
        if value['archive']['source'] != {'kind': 'file', 'path': str(directory / 'complete.tar.xz')} or value['receipt']['path'] != str(directory / 'capture.json'):
            raise ValueError('Managed output paths changed')
        return {'archive': value['archive'], 'receipt': value['receipt'], 'provenance': [value['verification'], {k: complete_fact[k] for k in ('path', 'bytes', 'sha256')}]}, True
    return None, False


def _finished_unchanged(observations, check):
    for verified, control in observations:
        check(); _same([control, *verified['sourceControlFacts']], check)
        for row in verified['fullOriginalBodiesAndNamedIdentitiesUnchanged']:
            check()
            if _named_identity(Path(row['originalPath'])) != row['identity']:
                raise ValueError('Completed original changed later in batch')
        for selected in (verified['archiveIdentity'], verified['archivePhysicalOverlay']):
            if selected is not None:
                path = Path(selected['path'])
                actual = _optional_identity(path)
                if actual != selected['identity']:
                    raise ValueError('Completed archive changed later in batch')


def run_batch(plan_pin, output, *, started=None):
    started = time.monotonic() if started is None else started; initial_deadline = started + BATCH_SECONDS
    plan, plan_fact = _read(plan_pin, lambda: _check(initial_deadline))
    if type(plan) is not dict or set(plan) != {'schema', 'source', 'jobs', 'capSeconds', 'minimumFreeBytes', 'pendingRoots'} or plan['schema'] != 'complete-evidence-capture-batch-v1':
        raise ValueError('Closed complete batch plan required')
    if type(plan['capSeconds']) is not int or not 1 <= plan['capSeconds'] <= BATCH_SECONDS:
        raise ValueError('Explicit finite1..3600s batch cap required')
    deadline = started + plan['capSeconds']; check = lambda: _check(deadline)
    reserve = size(plan['minimumFreeBytes'], 16 * PACKET)
    if reserve < 512 * MIB: raise ValueError('At least512MiB disk reserve required')
    if type(plan['jobs']) is not list or not 1 <= len(plan['jobs']) <= 4096 or type(plan['pendingRoots']) is not list or len(plan['pendingRoots']) > 128:
        raise ValueError('Bounded complete jobs/pending scope required')
    for path in plan['pendingRoots']: _absolute(path)
    source = plan['source']; code_before = _source(source, deadline)
    job_inputs = []; names = set(); originals = set(); aggregate_metadata = 0
    for job in plan['jobs']:
        rows, fact = _rows(job, check)
        if job['id'] in names: raise ValueError('Duplicate capture id')
        names.add(job['id']); aggregate_metadata += fact['bytes']
        if aggregate_metadata > 64 * MIB: raise ValueError('Complete batch metadata bound')
        for row in rows:
            if row['path'] in originals: raise ValueError('Logical original duplicated across jobs')
            originals.add(row['path'])
        if len(originals) > 131072: raise ValueError('Complete batch row bound')
        job_inputs.append((job, rows, fact))
    output = _absolute(str(output))
    if any(a == 'docs' and b == 'case-studies' for a, b in zip(output.parts, output.parts[1:])):
        raise ValueError('Capture output must remain outside case storage')
    if not output.exists():
        _directory(output, True)
        _fresh(output / 'batch-root.json', {'schema': 'complete-local-capture-root-v1', 'sourceRoot': source['root']}, check)
    identity = _directory(output)
    root_value, root_fact = _metadata(output / 'batch-root.json', METADATA, check)
    if root_value != {'schema': 'complete-local-capture-root-v1', 'sourceRoot': source['root']}:
        raise ValueError('Foreign output root')
    run = _next_run(output, check)
    result = {'schema': 'complete-evidence-capture-batch-terminal-v1', 'status': 'STOPPED', 'plan': plan_pin,
              'jobs': [], 'pendingRoots': plan['pendingRoots'], 'completeLatestEvidence': False,
              'caseAdoption': False, 'retirement': False, 'gitMutation': False, 'push': False}
    finished = []
    try:
        _fresh(run / 'source-before.json', {'plan': plan_fact, 'code': code_before, 'root': root_fact,
                                          'manifests': [row[2] for row in job_inputs], 'freeBytes': _space(output)}, check)
        for index, (job, rows, manifest) in enumerate(job_inputs, 1):
            check(); _guard(output, identity); _same([plan_fact, manifest, *code_before], check); _source(source, deadline)
            job_deadline = min(deadline, time.monotonic() + 180)
            job_check = lambda: _check(job_deadline)
            directory = output / ('job-' + job['id'])
            reused, skip = _job_source(job, directory, check)
            git_stage = skip and reused['archive']['source']['kind'] == 'packet'
            required = reserve + (32 * MIB if skip and not git_stage else ARCHIVE + 32 * MIB)
            free = _space(output)
            if free < required: raise OSError('Insufficient disk headroom; no next child started')
            stage = _new_dir(run, str(index).zfill(6) + '-' + job['id'], check)
            if not skip:
                _directory(directory, True)
                _fresh(directory / 'job.json', {'id': job['id'], 'mode': job['mode'], 'manifest': job['manifest']}, check)
                capture_stage = _new_dir(stage, 'capture', check)
                argv = [sys.executable, '-B', str(Path(source['root']) / 'tools/evidence/capture-packet.py'),
                        '--source-root', source['root'], '--head', source['head'], '--manifest', job['manifest']['path'],
                        '--archive', str(directory / 'complete.tar.xz'), '--receipt', str(directory / 'capture.json'), '--cap-seconds', '170']
                _monitor(argv, capture_stage, source['root'], job_deadline, output, reserve, directory / 'complete.tar.xz')
                receipt, receipt_fact = _metadata(directory / 'capture.json', METADATA, job_check)
                reused = {'archive': {'bytes': receipt['archiveBytes'], 'sha256': receipt['archiveSha256'],
                                      'source': {'kind': 'file', 'path': str(directory / 'complete.tar.xz')}},
                          'receipt': {k: receipt_fact[k] for k in ('path', 'bytes', 'sha256')}, 'provenance': []}
            seconds = min(170, int(job_deadline - time.monotonic()))
            if seconds < 1: raise TimeoutError('No original job budget remains for full authentication')
            authentication = _new_dir(stage, 'authenticate', job_check)
            request = {'schema': 'fixed-complete-capture-authentication-request-v1', 'source': source, 'job': job,
                       'archive': reused['archive'], 'receipt': reused['receipt'], 'provenance': reused['provenance'], 'seconds': seconds}
            request_pin = _fresh(authentication / 'request.json', request, job_check)
            verified_path = authentication / 'verified.json'
            argv = [sys.executable, '-B', str(Path(source['root']) / 'tools/evidence/capture-shards.py'),
                    '--authenticate', str(authentication / 'request.json'), '--request-sha256', request_pin['sha256'], '--verification-output', str(verified_path)]
            _monitor(argv, authentication, source['root'], job_deadline, output, reserve, Path(reused['archive']['source']['path']) if reused['archive']['source']['kind'] == 'file' else None)
            verified, verified_fact = _metadata(verified_path, METADATA, job_check)
            if verified['job'] != job['id'] or verified['manifest'] != job['manifest'] or verified['archive'] != reused['archive'] or verified['sourceCodeAndMetadataUnchanged'] is not True:
                raise ValueError('Fixed child authentication result differs')
            _same([request_pin, manifest, plan_fact, *code_before], job_check)
            finished.append((verified, verified_fact))
            if not skip:
                complete = {'schema': 'complete-local-capture-v1', 'id': job['id'], 'mode': job['mode'], 'manifest': job['manifest'],
                            'archive': reused['archive'], 'receipt': reused['receipt'],
                            'verification': {k: verified_fact[k] for k in ('path', 'bytes', 'sha256')}}
                _fresh(directory / 'complete.json', complete, job_check)
            result['jobs'].append({'id': job['id'], 'recompressed': not skip, 'fullyAuthenticated': True,
                                   'archive': reused['archive'], 'verification': {k: verified_fact[k] for k in ('path', 'bytes', 'sha256')},
                                   'freeBytesAfter': _space(output)})
            _fresh(stage / 'joined.json', result['jobs'][-1], job_check)
            _same([plan_fact, manifest, *code_before], check); _source(source, deadline); _guard(output, identity)
        _same([plan_fact, root_fact, *code_before, *[row[2] for row in job_inputs]], check)
        _finished_unchanged(finished, check)
        _source(source, deadline); _guard(output, identity); check()
        result['status'] = 'PASS declared plan scope only'
    except BaseException as error:
        result['error'] = {'type': type(error).__name__, 'message': str(error)}
    finally:
        result.update({'elapsedSeconds': time.monotonic() - started, 'capSeconds': plan['capSeconds'],
                       'allPartialsAndOriginalsRetained': True, 'freeBytesAfter': _space(output)})
        terminal_fact = _fresh(run / 'terminal.json', result, lambda: None)
        if result['status'].startswith('PASS'):
            try:
                _same([terminal_fact, plan_fact, root_fact, *code_before, *[row[2] for row in job_inputs]], check)
                _finished_unchanged(finished, check); _source(source, deadline); _guard(output, identity); check()
            except BaseException as error:
                result['status'] = 'STOPPED'
                result['error'] = {'type': type(error).__name__, 'message': 'Final ledger boundary: ' + str(error)}
                _fresh(run / 'finalization-refusal.json', result, lambda: None)
    return result


def _main(started):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan'); parser.add_argument('--plan-sha256'); parser.add_argument('--output-directory')
    parser.add_argument('--authenticate'); parser.add_argument('--request-sha256'); parser.add_argument('--verification-output')
    args = parser.parse_args()
    if args.authenticate:
        if args.plan or args.output_directory or not args.request_sha256 or not args.verification_output:
            raise ValueError('Closed fixed authentication command required')
        path = _absolute(args.authenticate)
        pin, unused = _hash(path, METADATA, lambda: _check(started + 170))
        if pin['sha256'] != digest(args.request_sha256): raise ValueError('Authentication request changed')
        request, request_fact = _read(pin, lambda: _check(started + 170))
        if set(request) != {'schema', 'source', 'job', 'archive', 'receipt', 'provenance', 'seconds'} or request['schema'] != 'fixed-complete-capture-authentication-request-v1' or type(request['provenance']) is not list or len(request['provenance']) > 128:
            raise ValueError('Closed bounded authentication request required')
        if type(request['seconds']) is not int or not 1 <= request['seconds'] <= 170:
            raise ValueError('Fixed original worker deadline required')
        worker_deadline = started + request['seconds']
        signal.setitimer(signal.ITIMER_REAL, max(.001, worker_deadline - time.monotonic()))
        result = authenticate(request, _absolute(args.verification_output), started=started)
        _same([request_fact], lambda: _check(worker_deadline))
        print(json.dumps({'job': result['job'], 'fullAuthenticationPassed': True, 'caseAdoption': False}))
        return 0
    if not args.plan or not args.plan_sha256 or not args.output_directory or args.request_sha256 or args.verification_output:
        raise ValueError('Explicit reviewed plan/output required')
    plan = _absolute(args.plan); digest(args.plan_sha256)
    fact, unused = _hash(plan, METADATA, lambda: _check(started + BATCH_SECONDS))
    if fact['sha256'] != args.plan_sha256: raise ValueError('Reviewed batch plan differs')
    selected, unused = _read(fact, lambda: _check(started + BATCH_SECONDS))
    if type(selected.get('capSeconds')) is not int or not 1 <= selected['capSeconds'] <= BATCH_SECONDS:
        raise ValueError('Original finite batch cap required')
    signal.setitimer(signal.ITIMER_REAL, max(.001, started + selected['capSeconds'] - time.monotonic()))
    result = run_batch(fact, _absolute(args.output_directory), started=started)
    print(json.dumps({'status': result['status'], 'completeJobs': len(result['jobs']), 'completeLatestEvidence': False}))
    return 0 if result['status'].startswith('PASS') else 1


def main():
    started = time.monotonic()
    def expired(unused_signal, unused_frame):
        raise TimeoutError('Signal-enforced fixed batch/job outer deadline')
    previous = signal.signal(signal.SIGALRM, expired)
    signal.setitimer(signal.ITIMER_REAL, BATCH_SECONDS)
    try:
        return _main(started)
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous)


if __name__ == '__main__':
    try: sys.exit(main())
    except Exception as error:
        print(json.dumps({'status': 'FAILED preflight', 'type': type(error).__name__, 'message': str(error), 'allOriginalsAndPartialsRetained': True}), file=sys.stderr)
        sys.exit(1)
