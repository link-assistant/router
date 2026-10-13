#!/usr/bin/env python3
"""Capture complete, hash-pinned evidence; storage never confers semantic authority."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import tarfile
import time

MAX_MEMBERS = 8192
MAX_MEMBER_BYTES = 128 * 1024 * 1024
MAX_TOTAL_BYTES = 1024 * 1024 * 1024
MAX_MANIFEST_BYTES = 16 * 1024 * 1024


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def canonical_system_path(path):
    # macOS exposes these OS-owned roots as aliases. Other links stay refused.
    path = path.absolute()
    for alias in [Path('/tmp'), Path('/var')]:
        if alias.is_symlink() and path.is_relative_to(alias):
            return alias.resolve() / path.relative_to(alias)
    return path


def check_deadline(deadline):
    if time.monotonic() > deadline:
        raise TimeoutError('Complete archive deadline exceeded')


def file_digest(path, deadline=None, max_bytes=MAX_MEMBER_BYTES):
    path = canonical_system_path(path)
    digest = hashlib.sha256()
    size = 0
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            if deadline is not None:
                check_deadline(deadline)
            digest.update(chunk)
            size += len(chunk)
            if size > max_bytes:
                raise ValueError('Member byte budget exceeded: ' + str(path))
    return size, digest.hexdigest()


def plain_file(path):
    path = canonical_system_path(path)
    if any(parent.is_symlink() for parent in [path, *path.parents]):
        raise ValueError('Linked evidence paths are refused: ' + str(path))
    if not path.is_file():
        raise ValueError('Evidence must be a regular file: ' + str(path))
    return path.stat()


def source_head(root):
    return subprocess.check_output(
        ['git', 'rev-parse', 'HEAD'], cwd=root, timeout=30
    ).decode().strip()


def read_manifest(path, deadline):
    state = plain_file(path)
    if state.st_size > MAX_MANIFEST_BYTES:
        raise ValueError('Manifest byte budget exceeded')
    raw = path.read_bytes()
    manifest = json.loads(raw)
    if set(manifest) != {'members'} or not isinstance(manifest['members'], list):
        raise ValueError('Manifest requires only a complete members array')
    if not 0 < len(manifest['members']) <= MAX_MEMBERS:
        raise ValueError('Member count exceeds the bounded scope')
    names = set()
    rows = []
    total = 0
    for row in manifest['members']:
        check_deadline(deadline)
        if not isinstance(row, dict) or set(row) != {'path', 'originalPath', 'bytes', 'sha256'}:
            raise ValueError('Each member needs its exact path, originalPath, bytes and sha256')
        name = row['path']
        if not isinstance(name, str) or not name or '\\' in name or '\0' in name:
            raise ValueError('Invalid archive member name')
        logical = PurePosixPath(name)
        if logical.is_absolute() or any(part in ['.', '..'] for part in name.split('/')) or logical.as_posix() != name:
            raise ValueError('Noncanonical or escaping archive member name: ' + name)
        if name in names:
            raise ValueError('Duplicate archive member name: ' + name)
        names.add(name)
        if type(row['bytes']) is not int or not 0 <= row['bytes'] <= MAX_MEMBER_BYTES:
            raise ValueError('Invalid member byte bound: ' + name)
        if not isinstance(row['sha256'], str) or not re.fullmatch('[a-f0-9]{64}', row['sha256']):
            raise ValueError('Invalid pinned SHA256: ' + name)
        if not isinstance(row['originalPath'], str) or not Path(row['originalPath']).is_absolute():
            raise ValueError('Original evidence paths must be absolute')
        original = Path(row['originalPath'])
        state = plain_file(original)
        if state.st_size != row['bytes'] or file_digest(original, deadline) != (row['bytes'], row['sha256']):
            raise ValueError('Original differs from the complete pinned manifest: ' + name)
        total += row['bytes']
        if total > MAX_TOTAL_BYTES:
            raise ValueError('Complete original byte budget exceeded')
        rows.append(dict(row))
    # Group complete vectors to improve compression; their content stays intact.
    rows.sort(key=lambda row: (0 if 'input' in row['path'].lower() else 1, row['path']))
    return raw, rows


class CheckedReader:
    def __init__(self, stream, row, deadline):
        self.stream = stream
        self.row = row
        self.digest = hashlib.sha256()
        self.size = 0
        self.deadline = deadline

    def read(self, count=-1):
        check_deadline(self.deadline)
        data = self.stream.read(count)
        self.size += len(data)
        self.digest.update(data)
        return data

    def verify(self):
        if self.size != self.row['bytes'] or self.digest.hexdigest() != self.row['sha256']:
            raise ValueError('Evidence changed during archive streaming: ' + self.row['path'])


def write_archive(path, rows, deadline):
    identities = {}
    with path.open('xb') as output:
        with tarfile.open(fileobj=output, mode='w:xz', preset=9) as tar:
            for row in rows:
                if time.monotonic() > deadline:
                    raise TimeoutError('Archive producer deadline exceeded')
                original = canonical_system_path(Path(row['originalPath']))
                plain_file(original)
                identity = (row['bytes'], row['sha256'])
                entry = tarfile.TarInfo(row['path'])
                entry.mode = 0o644
                entry.mtime = 0
                if identity in identities:
                    # Hash equality is rechecked against both complete originals.
                    previous = identities[identity]
                    if file_digest(original, deadline) != identity or file_digest(Path(previous['originalPath']), deadline) != identity:
                        raise ValueError('Duplicate original changed during archive streaming')
                    entry.type = tarfile.LNKTYPE
                    entry.linkname = previous['path']
                    row['storedAsHardlink'] = previous['path']
                    tar.addfile(entry)
                else:
                    entry.size = row['bytes']
                    with original.open('rb') as stream:
                        reader = CheckedReader(stream, row, deadline)
                        tar.addfile(entry, reader)
                        reader.verify()
                    identities[identity] = row


def verify_archive(path, rows, deadline):
    expected = {row['path']: row for row in rows}
    decoded = {}
    with path.open('rb') as source:
        with tarfile.open(fileobj=source, mode='r|xz') as tar:
            for member in tar:
                if time.monotonic() > deadline:
                    raise TimeoutError('Archive verifier deadline exceeded')
                if member.name not in expected or member.name in decoded:
                    raise ValueError('Unexpected or repeated archive member')
                if member.islnk():
                    if member.linkname not in decoded:
                        raise ValueError('Dangling or forward archive hardlink')
                    actual = decoded[member.linkname]
                elif member.isfile():
                    stream = tar.extractfile(member)
                    digest = hashlib.sha256()
                    size = 0
                    while chunk := stream.read(1024 * 1024):
                        check_deadline(deadline)
                        size += len(chunk)
                        if size > MAX_MEMBER_BYTES:
                            raise ValueError('Decoded member byte budget exceeded')
                        digest.update(chunk)
                    actual = (size, digest.hexdigest())
                else:
                    raise ValueError('Only complete files and backward hardlinks are allowed')
                row = expected[member.name]
                if actual != (row['bytes'], row['sha256']):
                    raise ValueError('Decoded original hash mismatch: ' + member.name)
                decoded[member.name] = actual
    if set(decoded) != set(expected):
        raise ValueError('Archive omitted a complete original')
    return len(decoded)


def capture(args):
    started = time.monotonic()
    deadline = started + args.cap_seconds
    root = canonical_system_path(Path(args.source_root))
    head = source_head(root)
    if head != args.head:
        raise ValueError('Source HEAD differs from the requested immutable commit')
    archive = canonical_system_path(Path(args.archive))
    receipt = canonical_system_path(Path(args.receipt))
    manifest_path = canonical_system_path(Path(args.manifest))
    if archive == receipt or archive.exists() or receipt.exists():
        raise ValueError('Archive and receipt paths must be distinct and new')
    for parent in [archive.parent, receipt.parent]:
        if not parent.is_dir() or any(path.is_symlink() for path in [parent, *parent.parents]):
            raise ValueError('Output parents must exist and contain no links')
    manifest_raw, rows = read_manifest(manifest_path, deadline)
    if any(canonical_system_path(Path(row['originalPath'])) in [archive, receipt] for row in rows):
        raise ValueError('Archive output overlaps a selected original')
    write_archive(archive, rows, deadline)
    count = verify_archive(archive, rows, deadline)
    # No captured original may change between planning and complete verification.
    for row in rows:
        check_deadline(deadline)
        original = Path(row['originalPath'])
        plain_file(original)
        if file_digest(original, deadline) != (row['bytes'], row['sha256']):
            raise ValueError('Original changed after complete archive verification: ' + row['path'])
    if manifest_path.read_bytes() != manifest_raw or source_head(root) != head:
        raise ValueError('Manifest or source commit changed during capture')
    archive_sha = file_digest(archive, deadline, MAX_TOTAL_BYTES)[1]
    check_deadline(deadline)
    record = {
        'schema': 'complete-evidence-packet-v1', 'sourceHead': head,
        'archive': str(archive), 'archiveBytes': archive.stat().st_size,
        'archiveSha256': archive_sha, 'manifestSha256': sha256(manifest_raw),
        'members': rows, 'completeMembers': count,
        'completeOriginalBytes': sum(row['bytes'] for row in rows),
        'allDecodedOriginalsVerified': True, 'allSelectedOriginalsUnchanged': True,
        'capSeconds': args.cap_seconds, 'elapsedSeconds': time.monotonic() - started,
        'compression': {'format': 'xz', 'preset': 9, 'dictionaryBytes': 64 * 1024 * 1024},
        'harnessSha256': sha256(Path(__file__).read_bytes()),
        'semanticAuthority': False, 'runtimeParity': False, 'fullGatePass': False,
        'rustExecuted': False,
    }
    with receipt.open('x') as stream:
        json.dump(record, stream, indent=2)
        stream.write('\n')
    print(json.dumps({key: value for key, value in record.items() if key != 'members'}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', required=True)
    parser.add_argument('--head', required=True)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--archive', required=True)
    parser.add_argument('--receipt', required=True)
    parser.add_argument('--cap-seconds', type=int, default=600)
    args = parser.parse_args()
    if not re.fullmatch('[a-f0-9]{40}', args.head) or not 1 <= args.cap_seconds <= 1800:
        parser.error('A complete immutable SHA and finite 1..1800 second cap are required')
    try:
        capture(args)
    except Exception as error:
        # Failed files remain available for inspection; no source is removed.
        print(json.dumps({'schema': 'complete-evidence-packet-failure-v1',
                          'errorType': type(error).__name__, 'reason': str(error),
                          'semanticAuthority': False, 'runtimeParity': False,
                          'fullGatePass': False, 'rustExecuted': False}), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
