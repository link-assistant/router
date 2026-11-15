// Replay complete fixed-phase source proposals independently before installation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {REVERSE_SHARD_LANGUAGE_RULES,REVERSE_SHARD_REPOSITORY_RULES} from '../../scripts/prepare-bun-reverse-shard.mjs';
import {proposeMatrixDraftWorkflow,MATRIX_DRAFT_LANGUAGE_RULES,MATRIX_DRAFT_REPOSITORY_RULES} from '../../scripts/prepare-matrix-draft-workflow.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
const mode=process.argv[2];assert.ok(['coordinator','workflow'].includes(mode));
assert.equal(process.argv.length,3);
const base=resolve('ci-logs/issue-784-restart-2'),hash=value=>createHash('sha256').update(value).digest('hex');
const proposal=mode==='coordinator'?JSON.parse(gunzipSync(readFileSync('/tmp/router-issue-784-reverse-shard-coordinator/complete-source-proposal.json.gz'),{maxOutputLength:16*1024*1024})):proposeMatrixDraftWorkflow();
const target=mode==='coordinator'?'scripts/run-bun-reverse-shard.mjs':'.github/workflows/javascript-first.yml';
const original=mode==='coordinator'?'scripts/run-bun-reverse-files.mjs':target;
const preimage=readFileSync(original,'utf8');
assert.equal(preimage,execFileSync('git',['show','b63dd5a337c4e17f9df51f9ce866cb73fdea7662:'+original],{encoding:'utf8'}));
if(mode==='coordinator')assert.equal(proposal.before,preimage);
const rules=mode==='coordinator'?[REVERSE_SHARD_LANGUAGE_RULES,REVERSE_SHARD_REPOSITORY_RULES]:[MATRIX_DRAFT_LANGUAGE_RULES,MATRIX_DRAFT_REPOSITORY_RULES];
const ts=ownershipCompiler(),require=createRequire(new URL('../../scripts/ci/package.json',import.meta.url)),yaml=require('yaml');
function check(source,wire){
 if(mode==='coordinator'){
  assert.equal(transportConcreteSyntaxMeta(wire).source,source);
  const fresh=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document);
  assert.equal(fresh,wire);assert.equal(transportConcreteSyntaxMeta(fresh).source,source);
  assert.equal(ts.createSourceFile('whole-reverse-shard.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length,0);
 }else{
  const meta=JSON.parse(wire);assert.equal(meta.source,source);assert.equal(meta.tokens.map(token=>yaml.CST.stringify(token)).join(''),source);
  assert.equal(yaml.parseDocument(source,{version:'1.2',uniqueKeys:true}).errors.length,0);
  assert.equal(JSON.stringify({source,tokens:[...new yaml.Parser().parse(source)]}),wire);
 }
}
let source=proposal.before;assert.deepEqual(proposal.stages.map(row=>row.phase),['language','repository']);
for(const [at,phase]of ['language','repository'].entries()){
 const stage=proposal.stages[at];assert.equal(stage.before,source);check(source,stage.beforeMeta);
 for(const row of rules[at]){assert.equal(source.split(row.before).length,2,row.id);source=source.replace(row.before,()=>row.after);}
 assert.equal(source,stage.after);check(source,stage.afterMeta);
}
assert.equal(source,proposal.after);
for(const row of rules.flat().reverse()){assert.equal(source.split(row.after).length,2,row.id);source=source.replace(row.after,()=>row.before);}
assert.equal(source,proposal.before);assert.equal(proposal.inverse,source);assert.equal(proposal.semanticAuthority,false);
const receipt={schema:'complete-reverse-shard-independent-source-review-v1',mode,target,original,installedPreimage:mode==='coordinator'?null:preimage,proposal,completeInverse:source,sourceAuthority:false,runtimeParity:false,rustExecuted:false};
const bytes=Buffer.from(JSON.stringify(receipt)+'\n'),path=resolve(base,'reverse-shard-'+mode+'-complete-source-review.json.gz');
writeFileSync(path,gzipSync(bytes),{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(path)),bytes);
assert.equal(readFileSync(original,'utf8'),preimage);
writeFileSync(target,proposal.after,mode==='coordinator'?{flag:'wx'}:undefined);assert.equal(readFileSync(target,'utf8'),proposal.after);
console.log(JSON.stringify({mode,completePhases:2,completeInverse:true,proposalSha256:hash(JSON.stringify(proposal)),receiptSha256:hash(bytes),installed:true,runtimeParity:false}));
