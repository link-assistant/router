#!/usr/bin/env python3
"""Recover a complete byte range from a fully authenticated regular archive.

This does not decode an archive or admit range aliases to a packet index. The
caller supplies independently reviewed complete archive and range witnesses.
Failures never replace an existing output; a newly created failed output is
retained without a success receipt. Limits match packet.py's archive/member
limits. Paths are opened through unlinked directory descriptors.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import time

MAX_ARCHIVE = 256 * 1024 * 1024
MAX_MEMBER = 128 * 1024 * 1024
CHUNK = 1024 * 1024


def _integer(value, maximum, label):
    if type(value) is not int or not 0 <= value <= maximum:
        raise ValueError('Invalid ' + label + ' byte bound')
    return value


def _digest(value):
    if not isinstance(value, str) or not re.fullmatch('[a-f0-9]{64}', value):
        raise ValueError('Invalid SHA256 witness')
    return value


def _path(value):
    path = Path(value).absolute()
    if not path.name or any(part in ('.', '..') for part in path.parts):
        raise ValueError('Range recovery requires canonical file paths')
    return path


def _parent(path):
    if not getattr(os, 'O_NOFOLLOW', 0) or not getattr(os, 'O_DIRECTORY', 0):
        raise ValueError('Unlinked directory descriptors are unavailable')
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    descriptor = os.open(path.anchor, flags)
    try:
        for component in path.parts[1:-1]:
            child = os.open(component, flags, dir_fd=descriptor)
            os.close(descriptor)
            descriptor = child
        return descriptor
    except BaseException:
        os.close(descriptor)
        raise


def _stat_identity(value):
    if not stat.S_ISREG(value.st_mode):
        raise ValueError('Range recovery requires a regular archive/output')
    return {key: getattr(value, key) for key in
            ('st_dev', 'st_ino', 'st_mode', 'st_size', 'st_mtime_ns', 'st_ctime_ns')}


def _identity(descriptor):
    return _stat_identity(os.fstat(descriptor))


def _named_identity(path):
    parent = _parent(path)
    try:
        return _stat_identity(os.stat(path.name, dir_fd=parent, follow_symlinks=False))
    finally:
        os.close(parent)


def recover_archive_range(archive, output, *, archive_bytes, archive_sha256,
                          offset, length, range_sha256, cap_seconds=120):
    """Verify all archive bytes, then exclusively write the exact bounded range.

    A successful result authenticates full archive and range bytes and stable
    source identity. It grants no TAR-member or packet-reader authority.
    """
    archive_bytes = _integer(archive_bytes, MAX_ARCHIVE, 'archive')
    offset = _integer(offset, MAX_ARCHIVE, 'offset')
    length = _integer(length, MAX_MEMBER, 'range')
    if offset > archive_bytes or length > archive_bytes - offset:
        raise ValueError('Range exceeds the complete archive')
    if type(cap_seconds) is not int or not 1 <= cap_seconds <= 600:
        raise ValueError('Invalid range recovery deadline')
    archive_sha256, range_sha256 = _digest(archive_sha256), _digest(range_sha256)
    archive, output = _path(archive), _path(output)
    started = time.monotonic()
    deadline = started + cap_seconds

    def check():
        if time.monotonic() > deadline:
            raise TimeoutError('Archive range recovery deadline exceeded')

    source_parent = source = target_parent = target = None
    try:
        source_parent = _parent(archive)
        source = os.open(archive.name, os.O_RDONLY | os.O_NOFOLLOW,
                         dir_fd=source_parent)
        before = _identity(source)
        if _named_identity(archive) != before:
            raise ValueError('Archive path changed before complete verification')
        if before['st_size'] != archive_bytes:
            raise ValueError('Complete archive length mismatch')
        complete_hash, total = hashlib.sha256(), 0
        while True:
            check()
            chunk = os.read(source, CHUNK)
            if not chunk:
                break
            total += len(chunk)
            if total > archive_bytes:
                raise ValueError('Complete archive exceeds its witness')
            complete_hash.update(chunk)
        if total != archive_bytes or complete_hash.hexdigest() != archive_sha256:
            raise ValueError('Complete archive byte/hash mismatch')
        if _identity(source) != before or _named_identity(archive) != before:
            raise ValueError('Archive changed during complete verification')
        # No output is opened until the complete source has been authenticated.
        target_parent = _parent(output)
        target = os.open(output.name, os.O_WRONLY | os.O_CREAT | os.O_EXCL |
                         os.O_NOFOLLOW, 0o600, dir_fd=target_parent)
        created = _identity(target)
        os.lseek(source, offset, os.SEEK_SET)
        selected_hash, remaining = hashlib.sha256(), length
        while remaining:
            check()
            chunk = os.read(source, min(CHUNK, remaining))
            if not chunk:
                raise ValueError('Archive truncated during range recovery')
            selected_hash.update(chunk)
            remaining -= len(chunk)
            position = 0
            while position < len(chunk):
                check()
                written = os.write(target, chunk[position:])
                if written <= 0:
                    raise OSError('Range output write made no progress')
                position += written
        if selected_hash.hexdigest() != range_sha256:
            raise ValueError('Recovered range byte/hash mismatch; fresh output retained')
        check()
        after = _identity(source)
        if after != before or _named_identity(archive) != before:
            raise ValueError('Archive changed during range recovery')
        final = _identity(target)
        if final['st_size'] != length or final['st_ino'] != created['st_ino']:
            raise ValueError('Recovered output identity/length mismatch')
        if _named_identity(output) != final:
            raise ValueError('Recovered output path changed during recovery')
        return {'schema': 'authenticated-archive-byte-range-v1',
                'archive': str(archive), 'archiveBytes': total,
                'archiveSha256': complete_hash.hexdigest(),
                'offset': offset, 'length': length,
                'rangeSha256': selected_hash.hexdigest(), 'output': str(output),
                'sourceBefore': before, 'sourceAfter': after,
                'fullArchiveVerified': True, 'sourceUnchanged': True,
                'exclusiveFreshOutput': True, 'archiveDecoded': False,
                'packetAdmissionChanged': False,
                'elapsedSeconds': time.monotonic() - started}
    finally:
        for descriptor in (target, target_parent, source, source_parent):
            if descriptor is not None:
                os.close(descriptor)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--archive-bytes', required=True, type=int)
    parser.add_argument('--archive-sha256', required=True)
    parser.add_argument('--offset', required=True, type=int)
    parser.add_argument('--length', required=True, type=int)
    parser.add_argument('--range-sha256', required=True)
    parser.add_argument('--cap-seconds', type=int, default=120)
    values = vars(parser.parse_args())
    print(json.dumps(recover_archive_range(**values)))


if __name__ == '__main__':
    main()
