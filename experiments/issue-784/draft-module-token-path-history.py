"""Compose the genuine complete derive-effect successor without changing its tests."""
import gzip
import hashlib
import json
from pathlib import Path
import tarfile

base = Path('ci-logs/issue-784-restart-2')
archive = Path('docs/case-studies/issue-784/evidence/derive-effects-history-20261110.tar.gz')
member = str(base / 'derive-effects-history-source-draft.json.gz')
with gzip.open(archive.with_suffix('.receipt.json.gz'), 'rb') as stream:
    receipt = json.load(stream)
sha = lambda data: hashlib.sha256(data).hexdigest()
assert sha(archive.read_bytes()) == receipt['sha256']
with tarfile.open(archive, 'r:gz') as packed:
    payload = packed.extractfile(member).read()
identity = next(row for row in receipt['members'] if row['path'] == member)
assert len(payload) == identity['bytes'] and sha(payload) == identity['sha256']
raw = gzip.decompress(payload)
history = json.loads(raw)
assert len(history['files']) == 1
row = history['files'][0]
assert row['path'] == 'tools/translation/test/derive-output-effects.test.mjs'
assert row['after'] == Path(row['path']).read_text()
assert row['beforeSha256'] == sha(row['before'].encode())
assert row['afterSha256'] == sha(row['after'].encode())
profile = Path('tools/translation/source-profiles/module-token-path-reentry')
profile.mkdir(exist_ok=False)
(profile / 'complete-authored-history.json.gz').write_bytes(payload)
(profile / 'NOTICE').write_text(
    'Complete Router derive-output-effects receiving source before and after its\n'
    '2026-11-10 path-index reentry. Original source and pins remain unchanged.\n'
    'Copyright Router contributors. Licensed under the repository LICENSE.\n'
    'Source: docs/case-studies/issue-784/evidence/derive-effects-history-20261110.tar.gz\n'
)
manifest = dict(schema='module-token-path-reentry-source-profile-v1',
                sourceArchive=str(archive), sourceArchiveSha256=receipt['sha256'],
                member=member, compressedSha256=sha(payload),
                completeJsonSha256=sha(raw), path=row['path'],
                beforeSha256=row['beforeSha256'], afterSha256=row['afterSha256'],
                sourceAuthority=False, runtimeAuthority=False)
(profile / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')

path = Path('tools/translation/module-token-receiving-evolution.mjs')
before = path.read_text()
after = before.replace("import {createHash} from 'node:crypto';",
    "import {createHash} from 'node:crypto';\nimport {readFileSync} from 'node:fs';\nimport {gunzipSync} from 'node:zlib';")
anchor = " if(current!==original&&current!==after)fail('unregistered complete receiving successor');"
assert after.count(anchor) == 1
insert = ''' const packed=readFileSync(new URL('./source-profiles/module-token-path-reentry/complete-authored-history.json.gz',import.meta.url));
 if(hash(packed)!==COMPRESSED_SHA)fail('complete authored history container differs');
 const raw=gunzipSync(packed,{maxOutputLength:262144});
 if(hash(raw)!==JSON_SHA)fail('complete authored history differs');
 const authored=JSON.parse(raw),later=authored.files[0];
 if(authored.schema!=='complete-derive-effects-history-author-draft-v1'||authored.files.length!==1||later.path!==PATH||later.before!==after||hash(later.before)!==BEFORE_SHA||hash(later.after)!==AFTER_SHA)fail('complete authored predecessor/successor differs');
 const laterFile=grammar(ts,later.after),blocks=[];
 function findBlock(node){if(ts.isIfStatement(node)&&node.expression.getText(laterFile)==="path==='tools/translation/derive-footprints.mjs'")blocks.push(node);ts.forEachChild(node,findBlock);}
 findBlock(laterFile);const block=one(blocks,'complete path-index inverse block');
 const addedImport=one(laterFile.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='../prepare-derive-path-index-reentry.mjs'),'complete path-index producer import');
 const anchor="if(path==='tools/translation/source-module-views.mjs'){";
 if(afterStatement.split(anchor).length!==2)fail('one receiving statement insertion required');
 const replacement=afterStatement.replace(anchor,block.getText(laterFile)+'\\n  '+anchor);
 const composedSelection={...selection,replacement};
 const composedLanguage=original.slice(0,selection.span[0])+replacement+original.slice(selection.span[1]);
 const composedFile=grammar(ts,composedLanguage),proofImport=one(composedFile.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./fixtures/facade-ast-receiving-history.mjs'),'complete original proof import');
 const pathImportEdit={span:[proofImport.end,proofImport.end],expected:'',replacement:'\\n'+addedImport.getText(laterFile)};
 const repositoryEdits=[importEdit,pathImportEdit];let composedAfter=composedLanguage;
 for(const edit of repositoryEdits.slice().sort((a,b)=>b.span[0]-a.span[0]))composedAfter=composedAfter.slice(0,edit.span[0])+edit.replacement+composedAfter.slice(edit.span[1]);
 if(composedAfter!==later.after)fail('complete composed successor differs');grammar(ts,composedAfter);
 if(current!==original&&current!==composedAfter)fail('unregistered complete receiving successor');'''
for marker, value in [('COMPRESSED_SHA',sha(payload)),('JSON_SHA',sha(raw)),
                      ('BEFORE_SHA',row['beforeSha256']),('AFTER_SHA',row['afterSha256'])]:
    insert = insert.replace(marker, repr(value))
after = after.replace(anchor, insert)
old_return = """ return {schema:'module-token-receiving-evolution-v1',path:PATH,original,current,language,after,inverse:original,originalSha256:ORIGINAL,currentSha256:hash(current),afterSha256:hash(after),nativeSelections:[selection,importEdit],
  stages:[stage(original,language,'language',[selection]),stage(language,after,'repository',[importEdit])],sourceAuthority:false,runtimeAuthority:false};"""
new_return = """ return {schema:'module-token-receiving-evolution-v1',path:PATH,original,current,language:composedLanguage,after:composedAfter,inverse:original,originalSha256:ORIGINAL,currentSha256:hash(current),afterSha256:hash(composedAfter),nativeSelections:[selection,importEdit],
  historicalModuleToken:{language,after,nativeSelections:[selection,importEdit]},
  laterSourceEvolution:{...authored,original:later.before,inverse:later.before,selectedBlock:{span:[block.getStart(laterFile),block.end],source:block.getText(laterFile)},selectedImport:{span:[addedImport.getStart(laterFile),addedImport.end],source:addedImport.getText(laterFile)}},
  composedNativeSelections:[composedSelection,...repositoryEdits],
  stages:[stage(original,composedLanguage,'language',[composedSelection]),stage(composedLanguage,composedAfter,'repository',repositoryEdits)],sourceAuthority:false,runtimeAuthority:false};"""
assert after.count(old_return) == 1
after = after.replace(old_return,new_return)
proposal = dict(schema='complete-module-token-path-history-source-draft-v1',
                files=[dict(path=str(path),before=before,after=after,
                            beforeSha256=sha(before.encode()),afterSha256=sha(after.encode()))],
                originalPinsChanged=False,originalDeadlinesChanged=False,
                productionExecutableGain=0,profile=manifest)
output = base / 'module-token-path-history-source-draft.json.gz'
encoded = json.dumps(proposal).encode()
with output.open('xb') as stream:
    stream.write(gzip.compress(encoded,mtime=0))
assert gzip.decompress(output.read_bytes()) == encoded
print(json.dumps(dict(output=str(output),sha256=sha(encoded),bytes=len(encoded),profile=manifest)))
