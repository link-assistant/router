#!/usr/bin/env python3
"""Plan complete bounded captures and ordinary index pages; never issue proof."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import time

from archive_range import _parent, _identity, _named_identity
from decoded_original import _metadata
from packet import PREFIX, canonical, digest, relative, size

SHARD_BYTES = 64 * 1024 * 1024
MAX_MEMBER = 128 * 1024 * 1024
MAX_LOGICAL = 1024 * 1024 * 1024
MAX_MEMBERS = 8192
MAX_ARCHIVES = 64
MAX_MANIFEST = 16 * 1024 * 1024
MAX_INDEX = 4 * 1024 * 1024
MAX_INPUTS = 128
MAX_INPUT_BYTES = 64 * 1024 * 1024
MAX_ROWS = 131072
MAX_PARTS = 4096


def _name(value):
    value = relative(value)
    if len(value.encode()) > 4096 or any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError('Invalid complete planning name')
    return value


def _source(value):
    if not isinstance(value, str) or not Path(value).is_absolute():
        raise ValueError('Original source requires an absolute path')
    if len(value.encode()) > 4096 or any(ord(c) < 32 or ord(c) == 127 for c in value) or Path(value).as_posix() != value or any(p in ('.', '..') for p in value.split('/')):
        raise ValueError('Original source path is not canonical')
    return value


def _encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n').encode()


def _fresh(path, raw, maximum, check):
    if len(raw) > maximum:
        raise ValueError('Complete planning output byte bound exceeded')
    parent = descriptor = None
    try:
        check()
        parent = _parent(path)
        descriptor = os.open(path.name, os.O_RDWR | os.O_CREAT | os.O_EXCL |
                             os.O_NOFOLLOW, 0o600, dir_fd=parent)
        if _named_identity(path) != _identity(descriptor):
            raise ValueError('Fresh planning output path differs')
        offset = 0
        while offset < len(raw):
            check()
            written = os.write(descriptor, raw[offset:offset + 65536])
            if written <= 0:
                raise ValueError('Planning output write made no progress')
            offset += written
        before = _identity(descriptor)
        os.lseek(descriptor, 0, os.SEEK_SET)
        position = 0
        while True:
            check()
            chunk = os.read(descriptor, 65536)
            if not chunk:
                break
            if chunk != raw[position:position + len(chunk)]:
                raise ValueError('Complete planning output readback differs')
            position += len(chunk)
        if position != len(raw) or _identity(descriptor) != before or _named_identity(path) != before:
            raise ValueError('Planning output identity/length changed')
        return {'path': path.name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
    finally:
        for descriptor in (descriptor, parent):
            if descriptor is not None:
                os.close(descriptor)


def _session(inputs, output, cap_seconds):
    if type(cap_seconds) is not int or not 1 <= cap_seconds <= 170:
        raise ValueError('Planning requires a finite 1..170 second deadline')
    if not isinstance(inputs, list) or not 1 <= len(inputs) <= MAX_INPUTS:
        raise ValueError('Bounded nonempty planning inputs required')
    paths = sorted(canonical(path) for path in inputs)
    if len(set(paths)) != len(paths):
        raise ValueError('Duplicate complete input manifest path')
    output = canonical(output)
    if output.exists() or output.is_symlink() or not output.name or any(part in ('.', '..') for part in output.parts):
        raise ValueError('Fresh canonical planning directory required')
    deadline = time.monotonic() + cap_seconds

    def check():
        if time.monotonic() > deadline:
            raise TimeoutError('Complete planning deadline exceeded')

    # Validate every ancestor before reading inputs or creating the fresh root.
    parent = _parent(output)
    os.close(parent)
    return paths, output, check


def _read_inputs(paths, maximum, check):
    records, total = [], 0
    for path in paths:
        value, fact = _metadata(path, maximum, check)
        total += fact['bytes']
        if total > MAX_INPUT_BYTES:
            raise ValueError('Aggregate complete input metadata bound exceeded')
        records.append((value, fact))
    return records


def _mkdir(output):
    parent = _parent(output)
    try:
        os.mkdir(output.name, 0o700, dir_fd=parent)
        actual = os.stat(output.name, dir_fd=parent, follow_symlinks=False)
        opened = os.open(output.name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent)
        try:
            if (os.fstat(opened).st_dev, os.fstat(opened).st_ino) != (actual.st_dev, actual.st_ino):
                raise ValueError('Fresh planning directory identity differs')
        finally:
            os.close(opened)
    finally:
        os.close(parent)
    return _directory_identity(output)


def _directory_identity(output):
    parent = opened = None
    try:
        parent = _parent(output)
        opened = os.open(output.name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent)
        actual = os.fstat(opened)
        named = os.stat(output.name, dir_fd=parent, follow_symlinks=False)
        fields = lambda value: (value.st_dev, value.st_ino, value.st_mode)
        if fields(actual) != fields(named):
            raise ValueError('Planning output directory path differs')
        return fields(actual)
    finally:
        for descriptor in (opened, parent):
            if descriptor is not None:
                os.close(descriptor)


def _output_guard(output, before, check):
    def guarded():
        check()
        if _directory_identity(output) != before:
            raise ValueError('Planning output directory changed')
    return guarded


def _outputs_unchanged(output, facts, maximum, check):
    for fact in facts:
        unused, actual = _metadata(output / fact['path'], maximum, check)
        if actual['bytes'] != fact['bytes'] or actual['sha256'] != fact['sha256']:
            raise ValueError('Complete planned output changed')


def _unchanged(records, maximum, check):
    for unused, fact in records:
        unused, after = _metadata(Path(fact['path']), maximum, check)
        if after != fact:
            raise ValueError('Complete planning input changed')


def plan_shards(inputs, output, *, shard_bytes=SHARD_BYTES, cap_seconds=30,
                archive_prefix='current/complete-evidence-shards', pending_roots=()):
    """Preserve every declared four-field row, without reading original bodies."""
    if type(shard_bytes) is not int or not 1 <= shard_bytes <= SHARD_BYTES:
        raise ValueError('Logical shard target must be within 1..64MiB')
    archive_prefix = _name(archive_prefix)
    if not isinstance(pending_roots, (tuple, list)) or len(pending_roots) > MAX_INPUTS:
        raise ValueError('Bounded explicit pending roots required')
    pending = sorted({_source(path) for path in pending_roots})
    paths, output, check = _session(inputs, output, cap_seconds)
    records = _read_inputs(paths, MAX_MANIFEST, check)
    rows, origins = {}, {}
    for input_index, (value, fact) in enumerate(records):
        if not isinstance(value, dict) or set(value) != {'members'} or not isinstance(value['members'], list) or not 1 <= len(value['members']) <= MAX_MEMBERS:
            raise ValueError('Expected a complete bounded capture manifest')
        total = 0
        for row_index, row in enumerate(value['members']):
            check()
            if not isinstance(row, dict) or set(row) != {'path', 'originalPath', 'bytes', 'sha256'}:
                raise ValueError('Complete original row requires its exact four fields')
            name = _name(row['path'])
            _source(row['originalPath'])
            length = size(row['bytes'], MAX_MEMBER)
            digest(row['sha256'])
            if length > shard_bytes:
                raise ValueError('Complete original exceeds logical shard target; retain it intact for separately qualified storage')
            if name in rows:
                raise ValueError('Duplicate logical original; preserve its explicit existing resolution separately')
            total += length
            if total > MAX_LOGICAL or len(rows) >= MAX_ROWS:
                raise ValueError('Complete input logical/member planning bound exceeded')
            rows[name] = dict(row)
            origins[name] = {'input': input_index, 'row': row_index}
    parts, current, current_bytes, encoded_rows = [], [], 0, 0
    for name in sorted(rows):
        check()
        row = rows[name]
        row_bytes = len(_encoded(row)) + 32  # conservative indent/wrapper allowance
        if current and (current_bytes + row['bytes'] > shard_bytes or len(current) >= MAX_MEMBERS or encoded_rows + row_bytes > MAX_MANIFEST - 128):
            parts.append(current)
            current, current_bytes, encoded_rows = [], 0, 0
        current.append(row)
        current_bytes += row['bytes']
        encoded_rows += row_bytes
    if current:
        parts.append(current)
    if not 1 <= len(parts) <= MAX_PARTS:
        raise ValueError('Complete shard count bound exceeded')
    output_identity = _mkdir(output)
    check = _output_guard(output, output_identity, check)
    shards, membership = [], []
    for index, part in enumerate(parts, 1):
        check()
        name = 'capture-manifest-' + str(index).zfill(6) + '.json'
        manifest = _fresh(output / name, _encoded({'members': part}), MAX_MANIFEST, check)
        archive = archive_prefix + '/part-' + str(index).zfill(6) + '.tar.xz'
        shards.append({'manifest': manifest, 'members': len(part), 'completeLogicalBytes': sum(row['bytes'] for row in part), 'archiveSlot': archive, 'provisionalIndexPageSlot': (index - 1) // MAX_ARCHIVES + 1})
        membership.extend({'path': row['path'], 'manifest': name, 'row': at, 'source': origins[row['path']]} for at, row in enumerate(part))
    _unchanged(records, MAX_MANIFEST, check)
    _outputs_unchanged(output, [row['manifest'] for row in shards], MAX_MANIFEST, check)
    plan = {'schema': 'complete-evidence-shard-plan-v1', 'inputs': [fact for unused, fact in records], 'shards': shards, 'membership': membership, 'pendingRoots': pending, 'logicalShardBytes': shard_bytes, 'completeRows': len(rows), 'completeLogicalBytes': sum(row['bytes'] for row in rows.values()), 'maximumArchivesPerIndexPage': MAX_ARCHIVES, 'provisionalPagesIncludeExistingArchives': False, 'actualPagesRequireAllOrdinaryWitnessInputs': True, 'allDeclaredRowsPreserved': True, 'originalBodiesRead': False, 'gitWitnessesIssued': False, 'archivesCaptured': False, 'completeLatestEvidence': False, 'adoption': False}
    ledger = _fresh(output / 'shard-plan.json', _encoded(plan), MAX_INPUT_BYTES, check)
    # The final ledger write is an I/O boundary too. Neither an input nor an
    # earlier component may change during it and still produce a success.
    _unchanged(records, MAX_MANIFEST, check)
    _outputs_unchanged(output, [row['manifest'] for row in shards], MAX_MANIFEST, check)
    _outputs_unchanged(output, [ledger], MAX_INPUT_BYTES, check)
    check()
    return plan


def plan_index_pages(inputs, output, *, cap_seconds=30):
    """Repage only explicit ordinary witness rows; readers still authenticate."""
    paths, output, check = _session(inputs, output, cap_seconds)
    records = _read_inputs(paths, MAX_INDEX, check)
    archives, provenance = {}, {}
    for input_index, (value, fact) in enumerate(records):
        if not isinstance(value, dict) or set(value) != {'schema', 'archives'} or value['schema'] != 'complete-packet-git-index-v1' or not isinstance(value['archives'], dict) or not 1 <= len(value['archives']) <= MAX_ARCHIVES:
            raise ValueError('Existing complete ordinary packet index required')
        for name, row in value['archives'].items():
            check()
            _name(name)
            if not isinstance(row, dict) or set(row) != {'bytes', 'sha256', 'git'}:
                raise ValueError('Direct ordinary archive witness required')
            size(row['bytes'], 256 * 1024 * 1024)
            digest(row['sha256'])
            witness = row['git']
            if not isinstance(witness, dict) or set(witness) != {'commit', 'path', 'blob'} or witness['path'] != PREFIX + name:
                raise ValueError('Escaping/indirect ordinary archive witness')
            digest(witness['commit'], 40)
            digest(witness['blob'], 40)
            if name in archives and archives[name] != row:
                raise ValueError('Conflicting direct archive witnesses')
            archives[name] = row
            provenance.setdefault(name, []).append({'input': input_index, 'archive': name})
    pages, current = [], {}
    for name in sorted(archives):
        candidate = {**current, name: archives[name]}
        if current and (len(candidate) > MAX_ARCHIVES or len(_encoded({'schema': 'complete-packet-git-index-v1', 'archives': candidate})) > MAX_INDEX):
            pages.append(current)
            current = {}
        current[name] = archives[name]
    if current:
        pages.append(current)
    output_identity = _mkdir(output)
    check = _output_guard(output, output_identity, check)
    output_pages, membership = [], []
    for number, page in enumerate(pages, 1):
        name = 'packet-git-index-' + str(number).zfill(6) + '.json'
        fact = _fresh(output / name, _encoded({'schema': 'complete-packet-git-index-v1', 'archives': page}), MAX_INDEX, check)
        output_pages.append({'index': fact, 'archives': len(page)})
        membership.extend({'archive': archive, 'index': name, 'sources': provenance[archive]} for archive in page)
    _unchanged(records, MAX_INDEX, check)
    _outputs_unchanged(output, [row['index'] for row in output_pages], MAX_INDEX, check)
    plan = {'schema': 'complete-ordinary-index-page-plan-v1', 'inputs': [fact for unused, fact in records], 'pages': output_pages, 'membership': membership, 'maximumArchivesPerPage': MAX_ARCHIVES, 'directArchiveWitnesses': len(archives), 'allDeclaredWitnessRowsPreserved': True, 'gitWitnessesAuthenticated': False, 'sourceBodiesOrArchivesRead': False, 'semanticAuthority': False, 'adoption': False}
    ledger = _fresh(output / 'index-page-plan.json', _encoded(plan), MAX_INPUT_BYTES, check)
    _unchanged(records, MAX_INDEX, check)
    _outputs_unchanged(output, [row['index'] for row in output_pages], MAX_INDEX, check)
    _outputs_unchanged(output, [ledger], MAX_INPUT_BYTES, check)
    check()
    return plan


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_subparsers(dest='mode', required=True)
    for name in ('shards', 'index-pages'):
        command = modes.add_parser(name)
        command.add_argument('--input', action='append', required=True)
        command.add_argument('--output-directory', required=True)
        command.add_argument('--cap-seconds', type=int, default=30)
        if name == 'shards':
            command.add_argument('--shard-bytes', type=int, default=SHARD_BYTES)
            command.add_argument('--archive-prefix', default='current/complete-evidence-shards')
            command.add_argument('--pending-root', action='append', default=[])
    args = parser.parse_args()
    if args.mode == 'shards':
        result = plan_shards(args.input, args.output_directory, shard_bytes=args.shard_bytes, cap_seconds=args.cap_seconds, archive_prefix=args.archive_prefix, pending_roots=args.pending_root)
        print(json.dumps({'completeRows': result['completeRows'], 'shards': len(result['shards']), 'completeLatestEvidence': False, 'archivesCaptured': False}))
    else:
        result = plan_index_pages(args.input, args.output_directory, cap_seconds=args.cap_seconds)
        print(json.dumps({'directArchiveWitnesses': result['directArchiveWitnesses'], 'pages': len(result['pages']), 'gitWitnessesAuthenticated': False}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'schema': 'complete-evidence-planning-failure-v1', 'errorType': type(error).__name__, 'reason': str(error), 'archivesCaptured': False, 'adoption': False}), file=sys.stderr)
        sys.exit(1)
