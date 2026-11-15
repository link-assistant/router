"""Retain an uninstalled private native descriptor comparison proposal.

The captured native descriptor operation supplies both private arguments.
Reusing the first own-data-kind observation removes no live descriptor query.
Native syntax, complete CST/inverse checks, original receiving behavior and
performance remain unqualified until the receiving batch has finished.
"""
import gzip
import hashlib
import json
from pathlib import Path

path = 'tools/translation/private-parser-execution.mjs'
before = Path(path).read_text()
old = "function same(a,b){return !!a===!!b&&(!a||own(a,'value')===own(b,'value')&&a.enumerable===b.enumerable&&a.configurable===b.configurable&&(own(a,'value')?a.value===b.value&&a.writable===b.writable:a.get===b.get&&a.set===b.set));}"
new = """function same(a,b){
  if(!!a!==!!b)return false;if(!a)return true;
  // Both arguments are private results of the captured native descriptor
  // operation. No callback or mutation occurs between these own-data reads.
  const data=own(a,'value');
  return data===own(b,'value')&&a.enumerable===b.enumerable&&a.configurable===b.configurable&&(data?a.value===b.value&&a.writable===b.writable:a.get===b.get&&a.set===b.set);
}"""
assert before.count(old) == 1
after = before.replace(old, new, 1)
assert after.replace(new, old, 1) == before
sha = lambda source: hashlib.sha256(source.encode()).hexdigest()
record = dict(
    schema='uninstalled-private-native-descriptor-kind-draft-v1', path=path,
    before=before, after=after, inverse=before,
    edits=[dict(id='javascript.private-native-descriptor-kind-once.v1',
                phase='language', before=old, after=new)],
    beforeSha256=sha(before), afterSha256=sha(after), sourceInstalled=False,
    nativeChecked=False, cstChecked=False, receivingExecuted=False,
    performanceQualified=False, runtimeAuthority=False,
    productionExecutableGain=0)
raw = json.dumps(record, separators=(',', ':')).encode()
out = Path('ci-logs/issue-784-restart-2/private-native-descriptor-kind-draft.json.gz')
if out.exists():
    assert gzip.decompress(out.read_bytes()) == raw
else:
    with out.open('xb') as stream:
        stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(out.read_bytes()) == raw
print(json.dumps(dict(path=str(out), beforeSha256=sha(before),
                      afterSha256=sha(after), sourceInstalled=False)))
