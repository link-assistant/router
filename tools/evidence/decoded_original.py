#!/usr/bin/env python3
"""Recover an exact opaque original by bounded gzip decode of a packet member.

This separate storage lane changes neither packet admission nor CI decoder limits.
Only a direct regular gzip member is supported. All packet members are verified
before a second authenticated extraction; no executable recipe is accepted.
"""
import argparse
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import tarfile
import time

from archive_range import _parent, _identity, _named_identity
from packet import (PacketStore, DecodedArchive, canonical, relative, pairs,
                    size, digest, MAX_MEMBER, MAX_TOTAL)

MAX_INDEX = 4 * 1024 * 1024
MAX_RECEIPT = 16 * 1024 * 1024
MAX_RAW = 512 * 1024 * 1024
CHUNK = 1024 * 1024


def _name(value):
    value = relative(value)
    if any(ord(char) < 32 or ord(char) == 127 for char in value):
        raise ValueError('Invalid decoded-original path')
    return value


def _constant(value):
    raise ValueError('Nonfinite decoded-original JSON value')


def _metadata(path, maximum, check):
    """Read only bounded regular bytes with stable descriptor/path identity."""
    parent = descriptor = None
    try:
        parent = _parent(path)
        descriptor = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW |
                             os.O_NONBLOCK, dir_fd=parent)
        before = _identity(descriptor)
        if before['st_size'] > maximum or _named_identity(path) != before:
            raise ValueError('Decoded-original metadata size/identity mismatch')
        chunks, count, hashed = [], 0, hashlib.sha256()
        while True:
            check()
            chunk = os.read(descriptor, min(65536, maximum + 1 - count))
            if not chunk:
                break
            count += len(chunk)
            if count > maximum:
                raise ValueError('Decoded-original metadata exceeds bound')
            chunks.append(chunk)
            hashed.update(chunk)
        if _identity(descriptor) != before or _named_identity(path) != before:
            raise ValueError('Decoded-original metadata changed during read')
        raw = b''.join(chunks)
        value = json.loads(raw, object_pairs_hook=pairs, parse_constant=_constant)
        return value, {'path': str(path), 'bytes': count,
                       'sha256': hashed.hexdigest(), 'identity': before}
    finally:
        for descriptor in (descriptor, parent):
            if descriptor is not None:
                os.close(descriptor)


class _DeadlinePacketStore(PacketStore):
    """New-lane-only staging uses the existing bounded Git pipe implementation."""
    def verified_archive(self, name, **unused):
        return super().verified_archive(name, _range_stage=True)


class _GzipMember:
    def __init__(self, stream, expected, check):
        self.stream, self.expected, self.check = stream, expected, check
        self.count, self.hashed = 0, hashlib.sha256()

    def read(self, amount=-1):
        self.check()
        amount = CHUNK if amount < 0 else min(amount, CHUNK)
        data = self.stream.read(amount)
        self.count += len(data)
        if self.count > self.expected:
            raise ValueError('Source gzip exceeds declared member length')
        self.hashed.update(data)
        return data

    def finish(self, expected_hash):
        while self.read(CHUNK):
            pass
        if self.count != self.expected or self.hashed.hexdigest() != expected_hash:
            raise ValueError('Complete source gzip byte/hash mismatch')


def _decode(member, output_descriptor, row, check):
    source = _GzipMember(member, row['gzipBytes'], check)
    raw_hash, count = hashlib.sha256(), 0
    with gzip.GzipFile(fileobj=source, mode='rb') as decoder:
        while True:
            check()
            data = decoder.read(min(CHUNK, row['bytes'] + 1 - count))
            if not data:
                break
            count += len(data)
            if count > row['bytes'] or count > MAX_RAW:
                raise ValueError('Decoded original exceeds declared raw bound')
            raw_hash.update(data)
            offset = 0
            while offset < len(data):
                check()
                written = os.write(output_descriptor, data[offset:])
                if written <= 0:
                    raise OSError('Decoded-original output made no progress')
                offset += written
    source.finish(row['gzipSha256'])
    if count != row['bytes'] or raw_hash.hexdigest() != row['sha256']:
        raise ValueError('Complete decoded original byte/hash mismatch')
    return {'gzipBytes': source.count, 'gzipSha256': source.hashed.hexdigest(),
            'bytes': count, 'sha256': raw_hash.hexdigest()}


