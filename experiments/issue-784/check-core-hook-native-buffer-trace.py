"""One finite real traced child; original whole-file deadlines qualify separately."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

base = Path('ci-logs/issue-784-restart-2')
fixture = Path('tools/translation/test/fixtures/whole-owner-core-hook-child.mjs')
before = fixture.read_bytes()
environment = dict(os.environ, ROUTER_COMPLETE_CORE_HOOK_TRACE='1')
output = base / 'native-buffer-json-dag-traced-complete-wire.txt.gz'
stderr = base / 'native-buffer-json-dag-traced-phases.jsonl'
started = time.monotonic()
digest, logical = hashlib.sha256(), 0
child = None
try:
    with output.open('xb') as target, stderr.open('xb') as error:
        child = subprocess.Popen(['node', str(fixture), 'legacy', 'hash-hook'],
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
    phases = [json.loads(line) for line in stderr.read_text().splitlines()]
    assert phases and all(row['schema'] == 'complete-Core-hook-phase-v1' for row in phases)
    assert [row['phase'] for row in phases].count('wire-start') == 1
    assert phases[-1]['phase'] == 'wire-finish'
    with gzip.open(base / 'core-hook-trace-complete-wire.txt.gz', 'rb') as old, gzip.open(output, 'rb') as new:
        identical = True
        while True:
            left, right = old.read(65536), new.read(65536)
            identical = identical and left == right
            if not left and not right:
                break
    result = dict(schema='actual-Core-native-buffer-trace-diagnostic-v1', exitCode=status,
                  elapsedSeconds=time.monotonic()-started, phases=phases,
                  completeWireBytes=logical, sha256=digest.hexdigest(),
                  originalFullWireByteIdentical=identical, compressedBytes=output.stat().st_size,
                  originalChildDeadlineMs=12500, originalDeadlineQualified=False,
                  receivingQualified=False, productionExecutableGain=0)
    with (base / 'native-buffer-json-dag-traced-result.json').open('x') as stream:
        json.dump(result, stream)
    print(json.dumps(result))
    raise SystemExit(status if status else 0 if identical else 1)
finally:
    if child is not None and child.poll() is None:
        child.terminate()
        child.wait()
