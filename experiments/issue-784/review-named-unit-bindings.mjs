// Independently inspect the complete producer proposal before installation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {prepareNamedCoreProducers} from '../../tools/translation/prepare-named-core-producers.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings,verifyNativeCopiedModuleBindings} from '../../tools/translation/source-copy-native-bindings.mjs';
const output='ci-logs/issue-784-restart-2/current-named-unit-bindings-proposal.json.gz';
const hash=value=>createHash('sha256').update(value).digest('hex');
const plan=prepareNamedCoreProducers(),ts=ownershipCompiler();
assert.equal(ts.version,'5.9.3');assert.equal(plan.files.length,2);
for(const row of plan.files){
  assert.equal(readFileSync(row.path,'utf8'),row.precedingAfter);
  let middle=row.before;
  for(const edit of [...row.nativeEdits].sort((a,b)=>b.span[0]-a.span[0])){
    assert.equal(middle.slice(...edit.span),edit.expected);
    middle=middle.slice(0,edit.span[0])+edit.replacement+middle.slice(edit.span[1]);
  }
  assert.equal(middle,row.middle);assert.equal(row.equation.inverse,row.before);
  for(const stage of row.equation.stages){
    assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
    assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
    assert.equal(stage.inverse,stage.before);
  }
  const file=ts.createSourceFile(row.path,row.after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  assert.deepEqual(file.parseDiagnostics,[]);
}
const candidates=plan.files.map(row=>({path:resolve(row.path),source:row.after}));
assert.deepEqual(verifyNativeCopiedModuleBindings(ts,candidates),
  candidates.map(row=>verifyNativeCopiedSourceBindings(ts,row.path,row.source)));
const raw=Buffer.from(JSON.stringify({schema:'reviewed-named-unit-bindings-v1',plan,
  nativeEditReplayPassed:true,completeCstRoundTripsPassed:true,nativeScopeComparisonPassed:true,
  semanticAuthority:false,receivingPassed:false}));
const packed=gzipSync(raw,{level:6,mtime:0});writeFileSync(output,packed,{flag:'wx'});
assert.deepEqual(gunzipSync(readFileSync(output)),raw);
console.log(JSON.stringify({output,decodedBytes:raw.length,decodedSha256:hash(raw),
  compressedBytes:packed.length,compressedSha256:hash(packed),
  files:plan.files.map(row=>({path:row.path,beforeSha256:hash(row.current),afterSha256:hash(row.after)})),
  receivingPassed:false}));
