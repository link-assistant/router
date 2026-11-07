"""Describe complete allocation samples without treating estimates as RSS."""
from collections import Counter
import gzip
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
directory = root / 'ci-logs/issue-784-restart-2/owned-allocation-samples'
result_path = directory / 'result.json'
observer = json.loads((directory.parent / 'owned-allocation-memory.json').read_text())
if result_path.is_file():
    result = json.loads(result_path.read_text())
    sample_receipts = result['samples']
else:
    # A cgroup guard can terminate the parent before its child-exit callback.
    # Preserve that absence rather than synthesizing a terminal child result.
    sample_receipts = []
    for line in (directory.parent / 'owned-allocation.log').read_text().splitlines():
        if line.startswith('{'):
            record = json.loads(line)
            if 'allocationSample' in record:
                sample_receipts.append(record['allocationSample'])
    result = None
if {path.name for path in directory.glob('*.json.gz')} != {
        sample['name'] for sample in sample_receipts}:
    raise RuntimeError('Complete sample files and logged receipts disagree')
rows = []
for sample in sample_receipts:
    path = directory / sample['name']
    if path.parent != directory or path.is_symlink() or not path.is_file():
        raise RuntimeError('Expected complete regular allocation sample')
    with gzip.open(path, 'rb') as source:
        raw = source.read(32 * 1024 * 1024 + 1)
        if len(raw) > 32 * 1024 * 1024 or source.read(1):
            raise RuntimeError('Complete allocation profile exceeds its bound')
    if len(raw) != sample['bytes']:
        raise RuntimeError('Complete allocation profile length changed')
    profile = json.loads(raw)
    totals, sites, stacks = Counter(), Counter(), Counter()
    pending = [(profile['head'], ())]
    while pending:
        node, parents = pending.pop()
        frame = node['callFrame']
        site = (frame['url'], frame['functionName'], frame['lineNumber'] + 1)
        stack = (*parents, site)
        size = node['selfSize']
        totals['sampledLiveBytes'] += size
        sites[site] += size
        stacks[stack] += size
        pending.extend((child, stack) for child in node['children'])
    if totals['sampledLiveBytes'] != sample['sampledLiveBytes']:
        raise RuntimeError('Complete sample traversal disagrees with its receipt')

    def describe(site):
        return dict(zip(['url', 'functionName', 'lineNumber'], site))

    rows.append({
        'name': sample['name'],
        'elapsedMilliseconds': sample['elapsedMilliseconds'],
        'sampledLiveBytes': totals['sampledLiveBytes'],
        'largestSites': [{**describe(site), 'sampledBytes': size}
                         for site, size in sites.most_common(20)],
        'largestStacks': [{'frames': [describe(site) for site in stack],
                           'sampledBytes': size}
                          for stack, size in stacks.most_common(10)],
    })
output = directory.parent / 'owned-allocation-analysis.json'
with output.open('x') as target:
    json.dump({
        'scope': 'Statistical live-allocation estimates at 65536-byte sampling; '
                 'not exact retention, RSS, object counts, a repair, or receiving qualification.',
        'samplingInterval': result['samplingInterval'] if result else 65536,
        'parentTerminalReceiptPresent': result is not None,
        'childExitCode': result['exitCode'] if result else None,
        'childSignal': result['signal'] if result else None,
        'observer': observer,
        'samples': rows,
    }, target)
    target.write('\n')
print(json.dumps({'samples': len(rows), 'output': str(output),
                  'lastSampledLiveBytes': rows[-1]['sampledLiveBytes'] if rows else None,
                  'parentTerminalReceiptPresent': result is not None,
                  'observerExitCode': observer['exitCode']}))
