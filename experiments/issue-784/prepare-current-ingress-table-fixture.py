"""Draft the existing twelve-table test's new ingress-header contract."""
import hashlib
import json
from pathlib import Path

path = Path('tools/translation/js-to-rust/test/static-tables.test.mjs')
before = path.read_text()
old_fixture = "['native-service.mjs','ingress','ingress',12,'cloudfront-viewer-address']"
new_fixture = "['native-service.mjs','ingress','ingress',15,'cloudfront-viewer-address']"
assert before.count(old_fixture) == 1
middle = before.replace(old_fixture, new_fixture)
anchor = "      assert.equal(original.size(),size);assert.equal(translated.size(),size);assert.equal(evaluate(result.program,'size',[]),size);"
assert middle.count(anchor) == 1
addition = """      if(path==='native-service.mjs'&&name==='ingress'){
        // Issue #784 adds these three fixed ingress identities. Every original
        // table and every original membership/refusal case above still runs.
        for(const input of ['x-original-forwarded-for','cf-connecting-ipv6','cf-pseudo-ipv4']){
          assert.equal(original.has(input),true);assert.equal(translated.has(input),true);assert.equal(evaluate(result.program,'has',[input]),true);
          assert.equal(original.has(input.toUpperCase()),false);assert.equal(translated.has(input.toUpperCase()),false);assert.equal(evaluate(result.program,'has',[input.toUpperCase()]),false);
        }
      }
"""
after = middle.replace(anchor, addition + anchor)
assert after.replace(addition + anchor, anchor).replace(new_fixture, old_fixture) == before
report = {'schema': 'current-twelve-original-table-fixture-draft-v1',
          'path': str(path), 'before': before, 'middle': middle, 'after': after,
          'beforeSha256': hashlib.sha256(before.encode()).hexdigest(),
          'afterSha256': hashlib.sha256(after.encode()).hexdigest(),
          'originalTables': 12, 'originalIngressEntries': 12,
          'currentIngressEntries': 15,
          'addedIngressEntries': ['x-original-forwarded-for', 'cf-connecting-ipv6', 'cf-pseudo-ipv4'],
          'completeInverse': before, 'originalCasesAndDeadlinesUnchanged': True,
          'sourceInstalled': False, 'receivingExecuted': False}
target = Path('ci-logs/issue-784-restart-2/current-ingress-table-fixture-draft.json')
with target.open('x') as output:
    json.dump(report, output)
assert json.loads(target.read_bytes()) == report
print(json.dumps({'draft': str(target), 'installed': False}))
