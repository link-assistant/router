// Install only the complete current source producer's reviewed CLI afterimage.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {prepareOwnedFieldBulkSources,assertOwnedFieldBulkInputsFresh} from '../../tools/translation/prepare-owned-field-bulk.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedModuleBindings} from '../../tools/translation/source-copy-native-bindings.mjs';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';

const plan=prepareOwnedFieldBulkSources({root:resolve('.')});
assert.equal(plan.files.length,9);assert.equal(assertOwnedFieldBulkInputsFresh(plan),true);
const current=plan.files.map(row=>({path:row.path,source:readFileSync(row.path,'utf8')}));
const changed=plan.files.filter((row,at)=>row.text!==current[at].source);
assert.deepEqual(changed.map(row=>row.path),['scripts/translate-router-owned-field-meta.mjs']);
const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
const bindings=verifyNativeCopiedModuleBindings(ts,changed.map(row=>({path:resolve(row.path),source:row.text})));
const syntax=[];
for(const row of changed){
 assert.equal(row.inverse,row.source);assert.equal(bindings[0].nativeSemanticScopeChecked,true);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 assert.ok(row.text.includes('namespaceProgressObserver(record=>'));
 for(const [engine,args]of [[process.execPath,['--input-type=module','--check']],
  ['bun',['-e',"new Bun.Transpiler({loader:'js',target:'bun'}).scan(await Bun.stdin.text())"]]]){
  const result=spawnSync(engine,args,{input:row.text,encoding:'utf8',maxBuffer:1048576});
  assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr);
  assert.equal(result.signal,null);syntax.push({path:row.path,engine,args,...result});
 }
}
const raw=Buffer.from(JSON.stringify({schema:'complete-owned-field-CLI-refresh-v1',
 plan,current,bindings,syntax,typescriptVersion:ts.version,receivingQualified:false,
 originalBoundsChanged:false,productionExecutableGain:0}));
const output=writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/owned-cli-complete-source.json',raw);
assert.equal(assertOwnedFieldBulkInputsFresh(plan),true);
for(const row of current)assert.equal(readFileSync(row.path,'utf8'),row.source);
for(const row of changed)writeFileSync(row.path,row.text);
console.log(JSON.stringify({output,completeProposalBytes:raw.length,
 completeProposalSha256:createHash('sha256').update(raw).digest('hex'),
 changed:changed.map(row=>({path:row.path,sha256:row.sha256})),receivingQualified:false}));
