"""Draft a complete receiving inverse without changing original JSON workloads."""
import gzip
import hashlib
import json
from pathlib import Path

path = Path('tools/translation/test/derive-footprint-json.test.mjs')
before = path.read_text()
anchor = "import * as current from '../derive-footprints.mjs';"
assert before.count(anchor) == 1
middle = before.replace(anchor, anchor + "\nimport {prepareDerivePathIndexReentry} from '../prepare-derive-path-index-reentry.mjs';")
old = "assert.equal(digest(beforeText),BEFORE_SHA256);const actual=readFileSync(new URL('../derive-footprints.mjs',import.meta.url),'utf8');let expected=beforeText;"
new = """assert.equal(digest(beforeText),BEFORE_SHA256);
 const physicalActual=readFileSync(new URL('../derive-footprints.mjs',import.meta.url),'utf8'),history=prepareDerivePathIndexReentry(),row=history.files[0];
 assert.equal(history.files.length,1);assert.equal(row.path,'tools/translation/derive-footprints.mjs');
 assert.equal(row.current,physicalActual);assert.equal(row.after,physicalActual);
 assert.equal(row.equation.before,row.before);assert.equal(row.equation.after,physicalActual);
 assert.equal(row.equation.inverse,row.before);assert.equal(row.evolution.inverse,row.before);
 assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
 assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);
 retain('complete-current-path-index-inverse',{physicalActual,history});
 const actual=row.before;let expected=beforeText;"""
assert middle.count(old) == 1
after = middle.replace(old, new)
assert before.count("timeout:60_000") == after.count("timeout:60_000") == 1
row = dict(path=str(path), before=before, after=after,
           beforeSha256=hashlib.sha256(before.encode()).hexdigest(),
           afterSha256=hashlib.sha256(after.encode()).hexdigest())
raw = json.dumps(dict(schema='complete-footprint-json-path-history-author-draft-v1',
                      files=[row], originalPinsChanged=False,
                      originalDeadlinesChanged=False,
                      initialNativeBehavioralActionsUnchanged=True)).encode()
target = Path('ci-logs/issue-784-restart-2/footprint-json-path-history-source-draft.json.gz')
with target.open('xb') as f:
    f.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps(dict(path=str(target), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())))
