"""Inspect the complete current workflow archive for the missing cancelled log."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import subprocess
import zipfile

base = Path('ci-logs/issue-784-restart-2')
prefix = base / 'current-ec600-terminal-whole-run'
maximum = 16 * 1024 * 1024
buffer = io.BytesIO()
with prefix.with_suffix('.stderr').open('xb') as errors:
    child = subprocess.Popen(['gh', 'api', 'repos/link-assistant/router/actions/runs/42610701304/logs'],
                             stdout=subprocess.PIPE, stderr=errors)
    exceeded = False
    while block := child.stdout.read(65536):
        buffer.write(block)
        if buffer.tell() > maximum:
            exceeded = True
            child.terminate()
            break
    code = child.wait()
raw = buffer.getvalue()
record = dict(schema='terminal-whole-run-cancelled-log-recovery-v1', runId=42610701304,
    headSha='ec6005a8358428a560bb7c685d52a32b174a74f6', jobId=129138077110,
    bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(), maximumBytes=maximum,
    byteLimitExceeded=exceeded, exitCode=code, members=[], retained=[], wholeArchiveVerified=False)
if code == 0 and not exceeded and zipfile.is_zipfile(buffer):
    with zipfile.ZipFile(buffer) as archive:
        assert len(archive.infolist()) <= 2048
        assert sum(i.file_size for i in archive.infolist()) <= 128 * 1024 * 1024
        for item in archive.infolist():
            assert item.file_size <= 16 * 1024 * 1024
            digest, length = hashlib.sha256(), 0
            selected = 'translation' in item.filename and ('(7)' in item.filename or '7_' in item.filename)
            content = io.BytesIO() if selected else None
            with archive.open(item) as source:
                while block := source.read(65536):
                    length += len(block)
                    digest.update(block)
                    if content is not None:
                        content.write(block)
            assert length == item.file_size
            row = dict(path=item.filename, bytes=length, sha256=digest.hexdigest(), crc=item.CRC)
            record['members'].append(row)
            if content is not None:
                output = base / ('current-ec600-cancelled-seven-member-' + str(len(record['retained'])) + '.log.gz')
                packed = gzip.compress(content.getvalue(), mtime=0)
                assert len(packed) <= 500000
                with output.open('xb') as target:
                    target.write(packed)
                assert gzip.decompress(output.read_bytes()) == content.getvalue()
                record['retained'].append(dict(**row, output=str(output)))
    record['wholeArchiveVerified'] = True
else:
    record['responsePrefix'] = raw[:4096].decode('utf8', errors='replace')
encoded = json.dumps(record, separators=(',', ':')).encode()
with prefix.with_suffix('.json.gz').open('xb') as output:
    output.write(gzip.compress(encoded, mtime=0))
assert gzip.decompress(prefix.with_suffix('.json.gz').read_bytes()) == encoded
print(json.dumps({k: v for k, v in record.items() if k not in ['members', 'responsePrefix']}))
