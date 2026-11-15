"""Recover the complete original production parent from its pinned Git object."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

reference = 'eeb05407b^:src/git_proxy.rs'
raw = subprocess.check_output(['git', 'show', reference])
assert len(raw) == 18664
assert hashlib.sha256(raw).hexdigest() == 'ed47b0f287dcf7cc1d03672ed1abd924bebb5862929af06f714ccdff42409f22'
target = Path('tools/translation/test/fixtures/standard-string-git-proxy-original.rs.gz')
packed = gzip.compress(raw, mtime=0)
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps({'path': str(target), 'originalGitReference': reference,
                  'gitBlob': subprocess.check_output(['git', 'rev-parse', reference], text=True).strip(),
                  'rawBytes': len(raw), 'bytes': len(packed),
                  'sha256': hashlib.sha256(packed).hexdigest(),
                  'fullOriginalReadbackVerified': True, 'semanticAuthority': False}))
