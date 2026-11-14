"""Compose the pinned binding update into the complete default source history.

This writes a complete review proposal only. The checked author source and
original receiving files are installed after the unchanged baseline finishes.
"""
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
path = Path('tools/translation/prepare-default-proof-byte-adoption.mjs')
before = path.read_text()
after = before


def replace(old, new):
    global after
    assert after.count(old) == 1, old
    after = after.replace(old, new, 1)


replace("import {transportConcreteNamedSourcePhases}",
        "import {derivePinnedRepositorySourceEvolution} from './pinned-repository-source-evolution.mjs';\n"
        "import {transportConcreteNamedSourcePhases}")
replace("const PREREQUISITES=", "const PRODUCER_PROFILE=new URL('./source-profiles/candidate-binding-batches/whole-owner-proof-byte-candidate.rules.json',import.meta.url);\n"
        "const PRODUCER_PROFILE_PIN='25db23ed741bdc8c59b6d4d120328fe9dffdd09c2e45c4ba2fc7df351e1e76ae';\n"
        "const PREREQUISITES=")
function = '''// Retain the complete original adoption before composing its already pinned
// generator evolution. This DATA history never substitutes an earlier file.
function composeProducerBindingSourceLayer(ts,root,row){
 if(row.path!==PRODUCER)return row;
 const history=derivePinnedRepositorySourceEvolution(ts,{path:row.path,source:row.after,
  profile:PRODUCER_PROFILE,profileSha256:PRODUCER_PROFILE_PIN});
 const extension=equation(ts,root,row.path,row.after,row.after,history.after,[]);
 if(extension.stages[0].before!==extension.stages[0].after||extension.stages[0].beforeMeta!==extension.stages[0].afterMeta)
  fail('producer binding language phase must retain the complete source');
 const stages=[row.stages[0],joinPhase(row.stages[1],extension.stages[1])];
 if(stages[0].before!==row.before||stages[0].after!==row.language||stages[1].before!==row.language
  ||stages[1].after!==history.after||stages[0].afterMeta!==stages[1].beforeMeta)
  fail('complete composed producer binding CST equation differs');
 return {...row,after:history.after,afterSha256:hash(history.after),
  afterMeta:stages[1].afterMeta,stages,
  sequence:{languageRules:stages[0].sequence.languageRules,repositoryRules:stages[1].sequence.repositoryRules},
  trace:stages.flatMap(stage=>stage.trace),nativeCopies:[row.nativeCopies[0],extension.nativeCopies[1]],
  nativeBindings:extension.nativeBindings,preBindingLayer:row,bindingSourceHistory:{...history,equation:extension}};
}
'''
replace('function consumer(ts,path,before){', function + 'function consumer(ts,path,before){')
replace('const files=equations(ts,root,rows,true).map(row=>composeCloneSourceLayer(ts,root,row));',
        'const files=equations(ts,root,rows,true).map(row=>composeProducerBindingSourceLayer(ts,root,composeCloneSourceLayer(ts,root,row)));')
replace('const allowed=[row.before,row.after];',
        'const allowed=[row.before,row.after];if(row.preBindingLayer)allowed.push(row.preBindingLayer.after);')
replace("for(const row of files)if(row.cloneSourceHistory)assertCloneEnclosingSourceInputsFresh(row.cloneSourceHistory);",
        "for(const row of files){if(row.cloneSourceHistory)assertCloneEnclosingSourceInputsFresh(row.cloneSourceHistory);\n"
        "  if(row.bindingSourceHistory&&hash(readFileSync(PRODUCER_PROFILE))!==PRODUCER_PROFILE_PIN)fail('producer binding source profile changed');\n }")
assert len(after.splitlines()) < 1000
test_path = Path('tools/translation/test/default-proof-byte-adoption.test.mjs')
test_before = test_path.read_text()
test_after = test_before
anchor = "assert.match(producer.nativeSelections[0].replacement,/operation-proof-byte-bridge/);"
assert test_after.count(anchor) == 1
test_after = test_after.replace(anchor, anchor + '''
 assert.equal(producer.preBindingLayer.after,producer.bindingSourceHistory.before);
 assert.equal(producer.bindingSourceHistory.after,producer.after);
 assert.equal(producer.bindingSourceHistory.inverse,producer.preBindingLayer.after);
 assert.equal(producer.bindingSourceHistory.equation.nativeBindings.nativeSemanticScopeChecked,true);
 assert.deepEqual(producer.bindingSourceHistory.trace.map(stage=>stage.phase),['language','repository']);
 assert.equal(producer.stages[1].composedFrom.length,2);
 assert.deepEqual(producer.originalHashCalls,producer.bindingSourceHistory.equation.originalHashCalls);''', 1)
sha = lambda source: hashlib.sha256(source.encode()).hexdigest()
rows = [dict(path=str(path), before=before, after=after),
        dict(path=str(test_path), before=test_before, after=test_after)]
for row in rows:
    row.update(beforeSha256=sha(row['before']), afterSha256=sha(row['after']))
raw = json.dumps(dict(schema='default-proof-byte-binding-history-draft-v1', files=rows,
                     installed=False, cstChecked=False, receivingQualified=False,
                     originalBoundsChanged=False, productionExecutableGain=0)).encode()
target = base / 'proof-history-source-draft.json.gz'
with target.open('xb') as output:
    output.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps(dict(path=str(target), sha256=hashlib.sha256(raw).hexdigest(),
                      bytes=len(raw), files=len(rows))))
