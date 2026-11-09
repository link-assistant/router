"""Read every retained before/after proposal byte and rejoin installed outputs."""
import hashlib
import json
import lzma
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
before = json.loads((base / 'current-loader-history-before-reclaimed-summary.json').read_bytes())
after = json.loads((base / 'current-loader-history-after-summary.json').read_bytes())
assert len(before['rows']) == len(after['rows']) == 13
records = []
for left, right in zip(before['rows'], after['rows']):
    assert left['path'] == right['path']
    names = [Path(row['output']).with_suffix('.xz') for row in [left, right]]
    digests = [hashlib.sha256(), hashlib.sha256()]
    sizes = [0, 0]
    with lzma.open(names[0], 'rb') as old, lzma.open(names[1], 'rb') as new:
        while True:
            a, z = old.read(65536), new.read(65536)
            assert a == z
            if not a:
                break
            for index, raw in enumerate([a, z]):
                sizes[index] += len(raw)
                assert sizes[index] < 64 * 1024 * 1024
                digests[index].update(raw)
    for index, entry in enumerate([left, right]):
        assert sizes[index] == entry['bytes']
        assert digests[index].hexdigest() == entry['sha256']
        assert entry['currentEqualsAfter']
        assert hashlib.sha256(Path(entry['path']).read_bytes()).hexdigest() == entry['afterSha256']
    records.append(dict(path=left['path'], decodedBytes=sizes[0], sha256=digests[0].hexdigest(),
                        retainedBefore=str(names[0]), retainedAfter=str(names[1]),
                        allDecodedBytesEqual=True, installedAfterRechecked=True))
result = dict(schema='complete-loader-history-plan-comparison-v1', rows=records,
              allThirteenCompleteRowsEqual=True, sourceHistoriesRemoved=False,
              guardsOrLimitsWeakened=False, performanceQualified=False, ciChecksFixed=False)
with (base / 'current-loader-history-comparison.json').open('x') as output:
    json.dump(result, output, indent=2)
print(json.dumps({key: value for key, value in result.items() if key != 'rows'}))
