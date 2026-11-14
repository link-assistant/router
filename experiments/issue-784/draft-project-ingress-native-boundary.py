"""Author the next pinned graph-ingress layer after the frozen receiving run.

The actual project source is installed only by its existing complete native/CST
source producer. This author changes that producer, its explicit history reader
and the additive regression file; it never writes a generated project by hand.
"""
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
packet = json.loads(gzip.decompress(
    (base / 'graph-discovery-ingress-refusal-draft.json.gz').read_bytes()))
assert Path(packet['path']).read_text() == packet['before']
assert packet['inverse'] == packet['before']
profile_path = Path('tools/translation/source-profiles/project-ingress-native-boundary/source-rules.json')
profile = dict(schema='pinned-repository-source-evolution-v1', path=packet['path'],
               phase='repository', beforeSha256=packet['beforeSha256'],
               afterSha256=packet['afterSha256'],
               edits=[dict(id=f'router.project-ingress-native-boundary.{at}.v1', **row)
                      for at, row in enumerate(packet['edits'], 1)],
               sourceAuthority=False, semanticAuthority=False,
               runtimeAuthority=False, productionExecutableGain=0)
raw = (json.dumps(profile, ensure_ascii=False, indent=2) + '\n').encode()
digest = hashlib.sha256(raw).hexdigest()
producer_path = Path('tools/translation/prepare-project-facade-retention.mjs')
producer = producer_path.read_text()
anchor = ' const after=namespaceObserver.after;'
replacement = """  const ingressBoundary=derivePinnedRepositorySourceEvolution(ts,{
   profile:new URL('./source-profiles/project-ingress-native-boundary/source-rules.json',import.meta.url),
   profileSha256:'DIGEST',path:PATH,source:namespaceObserver.after,
  });
  const after=ingressBoundary.after;""".replace('DIGEST', digest)
assert producer.count(anchor) == 1
after = producer.replace(anchor, replacement, 1)
edits = [
    ('if(namespaceObserver.inverse!==namespaceComposition.after||namespaceComposition.inverse!==previousAfter)',
     'if(ingressBoundary.inverse!==namespaceObserver.after||namespaceObserver.inverse!==namespaceComposition.after||namespaceComposition.inverse!==previousAfter)'),
    ('methodOwnerScope,namespaceComposition,namespaceObserver}',
     'methodOwnerScope,namespaceComposition,namespaceObserver,ingressBoundary}'),
    ('current!==namespaceComposition.after&&current!==after)',
     'current!==namespaceComposition.after&&current!==namespaceObserver.after&&current!==after)'),
]
for before, value in edits:
    assert after.count(before) == 1
    after = after.replace(before, value, 1)

history_path = Path('tools/translation/test/project-progress-source-history.mjs')
history = history_path.read_text()
anchor = "  sha256:'23eabe8f329efc2534b7da89442c3273fea75056b1d05469987124ef7ff5cf46'},\n];"
replacement = anchor[:-2] + (" {url:new URL('../source-profiles/project-ingress-native-boundary/source-rules.json',import.meta.url),\n"
                            f"   sha256:'{digest}'" + '},\n];')
assert history.count(anchor) == 1
history_after = history.replace(anchor, replacement, 1)
test_path = Path('tools/translation/test/project-ingress-native-boundary.test.mjs')
test = Path('experiments/issue-784/project-ingress-native-boundary.test.mjs.txt').read_text()
assert test.startswith('// Draft only:')
test = test.split('\n', 1)[1]

# Recheck every complete predecessor before authoring the coherent source batch.
assert producer_path.read_text() == producer
assert history_path.read_text() == history
assert not profile_path.exists()
assert not test_path.exists() or test_path.read_text() == test
profile_path.parent.mkdir()
profile_path.open('xb').write(raw)
(profile_path.parent / 'NOTICE.md').write_text(
    'Authored Router source rules, under the repository license.\n'
    'The complete predecessor and inverse remain in the source proposal.\n'
    'This layer preserves the original native refusal before graph discovery;\n'
    'it grants no semantic authority or executable coverage.\n')
producer_path.write_text(after)
history_path.write_text(history_after)
test_path.write_text(test)
print(json.dumps(dict(profile=str(profile_path), sha256=digest,
                      projectInstalled=False, nativeGrammarChecked=False,
                      concreteSyntaxChecked=False, receivingTestsRun=False,
                      productionExecutableGain=0), indent=2))
