// Independent whole-source review before installing either generated output.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
const root=process.cwd(),base=resolve(root,'ci-logs/issue-784-restart-2');
const proposal=JSON.parse(readFileSync(resolve(base,'current-node-profile-proposal.log'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),ts=ownershipCompiler();
assert.equal(ts.version,'5.9.3');assert.equal(proposal.files.length,2);
assert.equal(proposal.originalProfilePreserved,true);assert.equal(proposal.privateIssuersUnchanged,true);
assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.performanceQualified,false);assert.equal(proposal.runtimeParity,false);
assert.deepEqual(proposal.profiles.map(row=>row.version),['20.19.4','20.20.2']);
for(const row of proposal.inputs){const bytes=readFileSync(resolve(root,row.path));assert.equal(bytes.toString('base64'),row.base64);assert.equal(hash(bytes),row.sha256);assert.equal(bytes.length,row.bytes);}
for(const profile of proposal.profiles)for(const row of profile.spans){const source=readFileSync(resolve(root,row.path),'utf8');assert.equal(source.slice(...row.span),row.source);assert.equal(row.source,profile.values[row.name]);assert.equal(source.split(row.source).length,2);}
function cst(source,wire){assert.equal(transportConcreteSyntaxMeta(wire).source,source);const fresh=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document);assert.equal(fresh,wire);assert.equal(transportConcreteSyntaxMeta(fresh).source,source);}
for(const row of proposal.files){
 cst(row.before,row.beforeMeta);cst(row.after,row.afterMeta);
 assert.equal(ts.createSourceFile(row.path,row.after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length,0);
 assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);
 let source=row.before;
 for(const [index,phase]of ['languageRules','repositoryRules'].entries()){
  assert.equal(row.sequence[phase].length,1);
  for(const rule of row.sequence[phase])for(const edit of rule.edits){assert.deepEqual(edit.span,[0,source.length]);assert.equal(edit.expected,source);source=source.slice(0,edit.span[0])+edit.replacement+source.slice(edit.span[1]);}
  assert.equal(source,index===0?row.language:row.after);
  assert.equal(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document)).source,source);
 }
 assert.equal(source,row.after);
 for(const phase of ['languageRules','repositoryRules'])for(const rule of row.inverseSequence[phase])for(const edit of rule.edits){assert.deepEqual(edit.span,[0,source.length]);assert.equal(edit.expected,source);source=edit.replacement;}
 assert.equal(source,row.before);assert.equal(source,row.inverse);
 if(row.path.endsWith('attribute-owner-bulk-crypto.mjs')){
  assert.equal(row.before,execFileSync('git',['show','308a3b861d9e44b2c6ffadb63d6e2b1bcf7d993f:'+row.path],{encoding:'utf8'}));
  assert.equal(hash(row.before),'9725a02c0c7111635f998cacfe213f529562da6cad41d1348e8702fdfc8831f9');
  assert.equal(readFileSync(resolve(root,row.path),'utf8'),row.before);
 }else assert.equal(existsSync(resolve(root,row.path)),false);
}
const result={schema:'complete-current-node-profile-independent-source-review-v1',proposal,sourceAuthority:false,runtimeParity:false,rustExecuted:false};
const bytes=Buffer.from(JSON.stringify(result)+'\n'),output=resolve(base,'current-node-profile-complete-source-review.json.gz');
writeFileSync(output,gzipSync(bytes),{flag:'wx'});assert.ok(gunzipSync(readFileSync(output)).equals(bytes));
for(const row of proposal.inputs)assert.equal(hash(readFileSync(resolve(root,row.path))),row.sha256);
for(const row of proposal.files){writeFileSync(resolve(root,row.path),row.after,existsSync(resolve(root,row.path))?undefined:{flag:'wx'});assert.equal(readFileSync(resolve(root,row.path),'utf8'),row.after);}
console.log(JSON.stringify({outputs:proposal.files.length,completePhases:2,completeInverse:true,receiptSha256:hash(bytes),installed:true,runtimeParity:false}));
