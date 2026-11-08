"""Retire only exact inactive raw members of committed complete packets."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

root = Path.cwd()
assert sys.argv[1:] in ([], ['--paired-project'], ['--closed-receiving'], ['--class-birth'], ['--module-freeze'], ['--alias-reader'], ['--descriptor-kind'], ['--ascii-selection'], ['--fixture-paths'], ['--static-refresh'], ['--proof-graph'])
paired = sys.argv[1:] == ['--paired-project']
receiving = sys.argv[1:] == ['--closed-receiving']
class_birth = sys.argv[1:] == ['--class-birth']
module_freeze = sys.argv[1:] == ['--module-freeze']
alias_reader = sys.argv[1:] == ['--alias-reader']
descriptor_kind = sys.argv[1:] == ['--descriptor-kind']
ascii_selection = sys.argv[1:] == ['--ascii-selection']
fixture_paths = sys.argv[1:] == ['--fixture-paths']
static_refresh = sys.argv[1:] == ['--static-refresh']
proof_graph = sys.argv[1:] == ['--proof-graph']
label = 'current-proof-graph' if proof_graph else 'current-static-refresh' if static_refresh else 'current-receiving-fixture-paths' if fixture_paths else 'current-static-fixture' if ascii_selection else 'current-ascii-selection' if descriptor_kind else 'current-descriptor-kind' if alias_reader else 'current-owned-freeze' if module_freeze else 'current-alias-reader' if class_birth else 'current-class-birth-receiving' if receiving else 'current-class-birth' if paired else 'current-paired-project'
receipt = Path('ci-logs/issue-784-restart-2/' + label + '-duplicate-retirement.json')
assert not receipt.exists()
selected, archives = {}, []
packets = [('current-paired-project', 'c368316d2d56e9d81a58438d2a2fc2c8d3093757'),
           ('current-paired-project-typescript', 'c368316d2d56e9d81a58438d2a2fc2c8d3093757')] if paired else [
                    ('current-native-cli-imports', '262a338c522bcadce2955acdc2ed93bc7e90b752'),
                     ('current-native-retention-history', 'cbe928e11'),
                     ('current-receiving-performance', 'a7bcf9526b0835f634b900e91fc30fc9c8301581')]
if receiving:
    packets = [(name, 'c368316d2d56e9d81a58438d2a2fc2c8d3093757') for name in [
        'current-ascii-history-and-static-refresh', 'current-ci-custody',
        'current-historical-native-receiving', 'current-host-unicode-history-receiving',
        'current-negative-budget-history-receiving', 'current-proof-cost-history-receiving']]
if class_birth:
    packets = [('current-class-birth-entry', '95460607f9b286e0df754a1088295745b02c82ee')]
if module_freeze:
    packets = [('current-module-item-freezing', '68c598bc2')]
if alias_reader:
    packets = [('current-alias-reader', 'bbe46cfaf42ee688b3ea40936cb91421a55c4d2d')]
if descriptor_kind:
    packets = [('current-descriptor-kind-receiving', '54259b027')]
if ascii_selection:
    packets = [('current-ascii-selection-checks', 'f2b67cb79')]
if fixture_paths:
    packets = [('current-receiving-fixture-paths', '858ca2d47')]
if static_refresh:
    packets = [('current-static-fixture-refresh-checks', '9f27bfe67')]
if proof_graph:
    packets = [('current-proof-consumer-graph', '66aec03d0')]
for name, commit in packets:
    path = Path('docs/case-studies/issue-784/evidence') / (name + '.json.gz')
    packed = path.read_bytes()
    assert packed == subprocess.check_output(['git', 'show', commit + ':' + str(path)])
    archives.append({'path': str(path), 'commit': commit, 'bytes': len(packed),
                     'sha256': hashlib.sha256(packed).hexdigest()})
    seen = set()
    for member in json.loads(gzip.decompress(packed))['members']:
        if 'base64' in member:
            raw = base64.b64decode(member['base64'], validate=True)
        else:
            assert member['encoding'] == 'base64'
            raw = base64.b64decode(member['content'], validate=True)
        assert len(raw) == member['bytes'] and hashlib.sha256(raw).hexdigest() == member['sha256']
        name = member['path']
        assert name not in seen
        seen.add(name)
        if not name.startswith(('ci-logs/issue-784-restart-2/', 'js/node_modules/.node-case-deadlines/')):
            continue
        if receiving and not Path(name).exists():
            continue
        assert name not in selected
        selected[name] = (member, raw, str(path))
        if name.endswith('.memory.json'):
            check = json.loads(raw)
            assert not Path('/proc/' + str(check['pid'])).exists()
            assert all(not Path('/proc/' + str(pid)).exists() for pid in check['stoppedOwnedProcessIds'])
        if name.endswith('/terminal.json'):
            check = json.loads(raw)
            assert check['childClosed'] and check['groupCleanup']['complete']
            assert not Path('/proc/' + str(check['groupCleanup']['group'])).exists()
assert len(selected) == (22 if proof_graph else 19 if static_refresh else 12 if fixture_paths else 27 if ascii_selection else 13 if descriptor_kind else 17 if alias_reader else 96 if module_freeze else 34 if class_birth else 86 if receiving else 51 if paired else 221)
assert sum(row[0]['bytes'] for row in selected.values()) == (198818 if proof_graph else 74566 if static_refresh else 376505 if fixture_paths else 121643 if ascii_selection else 134866 if descriptor_kind else 129057 if alias_reader else 823544 if module_freeze else 407953 if class_birth else 2820967 if receiving else 399624 if paired else 1686719)


def identity(state):
    return [state.st_dev, state.st_ino, state.st_mode, state.st_uid, state.st_nlink,
            state.st_size, state.st_mtime_ns, state.st_ctime_ns]


def inactive():
    absolute = {str(root / path) for path in selected}
    for process in Path('/proc').iterdir():
        if not process.name.isdecimal():
            continue
        try:
            for fd in (process / 'fd').iterdir():
                try:
                    assert os.readlink(fd) not in absolute
                except (FileNotFoundError, ProcessLookupError):
                    pass
            for line in (process / 'maps').read_text().splitlines():
                fields = line.split(None, 5)
                assert len(fields) < 6 or fields[5] not in absolute
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass


inactive()
rows = []
for name, (member, raw, archive) in selected.items():
    path = Path(name)
    assert path.resolve() == root / name
    state = path.lstat()
    assert stat.S_ISREG(state.st_mode) and state.st_uid == os.getuid() and state.st_nlink == 1
    assert path.read_bytes() == raw
    rows.append({'path': name, 'archive': archive, 'bytes': len(raw), 'sha256': member['sha256'],
                 'identity': identity(state), 'allocatedBytes': state.st_blocks * 512})
record = {'schema': 'recent-complete-raw-duplicate-retirement-v1', 'archives': archives,
          'rows': rows, 'completeOriginalsRetained': True,
          'logicalBytesReclaimed': sum(row['bytes'] for row in rows),
          'allocatedBytesReclaimed': sum(row['allocatedBytes'] for row in rows),
          'filesystemFreeBeforeBytes': os.statvfs(root).f_bavail * os.statvfs(root).f_frsize}
with receipt.open('x') as output:
    json.dump(record, output)
inactive()
for archive in archives:
    assert hashlib.sha256(Path(archive['path']).read_bytes()).hexdigest() == archive['sha256']
for row in rows:
    path = Path(row['path'])
    assert identity(path.lstat()) == row['identity'] and path.read_bytes() == selected[row['path']][1]
    path.unlink()
print(json.dumps({'schema': record['schema'], 'completeRawMembersRetired': len(rows),
                  'logicalBytesReclaimed': record['logicalBytesReclaimed'],
                  'allocatedBytesReclaimed': record['allocatedBytesReclaimed'],
                  'filesystemFreeAfterBytes': os.statvfs(root).f_bavail * os.statvfs(root).f_frsize,
                  'completeOriginalsRetained': True}))
