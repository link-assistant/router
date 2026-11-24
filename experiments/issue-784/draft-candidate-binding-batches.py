"""Draft complete source equations for fresh per-generator binding programs.

Every copied source still receives the existing native semantic diagnostics.
Only standard-library parsing is shared within one generator invocation. This
draft installs nothing and grants no source or performance authority.
"""
import gzip
import hashlib
import json
from pathlib import Path

names = ['whole-owner-derive-candidate', 'whole-owner-resolver-candidate',
         'whole-owner-proof-byte-candidate', 'whole-owner-core-producer-candidate',
         'whole-owner-core-corpus-candidate', 'core-sequence-stream-sources']
rows = []
sha = lambda source: hashlib.sha256(source.encode()).hexdigest()
for name in names:
    path = 'tools/translation/prepare-' + name + '.mjs'
    before = Path(path).read_text()
    import_before = "import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';"
    import_after = import_before.replace('SourceBindings', 'ModuleBindings')
    assert before.count(import_before) == 1
    call_before = 'const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,path),after),'
    call_after = ('const nativeBindings={};bindingCandidates.push({path:resolve(root,path),'
                  'source:after,result:nativeBindings});const ')
    assert before.count(call_before) == 1
    entry = next(line for line in before.splitlines()
                 if line.startswith('export function prepare'))
    assert entry.endswith('({root=ROOT}={}){')
    finish = next(line for line in before.splitlines() if line.startswith(' return {schema:'))
    check = (" // Fresh complete native scope checks precede every returned plan and write.\n"
             " const checkedBindings=verifyNativeCopiedModuleBindings(ts,bindingCandidates);\n"
             " for(let at=0;at<bindingCandidates.length;at++)"
             "Object.assign(bindingCandidates[at].result,checkedBindings[at]);\n")
    edits = [dict(id='router.candidate-binding-batch.import.v1',
                  before=import_before, after=import_after),
             dict(id='router.candidate-binding-batch.invocation.v1',
                  before=entry, after=entry+'\n const bindingCandidates=[];'),
             dict(id='router.candidate-binding-batch.collect.v1',
                  before=call_before, after=call_after),
             dict(id='router.candidate-binding-batch.complete.v1',
                  before=finish, after=check+finish)]
    after = before
    for edit in edits:
        assert after.count(edit['before']) == 1
        after = after.replace(edit['before'], edit['after'], 1)
    inverse = after
    for edit in reversed(edits):
        assert inverse.count(edit['after']) == 1
        inverse = inverse.replace(edit['after'], edit['before'], 1)
    assert inverse == before and 'verifyNativeCopiedSourceBindings' not in after
    assert len(after.splitlines()) < 1000
    profile = dict(schema='pinned-repository-source-evolution-v1', path=path,
                   phase='repository', beforeSha256=sha(before), afterSha256=sha(after),
                   edits=edits, sourceAuthority=False, semanticAuthority=False,
                   runtimeAuthority=False, productionExecutableGain=0)
    rows.append(dict(path=path, before=before, after=after, profile=profile))
# The existing CST-batch composer extracts the native declaration from whole().
# Keep its private registration when native checks are deferred to one program,
# and complete those checks before the composer's first three-row CST chunk.
path = 'tools/translation/prepare-batched-proof-byte-source-candidate.mjs'
before = Path(path).read_text()
anchor = ' const rawBody=' + "'" + '{\\n'
registration = (" const nativeRegistration=ts.isObjectLiteralExpression(native.initializer)?"
                "one(body.filter(node=>ts.isExpressionStatement(node)&&node.getText(file)==="
                "'bindingCandidates.push({path:resolve(root,path),source:after,result:nativeBindings});'),"
                "'complete invocation-local native registration').getText(file):'';\n")
raw_before = ".join(',')+';\\n'+hashGuard.getText(file)"
raw_after = ".join(',')+';\\n'+nativeRegistration+'\\n'+hashGuard.getText(file)"
finish_before = ' const finish=`\n // All34'
finish_after = (" const finish=`\n ${nativeRegistration?'const __batchedNativeBindings="
                "verifyNativeCopiedModuleBindings(ts,bindingCandidates);for(let at=0;"
                "at<bindingCandidates.length;at++)Object.assign(bindingCandidates[at].result,"
                "__batchedNativeBindings[at]);':''}\n // All34")
edits = [dict(id='router.candidate-binding-batch.retain-native-registration.v1',
              before=anchor, after=registration+anchor),
         dict(id='router.candidate-binding-batch.copy-native-registration.v1',
              before=raw_before, after=raw_after),
         dict(id='router.candidate-binding-batch.native-before-cst-chunks.v1',
              before=finish_before, after=finish_after)]
after = before
for edit in edits:
    assert after.count(edit['before']) == 1
    after = after.replace(edit['before'], edit['after'], 1)
inverse = after
for edit in reversed(edits):
    assert inverse.count(edit['after']) == 1
    inverse = inverse.replace(edit['after'], edit['before'], 1)
assert inverse == before
profile = dict(schema='pinned-repository-source-evolution-v1', path=path,
               phase='repository', beforeSha256=sha(before), afterSha256=sha(after),
               edits=edits, sourceAuthority=False, semanticAuthority=False,
               runtimeAuthority=False, productionExecutableGain=0)
rows.append(dict(path=path, before=before, after=after, profile=profile))
packet = dict(schema='candidate-binding-batches-source-draft-v1', files=rows,
              sourceInstalled=False, cstChecked=False, nativeChecked=False,
              receivingPassed=False, performanceQualified=False,
              runtimeParity=False, productionExecutableGain=0)
target = Path('ci-logs/issue-784-restart-2/candidate-binding-batches-v2-draft.json.gz')
raw = json.dumps(packet, separators=(',', ':')).encode()
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps(dict(target=str(target), files=[dict(path=row['path'],
    beforeSha256=sha(row['before']), afterSha256=sha(row['after'])) for row in rows],
    sourceInstalled=False, performanceQualified=False)))
