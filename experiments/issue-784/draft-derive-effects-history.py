"""Draft the complete existing effect test with its explicit source inverse."""
import gzip
import hashlib
import json
from pathlib import Path

path = Path('tools/translation/test/derive-output-effects.test.mjs')
before = path.read_text()
changes = [(
    "import {legacyProofConsumerSource} from './fixtures/facade-ast-receiving-history.mjs';",
    "import {legacyProofConsumerSource} from './fixtures/facade-ast-receiving-history.mjs';\n"
    "import {prepareDerivePathIndexReentry} from '../prepare-derive-path-index-reentry.mjs';"
), (
    "  if(path==='tools/translation/source-module-views.mjs'){",
    "  if(path==='tools/translation/derive-footprints.mjs'){\n"
    "   const history=prepareDerivePathIndexReentry(),row=history.files[0];\n"
    "   assert.equal(row.path,path);assert.equal(row.current,currentSource);assert.equal(row.after,currentSource);\n"
    "   assert.equal(row.equation.inverse,row.before);assert.equal(row.evolution.inverse,row.before);\n"
    "   assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);\n"
    "   assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);\n"
    "   receivingHistory.push({kind:'complete-derive-path-index-reentry',value:history});selectedSource=row.before;\n"
    "  }\n"
    "  if(path==='tools/translation/source-module-views.mjs'){"
)]
after = before
for expected, replacement in changes:
    assert after.count(expected) == 1
    after = after.replace(expected, replacement)
sha = lambda value: hashlib.sha256(value.encode()).hexdigest()
raw = json.dumps(dict(schema='complete-derive-effects-history-author-draft-v1',
                      files=[dict(path=str(path), before=before, after=after,
                                  beforeSha256=sha(before), afterSha256=sha(after))],
                      originalPinsChanged=False, originalDeadlinesChanged=False,
                      initialNativeBehavioralActionsUnchanged=True)).encode()
output = Path('ci-logs/issue-784-restart-2/derive-effects-history-source-draft.json.gz')
with output.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(output.read_bytes()) == raw
print(json.dumps(dict(output=str(output), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())))
