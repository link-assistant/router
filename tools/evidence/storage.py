"""Exact container and decoded-member access; storage grants no semantic authority."""
import gzip
import hashlib
import io
import json
import lzma
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import tarfile
import time
from types import MappingProxyType

MAX_OBJECTS = 8192
MAX_MEMBER = 128 * 1024 * 1024
MAX_TOTAL = 1024 * 1024 * 1024
MAX_INDEX = 16 * 1024 * 1024
CI_PREFIX = 'raw/ci'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def relative(name):
    if not isinstance(name, str) or not name or '\\' in name or any(ord(c) < 32 for c in name):
        raise ValueError('Invalid storage path')
    if PurePosixPath(name).is_absolute() or any(p in ['', '.', '..'] for p in name.split('/')):
        raise ValueError('Noncanonical or escaping storage path')
    return name


def positive_size(n, limit=MAX_MEMBER):
    if type(n) is not int or not 0 <= n <= limit:
        raise ValueError('Storage byte bound invalid')
    return n


def digest(value, length=64):
    if not isinstance(value, str) or not re.fullmatch('[a-f0-9]{' + str(length) + '}', value):
        raise ValueError('Storage digest invalid')
    return value


def exact_keys(value, keys):
    if not isinstance(value, dict) or set(value) != set(keys):
        raise ValueError('Malformed storage index fields')


def no_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate storage index key')
        result[key] = value
    return result


def canonical_system(path):
    path = Path(path).absolute()
    for alias in [Path('/tmp'), Path('/var')]:
        if alias.is_symlink() and path.is_relative_to(alias):
            return alias.resolve() / path.relative_to(alias)
    return path


def plain(path, missing=False):
    path = canonical_system(path)
    for part in [path, *path.parents]:
        if part.is_symlink():
            raise ValueError('Linked storage path refused')
    if missing and not path.exists():
        return None
    if not path.is_file():
        raise ValueError('Storage requires regular file')
    return path.stat()


class CheckedStream:
    def __init__(self, stream, size, expected, deadline):
        self.stream, self.size, self.expected, self.deadline = stream, size, expected, deadline
        self.count, self.hash = 0, hashlib.sha256()

    def read(self, n=-1):
        if time.monotonic() > self.deadline:
            raise TimeoutError('Storage operation deadline exceeded')
        data = self.stream.read(min(n if n >= 0 else self.size-self.count+1, max(1, self.size-self.count+1)))
        self.count += len(data)
        if self.count > self.size:
            raise ValueError('Decoded storage byte bound exceeded')
        self.hash.update(data)
        return data

    def verify(self):
        if self.count != self.size or self.hash.hexdigest() != self.expected:
            raise ValueError('Complete decoded member size/hash mismatch')


