"""Task-only closed-file page advice following real gate fingerprint progress."""
import argparse
import gzip
import json
import os
from pathlib import Path
import stat
import subprocess
import time


def active_paths(root):
    active, unreadable = set(), []
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            if any(line.startswith('State:\tZ') for line in (process / 'status').read_text().splitlines()):
                continue
            for line in (process / 'maps').read_text().splitlines():
                fields = line.split(None, 5)
                if len(fields) == 6 and fields[5].startswith(str(root) + '/'):
                    active.add(fields[5])
            for descriptor in (process / 'fd').iterdir():
                try:
                    active.add(os.readlink(descriptor))
                except (FileNotFoundError, ProcessLookupError):
                    pass
        except PermissionError:
            if process.stat().st_uid == os.getuid():
                raise
            unreadable.append(int(process.name))
        except (FileNotFoundError, ProcessLookupError):
            pass
    return active, unreadable


def advise_completed(root, names):
    active, unreadable = active_paths(root)
    selected, skipped = [], []
    for name in names:
        path = root / name
        if path.is_absolute() and not path.is_relative_to(root):
            raise ValueError('Source path escapes worktree')
        try:
            before = path.lstat()
        except FileNotFoundError:
            skipped.append({'path': name, 'reason': 'absent'})
            continue
        if (not stat.S_ISREG(before.st_mode) or before.st_uid != os.getuid()
                or before.st_nlink != 1 or not path.resolve().is_relative_to(root)
                or str(path) in active):
            skipped.append({'path': name, 'reason': 'ineligible or observed active'})
            continue
        descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
        try:
            opened = os.fstat(descriptor)
            identity = lambda value: (value.st_dev, value.st_ino, value.st_mode,
                value.st_uid, value.st_nlink, value.st_size, value.st_mtime_ns, value.st_ctime_ns)
            if identity(before) != identity(opened):
                raise RuntimeError('Source identity changed before advice')
            os.posix_fadvise(descriptor, 0, 0, os.POSIX_FADV_DONTNEED)
            if identity(opened) != identity(os.fstat(descriptor)) or identity(opened) != identity(path.lstat()):
                raise RuntimeError('Source identity changed during advice')
            selected.append({'path': name, 'bytes': opened.st_size})
        finally:
            os.close(descriptor)
    return {'selected': selected, 'skipped': skipped, 'foreignUnreadableProcesses': unreadable}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--log', type=Path, required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    parser.add_argument('--owner-pid', type=int, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    base = root / 'ci-logs/issue-784-restart-2'
    if any(path.resolve().parent != base for path in [args.log, args.receipt]) or args.receipt.exists():
        raise ValueError('Fresh task-local log and receipt required')
    names = sorted(set(subprocess.check_output(
        ['git', 'ls-files', '-co', '--exclude-standard', '-z'], cwd=root).decode().split('\0')) - {''})
    if not 1 <= len(names) <= 100000:
        raise ValueError('Bounded complete input list required')
    positions = {name: at for at, name in enumerate(names)}
    cursor, records, pending, complete, started = 0, [], '', False, time.monotonic()
    with args.log.open() as source:
        while not complete:
            block = source.read(65536)
            if not block:
                if not Path('/proc/' + str(args.owner_pid)).exists():
                    break
                time.sleep(0.02)
                continue
            pending += block
            if len(pending) > 1048576:
                raise ValueError('Bounded progress line required')
            lines = pending.split('\n')
            pending = lines.pop()
            for line in lines:
                if not line.startswith('{"event":"javascript-gate-fingerprint",'):
                    continue
                event = json.loads(line)
                if event['totalFiles'] != len(names):
                    raise ValueError('Complete input list changed before observation')
                if event['state'] == 'complete':
                    end, complete = len(names), True
                elif event['state'] == 'advance':
                    end = positions[event['relative']] + 1
                else:
                    continue
                if end < cursor:
                    raise ValueError('Fingerprint progress moved backwards')
                result = advise_completed(root, names[cursor:end])
                records.append({'event': event, 'first': cursor, 'end': end, **result})
                cursor = end
                if complete:
                    break
    record = {'schema': 'completed-fingerprint-page-advice-v1', 'complete': complete,
        'elapsedSeconds': time.monotonic() - started, 'completedInputPrefix': cursor,
        'totalInputs': len(names), 'records': records, 'sourceContentsChanged': False,
        'testClocksPaused': False, 'guardChanged': False,
        'scope': 'Closed single-link owned regular worktree files after real completed fingerprint progress; page advice only. No Git objects, deletion or global cache action.'}
    with gzip.open(args.receipt, 'xt') as output:
        json.dump(record, output)
    with gzip.open(args.receipt, 'rt') as source:
        assert json.load(source) == record
    print(json.dumps({key: value for key, value in record.items() if key != 'records'}))


if __name__ == '__main__':
    main()
