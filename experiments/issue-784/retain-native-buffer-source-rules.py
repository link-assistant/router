"""Retain the actual reviewed language edits without generated-source editing."""
import gzip
import hashlib
import json
from pathlib import Path

source = Path('ci-logs/issue-784-restart-2/native-buffer-json-dag-complete-source.json.gz')
raw = gzip.decompress(source.read_bytes())
assert hashlib.sha256(raw).hexdigest() == 'f9bb4316f2b2d657c74e0442c8fc99c899a44dcb5faec3b886cb4e764d424d09'
packet = json.loads(raw)
codec = packet['files'][0]
old = Path(codec['path'])
assert old.read_text() == codec['before']
target = Path('tools/translation/test/fixtures/complete-native-buffer-json-dag-hook-wire.mjs')
assert target.read_text() == codec['after']
rules = dict(schema='complete-native-buffer-json-DAG-source-rules-v1',
             beforePath=str(old), afterPath=str(target), beforeSha256=codec['beforeSha256'],
             afterSha256=codec['afterSha256'], languageEdits=codec['edits'], repositoryEdits=[],
             semanticAuthority=False, runtimeAuthority=False, productionExecutableGain=0)
folder = Path('tools/translation/source-profiles/native-buffer-json-dag')
folder.mkdir(exist_ok=False)
with (folder / 'source-rules.json').open('x') as stream:
    json.dump(rules, stream, indent=2)
    stream.write('\n')
with (folder / 'NOTICE.md').open('x') as stream:
    stream.write('''# Complete native Buffer JSON observation source

The candidate copies the complete current closed JSON DAG observation codec,
then applies the declared language substitutions. The original codec and its
producer remain unchanged. Both complete CST phases, fresh native source checks
and a whole-source inverse are required by the candidate producer.

Only direct native Buffer JSON observation DATA uses the additive projection.
Other byte objects and the original encoder retain their full own-key census.
Unknown extra Buffer own fields are ignored exactly as by native Buffer.toJSON;
length overrides, toJSON overrides, stack, proxies and shared storage refuse.
Every original byte and event is retained. No source, ownership, type, runtime,
performance, production coverage or parity authority follows from this profile.
''')
print(json.dumps(dict(path=str(folder), beforeSha256=codec['beforeSha256'],
                      afterSha256=codec['afterSha256'], sourceInstalled=False)))
