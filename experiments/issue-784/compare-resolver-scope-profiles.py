"""Compare the complete finite resolver profiles without claiming qualification."""
import collections
import gzip
import hashlib
import json
from pathlib import Path

directory = Path(__file__).resolve().parents[2] / 'ci-logs/issue-784-restart-2'
rows = []
for variant in ['original', 'shared-project']:
    prefix = 'ordinary-' + ('' if variant == 'original' else variant + '-') + 'resolver-interval'
    path = directory / (prefix + '-profile.json.gz')
    with gzip.open(path, 'rb') as stream:
        raw = stream.read(8 * 1024 * 1024 + 1)
    if len(raw) > 8 * 1024 * 1024:
        raise RuntimeError('Complete bounded profile required')
    record = json.loads(raw)
    if (record.get('variant', 'original') != variant
            or record['mode'] != 'resolver-interval' or not record['diagnosticOnly']):
        raise RuntimeError('Exact original and candidate diagnostic variants required')
    with gzip.open(directory / (prefix + '-inspection.json.gz'), 'rt') as stream:
        inspection = json.load(stream)
    digest = hashlib.sha256(raw).hexdigest()
    if inspection['sourceSha256'] != digest or inspection['completeSourceBytes'] != len(raw):
        raise RuntimeError('Complete independent profile inspection differs')
    sites = collections.Counter()
    for node in inspection['cpuNodes']:
        frame = node['frame']
        site = (frame['functionName'], frame['url'], frame['lineNumber'], frame['columnNumber'])
        sites[site] += node['selfMicroseconds']
    rows.append({
        'variant': variant, 'path': str(path), 'bytes': len(raw), 'sha256': digest,
        **{key: record[key] for key in ['stage', 'source', 'name', 'checkpoints',
                                      'resolverCheckpoint', 'memory', 'elapsedMilliseconds',
                                      'cpuElapsedMilliseconds']},
        'cpuSamples': inspection['cpuSamples'],
        'cpuSampleMicroseconds': inspection['cpuSampleMicroseconds'],
        'completeAggregatedSelfSites': [
            {'function': site[0], 'url': site[1], 'line': site[2], 'column': site[3],
             'microseconds': cost} for site, cost in sites.most_common()],
    })
boundary = ['stage', 'source', 'name', 'checkpoints', 'resolverCheckpoint']
same = all(rows[0][key] == rows[1][key] for key in boundary)
result = {'schema': 'finite-resolver-scope-comparison-v1', 'profiles': rows,
          'sameDiagnosticStopBoundary': same,
          'differingBoundaryFields': [key for key in boundary if rows[0][key] != rows[1][key]],
          'ordinaryPlannerCompleted': False, 'completeOutputEquivalenceChecked': False,
          'performanceQualified': False, 'productionExecutableGain': 0,
          'originalDeadlinesQualified': False, 'installed': False, 'runtimeParity': False}
encoded = json.dumps(result, separators=(',', ':')).encode()
target = directory / 'resolver-scope-profile-comparison.json.gz'
with target.open('xb') as stream:
    stream.write(gzip.compress(encoded, mtime=0))
with gzip.open(target, 'rb') as stream:
    if stream.read() != encoded:
        raise RuntimeError('Complete comparison readback differs')
print(json.dumps({key: value for key, value in result.items() if key != 'profiles'}))
for row in rows:
    print(json.dumps({key: value for key, value in row.items()
                      if key != 'completeAggregatedSelfSites'}))
    for site in row['completeAggregatedSelfSites'][:10]:
        print(json.dumps(site))
