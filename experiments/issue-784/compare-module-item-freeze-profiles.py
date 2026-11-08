"""Compare complete equal-input allocation samples without claiming parity."""
from collections import defaultdict
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
names = ['current-module-freeze-profile-before', 'current-module-freeze-profile-after-v2']
packets = [json.loads(gzip.decompress((base / (name + '.json.gz')).read_bytes())) for name in names]
assert len(packets[0]['rows']) == 567 and packets[0]['rows'] == packets[1]['rows']
assert all(row['includesCollectedObjects'] and row['samplingInterval'] == 16384 for row in packets)
rows = []
for name, packet in zip(names, packets):
    totals = defaultdict(int)

    def visit(node, in_freeze=False):
        frame = node['callFrame']
        own = frame['url'].endswith('/tools/translation/source-module-views.mjs')
        in_freeze |= own and frame['functionName'] == 'freeze'
        size = node['selfSize']
        totals['allSampledBytes'] += size
        if in_freeze:
            totals['recursiveSourceViewFreezeSampledBytes'] += size
            if frame['functionName'] == 'values':
                totals['valuesUnderRecursiveSourceViewFreezeSampledBytes'] += size
        if own and frame['functionName'] == 'freezePrivateModuleItems':
            totals['directPrivateItemFreezeSelfSampledBytes'] += size
        for child in node.get('children', []):
            visit(child, in_freeze)

    visit(packet['profile']['head'])
    memory = json.loads((base / (name + '.memory.json')).read_bytes())
    assert memory['exitCode'] == 0 and not memory['stopped']
    rows.append({'profile': str(base / (name + '.json.gz')), 'totals': dict(totals),
                 'elapsedMs': packet['elapsedMs'], 'moduleSha256': packet['moduleSha256'],
                 'peakSampledCgroupBytes': memory['peakSampledCgroupBytes']})
value = {'schema': 'complete-module-item-freeze-profile-comparison-v1', 'rows': rows,
         'completeEqualResultFiles': 567,
         'resultCensusSha256': hashlib.sha256(json.dumps(packets[0]['rows'], separators=(',', ':'), ensure_ascii=False).encode()).hexdigest(),
         'newExecutableApplicationFunctions': 0, 'fullGenerationQualified': False,
         'scope': 'One independent before/after sample each, including collected allocations. Statistical allocation estimates and total cgroup peaks; no leak, repeated benchmark, host-independent speedup or complete generation claim.'}
target = base / 'current-module-freeze-profile-comparison.json'
with target.open('x') as output:
    json.dump(value, output)
print(json.dumps(value))
