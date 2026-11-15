"""Retain the complete CST composer's source history for the new native batches.

Only authored profiles and the new author driver change here. Existing compiler
sources and their four output copies change through their genuine producers.
"""
import gzip
import hashlib
import json
from pathlib import Path

base = Path('ci-logs/issue-784-restart-2')
packet = json.loads(gzip.decompress((base / 'candidate-binding-batches-v3-draft.json.gz').read_bytes()))
path = 'tools/translation/prepare-whole-owner-source-cst-batch.mjs'
before = Path(path).read_text()
sha = lambda raw: hashlib.sha256(raw).hexdigest()
originals = next(line for line in before.splitlines() if line.startswith('const originals='))
updated = originals
for row in packet['files']:
    old, new = row['profile']['beforeSha256'], row['profile']['afterSha256']
    if old in originals:
        assert updated.count(old) == 1
        updated = updated.replace(old, new, 1)
assert updated != originals
anchor = ' const before=whole.parameters[1].name.getText(file),language='
registration = (" const nativeRegistration=ts.isObjectLiteralExpression(native.initializer)?"
                "one(body.filter(node=>ts.isExpressionStatement(node)&&node.getText(file)==="
                "'bindingCandidates.push({path:resolve(root,path),source:after,result:nativeBindings});'),"
                "'complete invocation-local native registration').getText(file):'';\n")
raw_before = ".join(',')+';\\nconst __ownerCstRecord='"
raw_after = ".join(',')+';\\n'+nativeRegistration+'\\nconst __ownerCstRecord='"
finish_before = "replacement:'finishWholeOwnerSourceCstBatch({root,inputs,files,pending:__ownerCstPending,count:'+count+'});\\n'"
finish_after = ("replacement:(nativeRegistration?'const __ownerNativeBindings="
                "verifyNativeCopiedModuleBindings(ts,bindingCandidates);for(let at=0;"
                "at<bindingCandidates.length;at++)Object.assign(bindingCandidates[at].result,"
                "__ownerNativeBindings[at]);\\n':'')+'finishWholeOwnerSourceCstBatch("
                "{root,inputs,files,pending:__ownerCstPending,count:'+count+'});\\n'")
edits = [dict(id='router.candidate-binding-batch.cst-composer-inputs.v1', before=originals, after=updated),
         dict(id='router.candidate-binding-batch.cst-composer-registration.v1', before=anchor, after=registration+anchor),
         dict(id='router.candidate-binding-batch.cst-composer-retain-registration.v1', before=raw_before, after=raw_after),
         dict(id='router.candidate-binding-batch.cst-composer-native-before-cst.v1', before=finish_before, after=finish_after)]
after = before
for edit in edits:
    assert after.count(edit['before']) == 1, edit['id']
    after = after.replace(edit['before'], edit['after'], 1)
inverse = after
for edit in reversed(edits):
    assert inverse.count(edit['after']) == 1
    inverse = inverse.replace(edit['after'], edit['before'], 1)
assert inverse == before
profile = dict(schema='pinned-repository-source-evolution-v1', path=path,
               phase='repository', beforeSha256=sha(before.encode()), afterSha256=sha(after.encode()),
               edits=edits, sourceAuthority=False, semanticAuthority=False,
               runtimeAuthority=False, productionExecutableGain=0)
packet['files'].append(dict(path=path, before=before, after=after, profile=profile))
raw = json.dumps(packet, separators=(',', ':')).encode()
with (base / 'candidate-binding-batches-v4-draft.json.gz').open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
directory = Path('tools/translation/source-profiles/candidate-binding-batches')
manifest_path = directory / 'manifest.json'
old_manifest = manifest_path.read_bytes()
manifest = json.loads(old_manifest)
original = before.encode()
archive = gzip.compress(original, mtime=0)
rules = (json.dumps(profile, indent=2)+'\n').encode()
stem = Path(path).stem.removeprefix('prepare-')
archive_name, rules_name = stem+'.original.mjs.gz', stem+'.rules.json'
for name, content in [(archive_name, archive), (rules_name, rules)]:
    with (directory / name).open('xb') as stream:
        stream.write(content)
manifest['sources'].append(dict(path=path, archive=archive_name, archiveBytes=len(archive),
                               archiveSha256=sha(archive), bytes=len(original), sha256=sha(original),
                               rules=rules_name, rulesSha256=sha(rules)))
new_manifest = (json.dumps(manifest, indent=2)+'\n').encode()
manifest_path.write_bytes(new_manifest)
driver = Path('tools/translation/prepare-candidate-binding-batches.mjs')
text = driver.read_text()
assert text.count(sha(old_manifest)) == 1 and text.count('manifest.sources.length!==7') == 1
driver.write_text(text.replace(sha(old_manifest), sha(new_manifest), 1)
                 .replace('manifest.sources.length!==7', 'manifest.sources.length!==8', 1))
print(json.dumps(dict(manifestSha256=sha(new_manifest), sourceFiles=8,
                     sourceInstalled=False, afterSha256=profile['afterSha256'])))