def recover_gzip_decoded_original(case_root, repository_root, logical_name, output,
                                  *, packet_index='packet-git-index.json',
                                  decoded_index='packet-decoded-original-index.json',
                                  cap_seconds=170):
    """Write a fresh raw original only after complete packet authentication.

    Failure retains a newly created partial output without a success receipt.
    The caller must enclose execution in the original 180-second/RSS monitor.
    """
    if type(cap_seconds) is not int or not 1 <= cap_seconds <= 170:
        raise ValueError('Invalid decoded-original deadline')
    started = time.monotonic()
    deadline = started + cap_seconds

    def check():
        if time.monotonic() > deadline:
            raise TimeoutError('Decoded-original deadline exceeded')

    root = canonical(case_root)
    logical_name = _name(logical_name)
    packet_path, decoded_path = root / _name(packet_index), root / _name(decoded_index)
    _, packet_fact = _metadata(packet_path, MAX_INDEX, check)
    index, index_fact = _metadata(decoded_path, MAX_INDEX, check)
    store = _DeadlinePacketStore(root, repository_root, packet_index, cap_seconds)
    store.deadline = deadline
    if not isinstance(index, dict) or set(index) != {'schema', 'objects'} or index['schema'] != 'complete-packet-gzip-decoded-index-v1':
        raise ValueError('Malformed decoded-original index')
    objects = index['objects']
    if not isinstance(objects, dict) or not 1 <= len(objects) <= 8192:
        raise ValueError('Invalid decoded-original object count')
    total = 0
    for name, row in objects.items():
        check()
        _name(name)
        if not isinstance(row, dict) or set(row) != {'archive', 'member', 'codec', 'gzipBytes', 'gzipSha256', 'bytes', 'sha256', 'membersReceipt'}:
            raise ValueError('Malformed decoded-original witness')
        if row['codec'] != 'gzip':
            raise ValueError('Only fixed gzip decoding is supported')
        if _name(row['archive']) not in store.archives:
            raise ValueError('Decoded original needs a direct declared archive')
        _name(row['member'])
        size(row['gzipBytes'], MAX_MEMBER)
        total += size(row['bytes'], MAX_RAW)
        digest(row['gzipSha256'])
        digest(row['sha256'])
        receipt = row['membersReceipt']
        if not isinstance(receipt, dict) or set(receipt) != {'path', 'bytes', 'sha256'}:
            raise ValueError('Malformed decoded-original member receipt')
        _name(receipt['path'])
        size(receipt['bytes'], MAX_RECEIPT)
        digest(receipt['sha256'])
        if total > MAX_TOTAL:
            raise ValueError('Decoded-original total byte bound exceeded')
    if logical_name not in objects:
        raise ValueError('Missing declared decoded original')
    row = objects[logical_name]
    receipt, receipt_fact = _metadata(root / row['membersReceipt']['path'], MAX_RECEIPT, check)
    if any(receipt_fact[key] != row['membersReceipt'][key] for key in ('bytes', 'sha256')):
        raise ValueError('Decoded-original member receipt byte/hash mismatch')
    archive = row['archive']
    archive_bytes, archive_hash, witness = store.archives[archive]
    if not isinstance(receipt, dict) or receipt.get('schema') != 'complete-evidence-packet-v1' or receipt.get('archiveBytes') != archive_bytes or receipt.get('archiveSha256') != archive_hash:
        raise ValueError('Decoded-original receipt/archive mismatch')
    members = receipt.get('members')
    if not isinstance(members, list) or not 1 <= len(members) <= 8192:
        raise ValueError('Missing full decoded-original member inventory')
    selected = [member for member in members if isinstance(member, dict) and member.get('path') == row['member']]
    if len(selected) != 1 or selected[0].get('bytes') != row['gzipBytes'] or selected[0].get('sha256') != row['gzipSha256']:
        raise ValueError('Decoded-original source member witness mismatch')
    full = store.verify_members(archive, members)
    if size(receipt.get('completeMembers'), 8192) != full['completeMembers'] or size(receipt.get('completeOriginalBytes'), MAX_TOTAL) != full['completeOriginalBytes']:
        raise ValueError('Decoded-original full inventory totals mismatch')
    present = store._range_physical(root / logical_name, row['bytes'], row['sha256'])
    source_present = store._range_physical(root / row['member'], row['gzipBytes'], row['gzipSha256'])
    output = canonical(output)
    parent = target = None
    try:
        with store.verified_archive(archive) as source:
            source_path = Path(source.name)
            source_before = _identity(source.fileno())
            if _named_identity(source_path) != source_before:
                raise ValueError('Authenticated archive staging path changed')
            parent = _parent(output)
            target = os.open(output.name, os.O_WRONLY | os.O_CREAT | os.O_EXCL |
                             os.O_NOFOLLOW, 0o600, dir_fd=parent)
            created = _identity(target)
            result = None
            with io.BufferedReader(DecodedArchive(source, check)) as stream, tarfile.open(fileobj=stream, mode='r|') as tar:
                for member in tar:
                    check()
                    if member.name != row['member']:
                        continue
                    # Existing packet hardlinks stay supported by full verification;
                    # this new source lane deliberately requires a direct regular member.
                    if not member.isfile() or member.islnk() or member.size != row['gzipBytes']:
                        raise ValueError('Decoded original needs a direct regular gzip member')
                    result = _decode(tar.extractfile(member), target, row, check)
                    break
            if result is None:
                raise ValueError('Missing decoded-original gzip member')
            if _identity(source.fileno()) != source_before or _named_identity(source_path) != source_before:
                raise ValueError('Authenticated archive staging source changed')
        check()
        for path, maximum, before in ((packet_path, MAX_INDEX, packet_fact),
                                     (decoded_path, MAX_INDEX, index_fact),
                                     (root / row['membersReceipt']['path'], MAX_RECEIPT, receipt_fact)):
            if _metadata(path, maximum, check)[1] != before:
                raise ValueError('Decoded-original metadata changed during recovery')
        final = _identity(target)
        if final['st_size'] != row['bytes'] or any(final[key] != created[key] for key in ('st_dev', 'st_ino', 'st_mode')) or _named_identity(output) != final:
            raise ValueError('Decoded-original output path/identity mismatch')
        return {'schema': 'complete-packet-gzip-decoded-recovery-v1',
                'logicalOriginal': logical_name, 'codec': 'gzip', **result,
                'output': str(output), 'exclusiveFreshOutput': True,
                'sourceArchive': archive, 'sourceMember': row['member'],
                'archiveWitness': {'bytes': archive_bytes, 'sha256': archive_hash,
                                   'commit': witness[0], 'path': witness[1], 'blob': witness[2]},
                'allPacketMembersVerified': full,
                'packetIndex': packet_fact, 'decodedIndex': index_fact,
                'membersReceipt': receipt_fact, 'archiveSourceBefore': source_before,
                'physicalOriginalPresentAndVerified': present,
                'physicalGzipPresentAndVerified': source_present,
                'elapsedSeconds': time.monotonic() - started,
                'runtimeParity': False, 'semanticAuthority': False,
                'packetAdmissionChanged': False, 'existingCiDecoderBoundsChanged': False}
    finally:
        for descriptor in (target, parent):
            if descriptor is not None:
                os.close(descriptor)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--case-root', required=True)
    parser.add_argument('--repository-root', required=True)
    parser.add_argument('--logical-original', required=True)
    parser.add_argument('--copy-to', required=True)
    parser.add_argument('--packet-index', default='packet-git-index.json')
    parser.add_argument('--decoded-index', default='packet-decoded-original-index.json')
    parser.add_argument('--cap-seconds', type=int, default=170)
    values = vars(parser.parse_args())
    values['logical_name'] = values.pop('logical_original')
    values['output'] = values.pop('copy_to')
    print(json.dumps(recover_gzip_decoded_original(**values)))


if __name__ == '__main__':
    main()
