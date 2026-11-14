"""Finite byte, metadata, active-descriptor and mapping page-advice controls."""
import hashlib
import importlib.util
import json
import mmap
from pathlib import Path
import tempfile

root = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('advice', Path(__file__).with_name('completed-fingerprint-pages.py'))
advice = importlib.util.module_from_spec(spec)
spec.loader.exec_module(advice)
with tempfile.TemporaryDirectory(prefix='page-advice-control-', dir=root / 'experiments/issue-784') as temporary:
    directory = Path(temporary)
    source = directory / 'whole.bin'
    source.write_bytes(bytes(range(256)) * 32)
    before = source.stat()
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    name = str(source.relative_to(root))
    with source.open('rb') as opened:
        active = advice.advise_completed(root, [name])
        assert not active['selected'] and active['skipped'][0]['path'] == name
        with mmap.mmap(opened.fileno(), 0, access=mmap.ACCESS_READ):
            mapped = advice.advise_completed(root, [name])
            assert not mapped['selected'] and mapped['skipped'][0]['path'] == name
    closed = advice.advise_completed(root, [name])
    assert closed['selected'] == [{'path': name, 'bytes': 8192}]
    link = directory / 'linked.bin'
    link.symlink_to(source)
    linked = advice.advise_completed(root, [str(link.relative_to(root))])
    assert not linked['selected']
    absent = advice.advise_completed(root, [str((directory / 'absent').relative_to(root))])
    assert not absent['selected'] and absent['skipped'][0]['reason'] == 'absent'
    after = source.stat()
    for key in ['st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_nlink', 'st_size', 'st_mtime_ns', 'st_ctime_ns']:
        assert getattr(before, key) == getattr(after, key)
    assert hashlib.sha256(source.read_bytes()).hexdigest() == digest
    print(json.dumps({'passed': True, 'controls': 5, 'bytes': 8192, 'sha256': digest,
        'completeSourceUnchanged': True, 'originalCaseClocksPaused': False,
        'completeGateQualified': False}))
