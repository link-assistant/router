"""Read a bounded line span from a retained complete original CI artifact."""
import argparse
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('member')
parser.add_argument('start', type=int)
parser.add_argument('end', type=int)
args = parser.parse_args()
assert 1 <= args.start <= args.end and args.end - args.start < 1500
base = Path(__file__).resolve().parents[2] / 'ci-logs/issue-784-checkpoint-b63dd5a33'
matches = []
for path in sorted(base.glob('artifact-*.zip')):
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            if name.endswith(args.member):
                matches.append((path, name))
assert len(matches) == 1, matches
path, name = matches[0]
with zipfile.ZipFile(path) as archive:
    info = archive.getinfo(name)
    assert info.file_size < 32 * 1024 * 1024
    lines = archive.read(name).decode('utf8').splitlines()
print(f'{path.name}:{name}: {len(lines)} complete lines')
for index in range(args.start - 1, min(args.end, len(lines))):
    print(f'{index + 1}: {lines[index]}')
