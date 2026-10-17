#!/usr/bin/env python3
"""Prepare real ancestor archive commits without changing a checkout or case.

This creates a fresh private candidate ref, not an adopted storage migration.
Every source archive remains present; all recovery/continuity/fit gates still apply.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import select
import subprocess
import tempfile
import time

from archive_range import _parent, _identity, _named_identity
from decoded_original import _metadata
from packet import PacketStore, PREFIX, MAX_ARCHIVE, MAX_TOTAL, canonical, digest, pairs, relative, size

MAX_PLAN = 4 * 1024 * 1024
MAX_RECEIPT = 16 * 1024 * 1024


def _name(value):
    value = relative(value)
    if any(ord(c) < 32 or ord(c) == 127 for c in value) or any(p.casefold() == '.git' for p in value.split('/')):
        raise ValueError('Invalid archive candidate name')
    return value


def _path(value):
    path = canonical(value)
    if any(part in ('.', '..') for part in path.parts):
        raise ValueError('Archive candidate requires canonical file paths')
    return path


def _write(path, value):
    with path.open('x') as output:
        json.dump(value, output, indent=2)
        output.write('\n')


class _LocalVerifier:
    """Reuse the full existing member verifier, without issuing a Git claim."""
    def __init__(self, descriptor, check):
        self.descriptor, self.check = descriptor, check

    def verified_archive(self, unused):
        os.lseek(self.descriptor, 0, os.SEEK_SET)
        return os.fdopen(os.dup(self.descriptor), 'rb')


def prepare_candidate(repository_root, manifest, output_directory, *, cap_seconds=170):
    if type(cap_seconds) is not int or not 1 <= cap_seconds <= 170:
        raise ValueError('Invalid archive candidate deadline')
    started = time.monotonic()
    deadline = started + cap_seconds

    def check():
        if time.monotonic() > deadline:
            raise TimeoutError('Archive candidate deadline exceeded')

    root, manifest, output = map(_path, (repository_root, manifest, output_directory))
    if output.is_relative_to(root):
        raise ValueError('Candidate output must be outside the repository and case')
    plan, plan_fact = _metadata(manifest, MAX_PLAN, check)
    if not isinstance(plan, dict) or set(plan) != {'schema', 'base', 'ref', 'index', 'archives'} or plan['schema'] != 'complete-git-archive-candidate-v1':
        raise ValueError('Malformed archive candidate plan')
    digest(plan['base'], 40)
    index_name = _name(plan['index'])
    ref = plan['ref']
    if not isinstance(ref, str) or not re.fullmatch(r'refs/evidence/issue-759/[a-z0-9][a-z0-9._/-]{0,120}', ref):
        raise ValueError('Archive candidate requires a private evidence ref')
    rows = plan['archives']
    if not isinstance(rows, list) or not 1 <= len(rows) <= 64:
        raise ValueError('Invalid archive candidate count')
    names, total = [], 0
    for row in rows:
        if not isinstance(row, dict) or set(row) != {'name', 'source', 'bytes', 'sha256', 'receipt'}:
            raise ValueError('Malformed complete archive source')
        name = _name(row['name'])
        if not isinstance(row['source'], str) or not Path(row['source']).is_absolute() or not isinstance(row['receipt'], dict) or set(row['receipt']) != {'source', 'bytes', 'sha256'} or not isinstance(row['receipt']['source'], str) or not Path(row['receipt']['source']).is_absolute():
            raise ValueError('Archive sources require explicit full file paths')
        size(row['bytes'], MAX_ARCHIVE)
        digest(row['sha256'])
        size(row['receipt']['bytes'], MAX_RECEIPT)
        digest(row['receipt']['sha256'])
        names.append(name)
        total += row['bytes']
    if total > MAX_TOTAL:
        raise ValueError('Archive candidate total source byte bound exceeded')
    all_names = [name.casefold() for name in [index_name, *names]]
    for i, left in enumerate(all_names):
        for right in all_names[i + 1:]:
            if left == right or left.startswith(right + '/') or right.startswith(left + '/'):
                raise ValueError('Archive/index namespace collision')
    parent = _parent(output)
    try:
        os.mkdir(output.name, 0o700, dir_fd=parent)
    finally:
        os.close(parent)
    commands = output / 'commands'
    commands.mkdir()
    sequence = 0
    environment = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
    environment.update(GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1',
                       GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL=os.devnull,
                       GIT_OPTIONAL_LOCKS='0')
    index_path = None

    def git(*args, stdin=None, acceptable=(0,), alternate=False, identity_lookup=False):
        nonlocal sequence
        check()
        number = sequence
        sequence += 1
        argv = ['git', '-c', 'gc.auto=0', '-c', 'maintenance.auto=false',
                '-c', 'core.hooksPath=/dev/null', *args]
        env = dict(environment)
        if identity_lookup:
            # Read the repository's real configured identity, including its
            # normal user/system configuration. Never copy an old commit's author.
            env.pop('GIT_CONFIG_GLOBAL', None)
            env.pop('GIT_CONFIG_NOSYSTEM', None)
        if alternate:
            env['GIT_INDEX_FILE'] = str(index_path)
        _write(commands / (str(number) + '.command.json'), {'argv': argv, 'alternateIndex': alternate})
        try:
            result = subprocess.run(argv, cwd=root, env=env, stdin=stdin,
                                    capture_output=True, timeout=min(30, max(.01, deadline - time.monotonic())))
        except subprocess.TimeoutExpired as error:
            (commands / (str(number) + '.stdout.raw.log')).write_bytes(error.stdout or b'')
            (commands / (str(number) + '.stderr.raw.log')).write_bytes(error.stderr or b'')
            raise
        (commands / (str(number) + '.stdout.raw.log')).write_bytes(result.stdout)
        (commands / (str(number) + '.stderr.raw.log')).write_bytes(result.stderr)
        if result.returncode not in acceptable:
            raise ValueError('Archive candidate Git command failed: ' + repr(args))
        return result

    if Path(git('rev-parse', '--show-toplevel').stdout.decode().strip()).resolve() != root:
        raise ValueError('Foreign archive candidate repository')
    git('check-ref-format', ref)
    if git('show-ref', '--verify', '--quiet', ref, acceptable=(0, 1)).returncode == 0:
        raise ValueError('Archive candidate ref already exists')
    if git('rev-parse', 'HEAD').stdout.decode().strip() != plan['base'] or git('status', '--porcelain').stdout:
        raise ValueError('Archive candidate requires the exact clean source HEAD')
    current_index = Path(git('rev-parse', '--git-path', 'index').stdout.decode().strip())
    current_index = canonical(current_index if current_index.is_absolute() else root / current_index)
    # The repository index is metadata, but never trust an unbounded/linked file.
    def index_fact():
        parent = descriptor = None
        try:
            parent = _parent(current_index)
            descriptor = os.open(current_index.name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=parent)
            state = _identity(descriptor)
            if state['st_size'] > MAX_RECEIPT:
                raise ValueError('Repository index exceeds candidate metadata bound')
            h, count = hashlib.sha256(), 0
            while data := os.read(descriptor, 1048576):
                check()
                count += len(data)
                if count > MAX_RECEIPT:
                    raise ValueError('Repository index exceeds candidate metadata bound')
                h.update(data)
            if _identity(descriptor) != state or _named_identity(current_index) != state:
                raise ValueError('Repository index changed during read')
            return {'identity': state, 'sha256': h.hexdigest()}
        finally:
            for fd in (descriptor, parent):
                if fd is not None:
                    os.close(fd)
    before_index = index_fact()
    configured_identity = {}
    for role in ('AUTHOR', 'COMMITTER'):
        observed = git('var', 'GIT_' + role + '_IDENT', identity_lookup=True).stdout.decode().strip()
        match = re.fullmatch(r'([^\r\n<>]+) <([^\r\n<>]+)> ([0-9]+) ([+-][0-9]{4})', observed)
        if not match:
            raise ValueError('Missing or invalid configured Git identity')
        configured_identity[role.lower()] = observed
        environment['GIT_' + role + '_NAME'] = match[1]
        environment['GIT_' + role + '_EMAIL'] = match[2]
        # Dates remain the actual commit-time defaults; no inherited fake date.
    index_git_path = PREFIX + index_name
    entry = git('ls-tree', plan['base'], '--', index_git_path).stdout.decode().strip().split('\t')
    if len(entry) != 2 or entry[1] != index_git_path or not entry[0].startswith('100644 blob '):
        raise ValueError('Missing regular source packet index')
    old_blob = entry[0].split()[2]
    if int(git('cat-file', '-s', old_blob).stdout) > MAX_PLAN:
        raise ValueError('Existing packet index exceeds bound')
    old_bytes = git('cat-file', 'blob', old_blob).stdout
    previous = json.loads(old_bytes, object_pairs_hook=pairs,
                          parse_constant=lambda value: (_ for _ in ()).throw(ValueError('Nonfinite packet index')))
    if not isinstance(previous, dict) or set(previous) != {'schema', 'archives'} or previous['schema'] != 'complete-packet-git-index-v1' or not isinstance(previous['archives'], dict):
        raise ValueError('Malformed source packet index')
    if not 1 <= len(previous['archives']) <= 64 or len(previous['archives']) + len(rows) > 64:
        raise ValueError('Combined packet index exceeds bound')
    tracked = git('ls-tree', '-r', '--name-only', '-z', plan['base'], '--', PREFIX).stdout
    if len(tracked) > MAX_RECEIPT:
        raise ValueError('Tracked case namespace exceeds metadata bound')
    tracked = [path.decode().casefold() for path in tracked.split(b'\0') if path]
    if len(tracked) > 32768:
        raise ValueError('Tracked case namespace exceeds path bound')
    for name in names:
        target = (PREFIX + name).casefold()
        if any(target == path or target.startswith(path + '/') or path.startswith(target + '/') for path in tracked):
            raise ValueError('Tracked archive namespace collision')
    for name, witness in previous['archives'].items():
        _name(name)
        if any(name.casefold() == new.casefold() or name.casefold().startswith(new.casefold() + '/') or new.casefold().startswith(name.casefold() + '/') for new in names):
            raise ValueError('Existing archive namespace collision')
        if not isinstance(witness, dict) or set(witness) != {'bytes', 'sha256', 'git'} or not isinstance(witness['git'], dict) or set(witness['git']) != {'commit', 'path', 'blob'}:
            raise ValueError('Malformed existing archive witness')
        size(witness['bytes'], MAX_ARCHIVE)
        digest(witness['sha256'])
        digest(witness['git']['commit'], 40)
        digest(witness['git']['blob'], 40)
        if witness['git']['path'] != PREFIX + name:
            raise ValueError('Foreign existing archive witness')
        git('merge-base', '--is-ancestor', witness['git']['commit'], plan['base'])
        old_entry = git('ls-tree', witness['git']['commit'], '--', witness['git']['path']).stdout.decode().strip()
        if old_entry not in [mode + ' blob ' + witness['git']['blob'] + '\t' + witness['git']['path'] for mode in ['100644', '100755']] or int(git('cat-file', '-s', witness['git']['blob']).stdout) != witness['bytes']:
            raise ValueError('Changed existing archive Git witness')
    for name in names:
        if git('ls-tree', plan['base'], '--', PREFIX + name).stdout:
            raise ValueError('Candidate archive path is already tracked')
        target = root / PREFIX / name
        if any(path.is_symlink() for path in [target, *target.parents]):
            raise ValueError('Linked candidate archive path refused')
        if target.exists():
            raise ValueError('Candidate archive physical path already exists')

    source_fds, source_parents, source_facts = [], [], []
    try:
        temporary = tempfile.NamedTemporaryFile(prefix='archive-candidate-index-', dir=output, delete=False)
        index_path = Path(temporary.name)
        temporary.close()
        index_path.unlink()  # Git requires a nonexistent alternate index initially.
        git('read-tree', plan['base'], alternate=True)
        for row in rows:
            source = _path(row['source'])
            parent = _parent(source)
            source_parents.append(parent)
            fd = os.open(source.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
            source_fds.append(fd)
            state = _identity(fd)
            if state['st_size'] != row['bytes'] or _named_identity(source) != state:
                raise ValueError('Source archive identity/length mismatch')
            receipt, receipt_fact = _metadata(_path(row['receipt']['source']), MAX_RECEIPT, check)
            if any(receipt_fact[key] != row['receipt'][key] for key in ('bytes', 'sha256')) or not isinstance(receipt, dict) or receipt.get('schema') != 'complete-evidence-packet-v1' or receipt.get('archiveBytes') != row['bytes'] or receipt.get('archiveSha256') != row['sha256']:
                raise ValueError('Complete source receipt/archive mismatch')
            size(receipt.get('completeMembers'), 8192)
            size(receipt.get('completeOriginalBytes'), MAX_TOTAL)
            local = PacketStore.verify_members(_LocalVerifier(fd, check), row['name'], receipt.get('members'))
            if local['completeMembers'] != receipt.get('completeMembers') or local['completeOriginalBytes'] != receipt.get('completeOriginalBytes'):
                raise ValueError('Complete source member totals mismatch')
            os.lseek(fd, 0, os.SEEK_SET)
            blob = git('hash-object', '-w', '--stdin', stdin=fd).stdout.decode().strip()
            digest(blob, 40)
            os.lseek(fd, 0, os.SEEK_SET)
            number = sequence
            sequence += 1
            readback_argv = ['git', '-c', 'gc.auto=0', '-c', 'maintenance.auto=false', 'cat-file', 'blob', blob]
            _write(commands / (str(number) + '.command.json'), {'argv': readback_argv, 'stdoutStorage': 'Full blob retained in Git and compared with every original source byte; no second loose spool'})
            stderr = (commands / (str(number) + '.stderr.raw.log')).open('xb')
            child = None
            total, h, source_hash, equal = 0, hashlib.sha256(), hashlib.sha256(), True
            try:
                child = subprocess.Popen(readback_argv, cwd=root, env=environment, stdout=subprocess.PIPE, stderr=stderr)
                pipe = child.stdout.fileno()
                os.set_blocking(pipe, False)
                while True:
                    check()
                    ready, _, _ = select.select([pipe], [], [], min(1, max(0, deadline - time.monotonic())))
                    if not ready:
                        continue
                    try:
                        data = os.read(pipe, 1048576)
                    except BlockingIOError:
                        continue
                    if not data:
                        break
                    original = bytearray()
                    while len(original) < len(data):
                        check()
                        piece = os.read(fd, len(data) - len(original))
                        if not piece:
                            break
                        original.extend(piece)
                    equal = (bytes(original) == data) and equal
                    total += len(data)
                    if total > row['bytes']:
                        raise ValueError('Git blob exceeds complete source witness')
                    h.update(data)
                    source_hash.update(original)
                if child.wait(timeout=min(5, max(.01, deadline - time.monotonic()))) or os.read(fd, 1) or total != row['bytes'] or not equal or h.hexdigest() != row['sha256'] or source_hash.hexdigest() != row['sha256']:
                    raise ValueError('Full Git blob differs from original archive bytes')
            finally:
                if child is not None:
                    child.stdout.close()
                    if child.poll() is None:
                        child.kill()
                        child.wait(timeout=5)
                stderr.close()
            if _identity(fd) != state or _named_identity(source) != state:
                raise ValueError('Source archive changed during candidate preparation')
            source_facts.append({'name': row['name'], 'source': str(source), 'bytes': total,
                                 'sha256': h.hexdigest(), 'blob': blob, 'identity': state,
                                 'everySourceAndGitByteCompared': True,
                                 'fullMemberVerification': local, 'receipt': receipt_fact})
            git('update-index', '--add', '--cacheinfo', '100644,' + blob + ',' + PREFIX + row['name'], alternate=True)
        tree_d = git('write-tree', alternate=True).stdout.decode().strip()
        commit_d = git('commit-tree', tree_d, '-p', plan['base'], '-m', 'Retain complete original evidence archive bytes in Git').stdout.decode().strip()
        merged = {'schema': previous['schema'], 'archives': dict(previous['archives'])}
        for row in source_facts:
            merged['archives'][row['name']] = {'bytes': row['bytes'], 'sha256': row['sha256'],
                                             'git': {'commit': commit_d, 'path': PREFIX + row['name'], 'blob': row['blob']}}
            git('update-index', '--force-remove', '--', PREFIX + row['name'], alternate=True)
        candidate_index = output / 'candidate-packet-git-index.json'
        _write(candidate_index, merged)
        if candidate_index.stat().st_size > MAX_PLAN:
            raise ValueError('Candidate packet index exceeds bound')
        with candidate_index.open('rb') as source:
            index_blob = git('hash-object', '-w', '--stdin', stdin=source).stdout.decode().strip()
        git('update-index', '--cacheinfo', '100644,' + index_blob + ',' + index_git_path, alternate=True)
        tree_i = git('write-tree', alternate=True).stdout.decode().strip()
        commit_i = git('commit-tree', tree_i, '-p', commit_d, '-m', 'Reference retained full archives without checking out their physical copies').stdout.decode().strip()
        changed = git('diff-tree', '--no-commit-id', '--name-only', '-r', plan['base'], commit_i).stdout.decode().splitlines()
        if changed != [index_git_path]:
            raise ValueError('Candidate substitutes project tree paths')
        if git('rev-parse', 'HEAD').stdout.decode().strip() != plan['base'] or index_fact() != before_index or git('status', '--porcelain').stdout:
            raise ValueError('Source checkout/index changed during candidate preparation')
        if _metadata(manifest, MAX_PLAN, check)[1] != plan_fact:
            raise ValueError('Archive candidate plan changed during preparation')
        for fd, row in zip(source_fds, source_facts):
            if _identity(fd) != row['identity'] or _named_identity(Path(row['source'])) != row['identity'] or _metadata(Path(row['receipt']['path']), MAX_RECEIPT, check)[1] != row['receipt']:
                raise ValueError('Candidate source/receipt changed before publication of private ref')
        commit_metadata = git('show', '-s', '--format=%H %T %P %aI %cI', commit_d, commit_i).stdout.decode()
        git('update-ref', ref, commit_i, '0' * 40)  # Atomic fresh ref; never replace one.
        result = {'schema': 'complete-git-archive-candidate-receipt-v1',
                  'base': plan['base'], 'archiveCommit': commit_d, 'candidateCommit': commit_i,
                  'archiveTree': tree_d, 'candidateTree': tree_i, 'privateRef': ref,
                  'actualCommitMetadata': commit_metadata,
                  'configuredIdentityObservations': configured_identity,
                  'candidateIndex': str(candidate_index), 'sourceArchives': source_facts,
                  'sourceHeadAndIndexUnchanged': True, 'caseWrites': False,
                  'projectTreeChanges': changed, 'adopted': False, 'retired': False,
                  'fullContinuityAndFitPending': True, 'runtimeParity': False,
                  'elapsedSeconds': time.monotonic() - started}
        _write(output / 'candidate-receipt.json', result)
        return result
    finally:
        for descriptor in source_fds + source_parents:
            os.close(descriptor)
        if index_path is not None and index_path.exists():
            index_path.unlink()  # Only this private temporary index, never the repository index.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repository-root', required=True)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--output-directory', required=True)
    parser.add_argument('--cap-seconds', type=int, default=170)
    print(json.dumps(prepare_candidate(**vars(parser.parse_args()))))


if __name__ == '__main__':
    main()
