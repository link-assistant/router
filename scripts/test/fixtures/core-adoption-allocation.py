"""Independent filesystem observations for the complete allocation scanner."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import stat
import tempfile
from unittest.mock import patch


def load(path):
    spec = importlib.util.spec_from_file_location('allocation_controller', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def expected(root):
    pending = [root]
    result = dict(entriesAttempted=0, logicalBytes=0, observedBytes=0)
    while pending:
        path = pending.pop()
        observed = path.lstat()
        result['entriesAttempted'] += 1
        result['logicalBytes'] += observed.st_size
        result['observedBytes'] += max(observed.st_size, observed.st_blocks * 512)
        if stat.S_ISDIR(observed.st_mode):
            pending.extend(path.iterdir())
    return result


def check(module, parent):
    root = parent / 'scan'
    root.mkdir()
    (root / 'nested').mkdir()
    (root / 'nested' / 'payload').write_bytes(b'fresh complete bytes')
    (root / 'empty').write_bytes(b'')
    with (root / 'sparse').open('wb') as stream:
        stream.truncate(24 * 1024 * 1024)
    outside = parent / 'outside'
    outside.mkdir()
    (outside / 'hidden').write_bytes(b'never follow directory links')
    (root / 'link').symlink_to(outside, target_is_directory=True)
    (root / 'dangling').symlink_to(parent / 'missing')
    actual_stat, actual_lstat = os.stat, os.lstat
    visits = []

    def record_stat(path, *args, **kwargs):
        assert kwargs.get('follow_symlinks') is False
        visits.append(os.path.normpath(os.fspath(path)))
        return actual_stat(path, *args, **kwargs)

    def record_lstat(path, *args, **kwargs):
        visits.append(os.path.normpath(os.fspath(path)))
        return actual_lstat(path, *args, **kwargs)

    wanted = expected(root)
    with patch('os.stat', record_stat), patch('os.lstat', record_lstat):
        assert module.allocation(root) == wanted
    assert len(visits) == wanted['entriesAttempted'] + 1
    assert visits.count(str(root)) == 2
    assert len(set(visits)) == wanted['entriesAttempted']
    assert not any(path.startswith(str(outside)) for path in visits)
    assert wanted['logicalBytes'] >= 24 * 1024 * 1024

    (root / 'nested' / 'payload').write_bytes(b'a longer independent replacement')
    assert module.allocation(root) == expected(root)
    (root / 'new').write_bytes(b'new complete census input')
    assert module.allocation(root) == expected(root)
    (root / 'new').unlink()
    assert module.allocation(root) == expected(root)

    vanished = root / 'nested' / 'payload'
    before_vanish = expected(root)
    vanished_state = vanished.lstat()

    def missing_stat(path, *args, **kwargs):
        if os.path.normpath(os.fspath(path)) == str(vanished):
            raise FileNotFoundError(str(vanished))
        return actual_stat(path, *args, **kwargs)

    def missing_lstat(path, *args, **kwargs):
        if os.path.normpath(os.fspath(path)) == str(vanished):
            raise FileNotFoundError(str(vanished))
        return actual_lstat(path, *args, **kwargs)

    with patch('os.stat', missing_stat), patch('os.lstat', missing_lstat):
        assert module.allocation(root) == dict(
            entriesAttempted=before_vanish['entriesAttempted'],
            logicalBytes=before_vanish['logicalBytes'] - vanished_state.st_size,
            observedBytes=before_vanish['observedBytes'] - max(
                vanished_state.st_size, vanished_state.st_blocks * 512))

    module.ENTRY_LIMIT = wanted['entriesAttempted'] - 1
    try:
        module.allocation(root)
    except RuntimeError as error:
        assert str(error) == 'observed evidence entry bound'
    else:
        raise AssertionError('original entry bound must fail')
    module.ENTRY_LIMIT = 30000

    os.mkfifo(root / 'special')
    try:
        module.allocation(root)
    except RuntimeError as error:
        assert str(error) == 'special evidence node'
    else:
        raise AssertionError('special evidence node must fail')
    (root / 'special').unlink()

    try:
        module.allocation(parent / 'missing')
    except FileNotFoundError:
        pass
    else:
        raise AssertionError('missing root must fail')
    return dict(completeScan=wanted, freshStatObservations=len(visits),
                mutableFilesReobserved=True, directoryLinksNeverFollowed=True,
                sparseLogicalSizeCounted=True, entryBoundRetained=True,
                specialNodeRefused=True, missingRootRefused=True,
                disappearingChildStillCounted=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('controller', type=Path)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='router-allocation-control-') as directory:
        result = check(load(args.controller), Path(directory))
    print(json.dumps(result))
