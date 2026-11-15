"""Retain the complete finite Core profile and stdout through compression."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

base = Path('ci-logs/issue-784-restart-2')
environment = dict(os.environ, ROUTER_COMPLETE_CORE_HOOK_TRACE='1')
output = base / 'core-child-current-profile-complete-wire.txt.gz'
stderr = base / 'core-child-current-profile-phases.jsonl'
fixture = Path('tools/translation/test/fixtures/whole-owner-core-hook-child.mjs')
before = fixture.read_bytes()
started = time.monotonic()
digest, logical, child = hashlib.sha256(), 0, None
try:
    with output.open('xb') as target, stderr.open('xb') as error:
        child = subprocess.Popen(['node', 'experiments/issue-784/profile-complete-core-child.mjs'],
                                 stdout=subprocess.PIPE, stderr=error, env=environment)
        with gzip.GzipFile(fileobj=target, mode='wb', mtime=0) as packed:
            while chunk := child.stdout.read(65536):
                logical += len(chunk)
                assert logical <= 64 * 1024 * 1024
                digest.update(chunk)
                packed.write(chunk)
                assert target.tell() <= 16 * 1024 * 1024
        status = child.wait()
    assert fixture.read_bytes() == before
    trace = [json.loads(line) for line in stderr.read_text().splitlines()]
    phases = [row for row in trace if row['schema'] == 'complete-Core-hook-phase-v1']
    assert phases[-1]['phase'] == 'wire-finish'
    assert logical == phases[-1]['bytes']
    with gzip.open(output, 'rb') as source:
        restored = hashlib.sha256()
        while chunk := source.read(65536):
            restored.update(chunk)
    assert restored.hexdigest() == digest.hexdigest()
    result = dict(schema='complete-Core-child-profile-resource-diagnostic-v1',
                  exitCode=status, elapsedSeconds=time.monotonic()-started,
                  phases=trace, completeWireBytes=logical, sha256=digest.hexdigest(),
                  compressedWireBytes=output.stat().st_size,
                  originalChildDeadlineMs=12500, originalDeadlineQualified=False,
                  receivingQualified=False, productionExecutableGain=0)
    with (base / 'core-child-current-profile-result.json').open('x') as stream:
        json.dump(result, stream)
    print(json.dumps(result))
    raise SystemExit(status)
finally:
    if child is not None and child.poll() is None:
        child.terminate()
        child.wait()
