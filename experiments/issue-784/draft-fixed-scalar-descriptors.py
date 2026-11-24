"""Prepare uninstalled source DATA for the sampled fixed-descriptor sibling.

All current descriptor queries remain fresh. This draft replaces only queries
whose captured expected descriptors are already proved to be own data fields by
ordinaryNative. Accessor and unqualified expectations retain the original helper.
Native checks, complete CST/inverse transport and receiving tests remain unrun.
"""
import gzip
import hashlib
import json
from pathlib import Path

path = 'tools/translation/original-json-intrinsics.mjs'
before = Path(path).read_text()
assert 'sameCapturedData' not in before
start = before.index('function kindBatchedExpectedJsonIntrinsicsUnchanged(){')
end = before.index('\nfunction kindBatchedExpectedPathMembershipIntrinsicsUnchanged(){', start)
original = before[start:end]
current = original
selections = [
    "same(descriptor(pin.owner,'next'),pin.field)",
    'same(descriptor(originalObject,name),field)',
    "same(descriptor(globalThis,'WeakSet'),globalWeakSet)",
    "same(descriptor(globalThis,'JSON'),globalJson)",
    "same(descriptor(globalThis,'Object'),globalObject)",
    "same(descriptor(globalThis,'Array'),globalArray)",
    "same(descriptor(globalThis,'Map'),globalMap)",
    "same(descriptor(globalThis,'Set'),globalSet)",
    "same(descriptor(originalJson,'stringify'),stringify)",
]
for selected in selections:
    assert current.count(selected) == 1
    current = current.replace(selected, 'sameCapturedData'+selected[4:], 1)
helper = '''// Every selected expectation is captured as an own data descriptor and
// independently qualified by ordinaryNative. Recheck each actual descriptor;
// an accessor transition refuses before reading any inherited value or writable.
function sameCapturedData(actual,expected){
 if(!actual||!hasOwn(actual,'value'))return false;
 return actual.enumerable===expected.enumerable&&actual.configurable===expected.configurable
  &&actual.value===expected.value&&actual.writable===expected.writable;
}

'''
after = before[:start] + helper + current + before[end:]
assert after.count(helper + current) == 1
assert after.replace(helper + current, original, 1) == before
hash_text = lambda text: hashlib.sha256(text.encode()).hexdigest()
profile = dict(schema='pinned-repository-source-evolution-v1', path=path,
               phase='repository', beforeSha256=hash_text(before),
               afterSha256=hash_text(after), edits=[dict(
                   id='router.fixed-qualified-scalar-descriptors.v1',
                   before=original, after=helper+current)],
               sourceAuthority=False, semanticAuthority=False,
               runtimeAuthority=False, productionExecutableGain=0)
packet = dict(schema='unqualified-fixed-scalar-descriptor-source-draft-v1',
              path=path, before=before, after=after, profile=profile,
              selectedCompleteQueries=selections, sourceInstalled=False,
              nativeChecked=False, cstChecked=False, receivingExecuted=False,
              performanceQualified=False, runtimeParity=False)
raw = json.dumps(packet, separators=(',', ':')).encode()
out = Path('ci-logs/issue-784-restart-2/fixed-scalar-descriptor-draft.json.gz')
assert not out.exists()
out.write_bytes(gzip.compress(raw, mtime=0))
assert gzip.decompress(out.read_bytes()) == raw
print(json.dumps(dict(path=str(out), beforeSha256=profile['beforeSha256'],
    afterSha256=profile['afterSha256'], selectedQueries=len(selections),
    sourceInstalled=False, performanceQualified=False)))
