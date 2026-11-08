"""Keep the actual memory stop and the explicitly incomplete progress stream."""
import base64
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
prefix = 'current-owned-freeze-whole-plan'
receipt = json.loads((base / (prefix + '.memory.json')).read_bytes())
assert receipt['stopped'] and receipt['exitCode'] == 143
assert receipt['peakSampledCgroupBytes'] >= receipt['stopThresholdBytes']
for pid in [receipt['pid'], 702594, 702638, *receipt['stoppedOwnedProcessIds']]:
    assert not Path('/proc/' + str(pid)).exists()
paths = [base / (prefix + suffix) for suffix in [
    '-command.json', '.log.gz', '.memory.json', '.observer.log']]
paths += [Path('experiments/issue-784/observe-owned-plan-after-freeze.py'),
          Path('experiments/issue-784/profile-owned-generation-child.mjs')]
members = []
for path in paths:
    raw = path.read_bytes()
    members.append({'path': str(path), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})
assert (base / (prefix + '.log.gz')).stat().st_size == 0
record = {'schema': 'owned-freeze-whole-plan-incomplete-output-observation-v1',
          'members': members, 'allObservedOriginalBytesRetained': True,
          'allOwnedChildrenClosed': True, 'outputsApplied': False,
          'completeProgressStreamRetained': False,
          'streamLimitation': 'GNU gzip -1 buffered the progress stream. The aggregate resource observer sent SIGTERM to Node and gzip; the resulting file is empty, not a valid gzip stream. No per-stage completion or source count can be recovered or qualified.',
          'launcherSourceLimitation': 'The captured launcher includes RLIMIT_CORE=0 added after launch. All six owned live processes then had their core limit set to zero by prlimit. This captured source is not asserted to be the exact launcher byte image at launch.',
          'noUnchangedRetry': True, 'fullGenerationQualified': False,
          'newExecutableApplicationFunctions': 0, 'fullGatePassed': False,
          'rustExecuted': False}
raw = json.dumps(record, separators=(',', ':')).encode() + b'\n'
packed = gzip.compress(raw, mtime=0)
target = Path('docs/case-studies/issue-784/evidence/current-owned-freeze-whole-plan-stop.json.gz')
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
    decoded = base64.b64decode(member['base64'], validate=True)
    assert len(decoded) == member['bytes']
    assert hashlib.sha256(decoded).hexdigest() == member['sha256']
print(json.dumps({'path': str(target), 'bytes': len(packed),
                  'sha256': hashlib.sha256(packed).hexdigest(),
                  'elapsedSeconds': receipt['elapsedSeconds'],
                  'peakSampledCgroupBytes': receipt['peakSampledCgroupBytes'],
                  'allOwnedChildrenClosed': True, 'completeProgressStreamRetained': False}))
