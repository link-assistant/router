"""Finite unchanged Core workload with scalar tracing in a temporary full copy.

Diagnostic only: the original 12500 ms child deadline remains failed. No actual
fixture, compiler, case body or deadline is installed or changed by this probe.
"""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

root = Path.cwd()
base = Path('ci-logs/issue-784-restart-2')
path = Path('tools/translation/test/fixtures/whole-owner-core-hook-child.mjs')
before = path.read_text()
steps = []
after = before


def edit(old, new):
    global after
    assert after.count(old) == 1
    after = after.replace(old, new, 1)
    steps.append(dict(before=old, after=new))


anchor = "const creator=mode==='legacy'?createEnclosingCoreAdoptionProducerContext:createWholeOwnerCoreAdoptionProducerContext;"
edit(anchor, anchor + "\nconst traceStart=performance.now();function trace(phase,extra={}){process.stderr.write(json({schema:'finite-core-hook-phase-trace-v1',phase,elapsedMs:performance.now()-traceStart,rss:process.memoryUsage().rss,...extra})+'\\n');}function traceWire(value){trace('wire-start');const wire=encodeCompleteHookWire(value);trace('wire-finish',{bytes:Buffer.byteLength(wire)});return wire;}")
edit('function setup(){const sources=', "function setup(){trace('setup-start');const sources=")
edit('return {options,context:creator(options)};',
     "trace('graph-finish');const context=creator(options);trace('creator-finish');return {options,context};")
edit('function inspect({options,context}){',
     "function inspect({options,context}){trace('inspect-start');")
edit('function outcome(run){try{return {value:run()};}',
     "function outcome(run){trace('outcome-start');try{const value=run();trace('outcome-finish');return {value};}")
edit('process.stdout.write(encodeCompleteHookWire(', 'process.stdout.write(traceWire(')
inverse = after
for step in reversed(steps):
    assert inverse.count(step['after']) == 1
    inverse = inverse.replace(step['after'], step['before'], 1)
assert inverse == before
temporary = path.with_name('.issue-784-core-hook-trace-' + str(os.getpid()) + '.mjs')
assert not temporary.exists()
record = dict(schema='finite-uninstalled-core-hook-phase-diagnostic-v1',
              path=str(path), before=before, after=after, inverse=inverse, steps=steps,
              sourceInstalled=False, concreteSyntaxChecked=False,
              originalDeadlineQualified=False, receivingQualified=False,
              productionExecutableGain=0, runtimeParity=False)
source_record = base / 'core-hook-trace-complete-source.json.gz'
assert not source_record.exists()
raw = json.dumps(record).encode()
source_record.write_bytes(gzip.compress(raw, mtime=0))
assert gzip.decompress(source_record.read_bytes()) == raw
temporary.open('x').write(after)
child = None
try:
    syntax = subprocess.run(['node', '--input-type=module', '--check'],
                            input=after, text=True, capture_output=True)
    assert syntax.returncode == 0, syntax.stderr
    command = ['node', str(temporary), 'legacy', 'hash-hook']
    started = time.monotonic()
    logical = 0
    digest = hashlib.sha256()
    output = base / 'core-hook-trace-complete-wire.txt.gz'
    with (base / 'core-hook-trace-stderr.jsonl').open('xb') as error, output.open('xb') as target:
        child = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=error)
        with gzip.GzipFile(fileobj=target, mode='wb', mtime=0) as packed:
            while chunk := child.stdout.read(65536):
                logical += len(chunk)
                assert logical <= 64 * 1024 * 1024
                digest.update(chunk)
                packed.write(chunk)
                assert target.tell() <= 16 * 1024 * 1024
        status = child.wait()
    assert path.read_text() == before
    result = dict(command=command, exitCode=status, elapsedSeconds=time.monotonic()-started,
                  stdoutBytes=logical, stdoutSha256=digest.hexdigest(),
                  compressedBytes=output.stat().st_size,
                  sourceInstalled=False, receivingQualified=False,
                  originalChildDeadlineMs=12500, originalDeadlineQualified=False)
    with (base / 'core-hook-trace-result.json').open('x') as stream:
        json.dump(result, stream)
    print(json.dumps(result))
    raise SystemExit(status)
finally:
    if child is not None and child.poll() is None:
        child.terminate()
        child.wait()
    assert temporary.read_text() == after
    temporary.unlink()
