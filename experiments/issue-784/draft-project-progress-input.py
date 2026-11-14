#!/usr/bin/env python3
"""Keep canonical namespace diagnostics from observing the option repeatedly."""
import hashlib
from pathlib import Path
import runpy

subject = Path('tools/translation/project.mjs')
source = subject.read_text()
before = '  const progress=translationProgressReporter(options.progress);'
after = '  const progressInput=options.progress,progress=translationProgressReporter(progressInput);'
assert source.count(before) == 1
condition = 'if(enclosingNamespace||options.progress!==undefined)'
assert source.count(condition) == 1
subject.write_text(source.replace(before, after).replace(
    condition, 'if(enclosingNamespace||progressInput!==undefined)'))

regression = '''
test('canonical namespace diagnostics capture the original progress input once',
 {timeout:60000},()=>{
 const records=[];let reads=0;
 const input={...options,get progress(){
  reads++;assert.equal(reads,1);return row=>records.push(row);
 }};
 const actual=translateProject(input),plain=translateProject(options);
 assert.equal(reads,1);assert.equal(actual.javascript,plain.javascript);
 assert.equal(actual.typescript,plain.typescript);assert.deepEqual(actual.meta,plain.meta);
 assert.deepEqual(records.filter(row=>row.stage==='namespace'&&row.state==='advance')
  .map(row=>row.phase),phases);
});
'''
test = Path('tools/translation/test/project-namespace-progress.test.mjs')
original = test.read_text()
assert 'capture the original progress input once' not in original
test.write_text(original + regression)

profile = Path('tools/translation/source-profiles/project-namespace-composition/source-rules.json')
old_pin = hashlib.sha256(profile.read_bytes()).hexdigest()
runpy.run_path('experiments/issue-784/author-source-evolution-profiles.py')
new_pin = hashlib.sha256(profile.read_bytes()).hexdigest()
assert old_pin != new_pin
for name in ['tools/translation/prepare-project-facade-retention.mjs',
             'experiments/issue-784/draft-project-progress-history.py']:
    target = Path(name)
    original = target.read_text()
    assert original.count(old_pin) == 1
    target.write_text(original.replace(old_pin, new_pin))
print('Updated exact project recipe after the one-read diagnostic repair')
