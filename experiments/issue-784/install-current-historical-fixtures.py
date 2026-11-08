"""Install the complete, pinned generator and header receiving compositions."""
from pathlib import Path
import hashlib
import json
import re
import subprocess


def replace(source, before, after):
    if source.count(before) != 1:
        raise RuntimeError('One complete original anchor required: ' + before)
    return source.replace(before, after)


base = Path('tools/translation/test/fixtures')
for name in ['historical-generator-current-source.mjs',
             'upstream-header-privacy-source-composition.mjs']:
    source = Path('experiments/issue-784', name).read_text()
    source = source.replace('../../tools/translation/test/fixtures/historical-language-layout.mjs',
                            './historical-language-layout.mjs')
    source = source.replace('../../tools/translation/', '../../')
    source = source.replace('// Draft receiving adapter.', '// Receiving source adapter.')
    source = source.replace('// Draft receiving DATA:', '// Receiving DATA:')
    target = base / name
    with target.open('x') as output:
        output.write(source)

target = Path('tools/translation/test/reverse-independent-corpus.test.mjs')
current = target.read_text()
old = subprocess.check_output([
    'git', 'show', '358ad1ffe:tools/translation/test/reverse-independent-corpus.test.mjs',
], text=True)
pattern = r'^const BEFORE_GENERATOR=(.+);$'
full = re.search(pattern, old, re.M).group(0)
source = json.loads(re.search(pattern, old, re.M).group(1))
assert hashlib.sha256(source.encode()).hexdigest() == (
    '476ff090d064ced3d7b090cfc3962b24e50d8ddf3f32bca20a88c9d22966b558')
current, count = re.subn(pattern, lambda _: full, current, flags=re.M)
assert count == 1
current = ("import {adaptCompleteHistoricalReverseGenerator} from "
           "'./fixtures/historical-generator-current-source.mjs';\n" + current)
current = replace(current, ' let copied=BEFORE_GENERATOR.replace(/from',
                  ' const adaptation=adaptCompleteHistoricalReverseGenerator(BEFORE_GENERATOR);'
                  'assert.equal(adaptation.equation.inverse,BEFORE_GENERATOR);\n'
                  ' let copied=adaptation.after.replace(/from')
current = replace(current,
                  '{BEFORE_GENERATOR,BEFORE_GENERATOR_SHA,originalURL,copied,changes,reversed,path,readback}',
                  '{BEFORE_GENERATOR,BEFORE_GENERATOR_SHA,adaptation,originalURL,copied,changes,reversed,path,readback}')
current = replace(current,
                  'assert.equal(reversed,BEFORE_GENERATOR);assert.equal(readback,copied);',
                  'assert.equal(reversed,adaptation.after);'
                  'assert.equal(adaptation.equation.inverse,BEFORE_GENERATOR);'
                  'assert.equal(readback,copied);')
target.write_text(current)

target = Path('tools/translation/test/router-core-vectors.test.mjs')
current = target.read_text()
current = ("import {composeUpstreamHeaderPrivacySource} from "
           "'./fixtures/upstream-header-privacy-source-composition.mjs';\n" + current)
current = replace(current,
                  '  assert.equal(physical, original.source); assert.equal(hash(physical), original.sha256);',
                  """  assert.equal(hash(original.source), original.sha256);
  const privacy = retain('complete-upstream-header-privacy-source-equation', composeUpstreamHeaderPrivacySource(original.source));
  assert.equal(privacy.equation.inverse, original.source);
  assert.equal(physical, privacy.after); assert.equal(hash(physical), privacy.afterSha256);""")
current = replace(current,
                  '  const completeFunction = physical.slice(originalFn.start, originalFn.end);',
                  """  const completeFunction = physical.slice(originalFn.start, originalFn.end);
  const archivedFn = sourceItems(original.source).find(item => item.term === 'fn' && item.name === 'forwarded_client_headers');
  assert.ok(archivedFn);
  assert.equal(completeFunction, original.source.slice(archivedFn.start, archivedFn.end));""")
target.write_text(current)
print('Installed complete receiving compositions; original cases and deadlines retained.')