class Storage:
    def __init__(self, case_root, repository_root=None, index='raw/ci/object-storage-index.json', cap_seconds=180):
        self.root = canonical_system(case_root)
        if not self.root.is_dir() or any(p.is_symlink() for p in [self.root, *self.root.parents]):
            raise ValueError('Storage root must be a plain directory')
        self.repository = canonical_system(repository_root) if repository_root else self.find_repository()
        if type(cap_seconds) is not int or not 1 <= cap_seconds <= 1800:
            raise ValueError('Storage finite deadline invalid')
        if self.repository and (not self.repository.is_dir() or any(p.is_symlink() for p in [self.repository, *self.repository.parents])):
            raise ValueError('Linked or absent Git repository root refused')
        self.deadline = time.monotonic() + cap_seconds
        self.objects, self.archives = {}, {}
        self.index_path = self.root / relative(index)
        if plain(self.index_path, missing=True) is not None:
            raw = self.read_plain(self.index_path, MAX_INDEX)
            self.load_index(json.loads(raw, object_pairs_hook=no_duplicates))

    def find_repository(self):
        for root in [self.root, *self.root.parents]:
            if (root / '.git').exists():
                return root
        return None

    def check(self):
        if time.monotonic() > self.deadline:
            raise TimeoutError('Storage operation deadline exceeded')

    def read_plain(self, path, maximum=MAX_MEMBER):
        self.check()
        before = plain(path)
        if before.st_size > maximum:
            raise ValueError('Storage file byte budget exceeded')
        data = path.read_bytes()
        after = plain(path)
        identity = lambda s: (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns, s.st_ctime_ns)
        if identity(before) != identity(after) or len(data) != before.st_size:
            raise ValueError('Storage file changed during read')
        return data

    def load_index(self, index):
        exact_keys(index, ['schema', 'gitPrefix', 'objects', 'archives'])
        if index['schema'] != 'ci-object-batch-index-v1':
            raise ValueError('Unsupported storage index schema')
        self.git_prefix = relative(index['gitPrefix'])
        if not isinstance(index['objects'], dict) or not isinstance(index['archives'], dict) or not 0 < len(index['objects']) <= MAX_OBJECTS:
            raise ValueError('Storage index object budget invalid')
        total, targets = 0, {}
        for name, row in index['objects'].items():
            relative(name)
            exact_keys(row, ['containerBytes', 'containerSha256', 'decodedBytes', 'decodedSha256', 'archive', 'member', 'git'])
            positive_size(row['containerBytes']); positive_size(row['decodedBytes'])
            digest(row['containerSha256']); digest(row['decodedSha256'])
            relative(row['archive']); relative(row['member'])
            exact_keys(row['git'], ['commit', 'path', 'blob'])
            digest(row['git']['commit'], 40); digest(row['git']['blob'], 40)
            if row['git']['path'] != self.git_prefix + '/' + name:
                raise ValueError('Git witness path does not match logical target')
            total += row['decodedBytes']
            if total > MAX_TOTAL:
                raise ValueError('Complete decoded storage budget exceeded')
            members = targets.setdefault(row['archive'], {})
            if row['member'] in members:
                raise ValueError('Duplicate archive member target')
            members[row['member']] = name
        if set(targets) != set(index['archives']):
            raise ValueError('Missing or extra storage archive target')
        for name, row in index['archives'].items():
            relative(name); exact_keys(row, ['bytes', 'sha256', 'members'])
            positive_size(row['bytes']); digest(row['sha256'])
            if not isinstance(row['members'], list) or any(not isinstance(m, str) for m in row['members']) or len(set(row['members'])) != len(row['members']) or set(row['members']) != set(targets[name]):
                raise ValueError('Missing extra or duplicate declared archive members')
        self.objects = MappingProxyType({name:MappingProxyType({**row,'git':MappingProxyType(row['git'])}) for name,row in index['objects'].items()})
        self.archives = MappingProxyType({name:MappingProxyType({**row,'members':tuple(row['members'])}) for name,row in index['archives'].items()})
        self.targets = MappingProxyType({name:MappingProxyType(rows) for name,rows in targets.items()})

    def physical(self, logical):
        return self.root / CI_PREFIX / relative(logical)

    def exists(self, logical):
        relative(logical)
        if logical in self.objects:
            self.read_container(logical)
            return True
        return plain(self.physical(logical), missing=True) is not None

    def git(self, *args):
        self.check()
        if not self.repository:
            raise ValueError('Exact container needs its full Git repository witness')
        result = subprocess.run(['git', *args], cwd=self.repository, capture_output=True, env={**os.environ,'GIT_NO_LAZY_FETCH':'1'}, timeout=min(30, max(1, self.deadline-time.monotonic())))
        if result.returncode:
            raise ValueError('Missing or invalid immutable Git storage witness')
        return result.stdout

    def read_container(self, logical):
        relative(logical)
        row = self.objects.get(logical)
        if row is None:
            return self.read_plain(self.physical(logical))
        witness = row['git']
        if self.git('rev-parse', '--verify', witness['commit']+'^{commit}').decode().strip() != witness['commit']:
            raise ValueError('Immutable Git commit identity mismatch')
        self.git('merge-base', '--is-ancestor', witness['commit'], 'HEAD')
        blob = self.git('rev-parse', witness['commit']+':'+witness['path']).decode().strip()
        if blob != witness['blob'] or self.git('cat-file', '-t', blob).decode().strip() != 'blob':
            raise ValueError('Git container blob identity mismatch')
        if int(self.git('cat-file', '-s', blob)) != row['containerBytes']:
            raise ValueError('Git container length mismatch')
        data = self.git('cat-file', 'blob', blob)
        if len(data) != row['containerBytes'] or sha(data) != row['containerSha256']:
            raise ValueError('Git container byte/hash mismatch')
        physical = self.physical(logical)
        if plain(physical, missing=True) is not None and self.read_plain(physical) != data:
            raise ValueError('Current physical container disagrees with Git witness')
        return data

    def container_size(self, logical):
        relative(logical)
        return self.objects[logical]['containerBytes'] if logical in self.objects else plain(self.physical(logical)).st_size

    def iter_decoded(self, names):
        names = list(names)
        if len(set(names)) != len(names):
            raise ValueError('Duplicate requested logical storage targets')
        groups = {}
        for name in names:
            relative(name)
            row = self.objects.get(name)
            archive = row['archive'] if row else None
            groups.setdefault(archive, []).append(name)
        for archive, requested in groups.items():
            if archive is None or plain(self.root/archive, missing=True) is None:
                for name in requested:
                    data = self.read_container(name)
                    stream = io.BytesIO(data)
                    if name.endswith('.xz'): stream = lzma.LZMAFile(stream)
                    elif name.endswith('.gz'): stream = gzip.GzipFile(fileobj=stream)
                    row = self.objects.get(name)
                    if row:
                        checked = CheckedStream(stream, row['decodedBytes'], row['decodedSha256'], self.deadline)
                        yield name, checked
                        checked.verify()
                    else:
                        yield name, CheckedStream(stream, MAX_MEMBER, '', self.deadline)
                    stream.close()
                continue
            # Join every declared decoded member to its independently retained
            # original container, even when callers supply no receipt list.
            for name in self.targets[archive].values():
                original = io.BytesIO(self.read_container(name))
                if name.endswith('.xz'): original = lzma.LZMAFile(original)
                elif name.endswith('.gz'): original = gzip.GzipFile(fileobj=original)
                row = self.objects[name]
                checked = CheckedStream(original, row['decodedBytes'], row['decodedSha256'], self.deadline)
                try:
                    while checked.read(1024*1024): pass
                    checked.verify()
                finally: original.close()
            spec = self.archives[archive]
            data = self.read_plain(self.root/archive)
            if len(data) != spec['bytes'] or sha(data) != spec['sha256']:
                raise ValueError('Complete storage archive size/hash mismatch')
            expected, seen = self.targets[archive], set()
            with tarfile.open(fileobj=io.BytesIO(data), mode='r|xz') as tar:
                for member in tar:
                    self.check()
                    if not member.isfile() or member.name not in expected or member.name in seen:
                        raise ValueError('Unsafe duplicate or extra archive member')
                    name = expected[member.name]; row = self.objects[name]
                    if member.size != row['decodedBytes']:
                        raise ValueError('Archive member byte bound mismatch')
                    stream = CheckedStream(tar.extractfile(member), row['decodedBytes'], row['decodedSha256'], self.deadline)
                    if name in requested:
                        yield name, stream
                    else:
                        while stream.read(1024*1024): pass
                    stream.verify(); seen.add(member.name)
            if seen != set(expected):
                raise ValueError('Complete archive omitted a target member')

    def read_decoded(self, logical):
        result = None
        for _, stream in self.iter_decoded([logical]):
            chunks = []
            while chunk := stream.read(1024*1024): chunks.append(chunk)
            result = b''.join(chunks)
        return result

    def physical_metrics(self):
        seen, count, logical, allocated = set(), 0, 0, 0
        for p in self.root.rglob('*'):
            if p.is_symlink(): raise ValueError('Linked physical evidence refused')
            if not p.is_file(): continue
            s = p.stat(); key = (s.st_dev, s.st_ino)
            if key not in seen:
                seen.add(key); count += 1; logical += s.st_size; allocated += s.st_blocks*512
        return {'distinctPhysicalFiles':count,'physicalStoredBytes':logical,'physicalAllocatedBytes':allocated}

    def verify_entries(self, entries, screen=None):
        grouped = {}
        for entry in entries:
            name = relative(entry['path']); grouped.setdefault(name, []).append(entry)
            row = self.objects.get(name)
            if row and (entry.get('sha256') != row['containerSha256'] or entry.get('decoded_sha256', entry.get('scrubbed_content_sha256')) != row['decodedSha256']):
                raise ValueError('Current receipt facts disagree with storage index')
        if not set(self.objects).issubset(grouped):
            raise ValueError('Extra indexed target lacks current receipt reference')
        for name, refs in grouped.items():
            data = self.read_container(name)
            for entry in refs:
                if entry.get('sha256') and sha(data) != entry['sha256']:
                    raise ValueError('Current receipt container hash mismatch')
                # This existing migration schema retains compressed_bytes as an old
                # gzip fact and records the current XZ container length in bytes.
                size = entry.get('bytes') if entry.get('original_gzip_sha256') and entry.get('compression') == 'xz' else entry.get('compressed_bytes')
                if size is None and not name.endswith(('.gz','.xz')): size = entry.get('bytes')
                if size is not None and len(data) != size:
                    raise ValueError('Current receipt container length mismatch')
        decoded_bytes = 0
        for name, stream in self.iter_decoded(grouped):
            h, tail = hashlib.sha256(), b''
            while chunk := stream.read(1024*1024):
                h.update(chunk); decoded_bytes += len(chunk)
                if screen and screen.search(tail+chunk):
                    raise ValueError('Credential pattern detected without disclosing value')
                tail = chunk[-200:]
            for entry in grouped[name]:
                expected = entry.get('decoded_sha256', entry.get('scrubbed_content_sha256'))
                if expected and h.hexdigest() != expected:
                    raise ValueError('Current receipt decoded hash mismatch')
        present_archives = sum(plain(self.root/name, missing=True) is not None for name in self.archives)
        return {'receiptReferences':len(entries),'uniqueLogicalObjects':len(grouped),'decodedBytesStreamed':decoded_bytes,'indexedObjects':len(self.objects),'declaredArchives':len(self.archives),'physicalArchives':present_archives}
