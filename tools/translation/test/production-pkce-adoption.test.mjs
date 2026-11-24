// Independent source/provenance regression SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareProductionPkceAdoptionSources} from '../prepare-production-pkce-adoption-sources.mjs';
import {prepareProductionPkceSourceHistory} from '../prepare-production-pkce-source-history.mjs';
import {prepareProductionCoreBase64AdoptionSources} from '../prepare-production-core-base64-adoption-sources.mjs';
import {preparePinnedRustSourceRecipe} from '../pinned-rust-source-recipe.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),limits={timeout:60000};
const archive='tools/translation/source-profiles/production-pkce-adoption/complete-production-originals-and-rules.json.gz',profile=JSON.parse(gunzipSync(readFileSync(join(root,archive))).toString('utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');
function fixture(change,run){
 const temporary=mkdtempSync(join(tmpdir(),'router-pkce-source-'));
 try{
  const data=structuredClone(profile);change?.(data);for(const row of [...data.guards,...data.files]){const path=join(temporary,row.path);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,Object.hasOwn(row,'source')?row.source:readFileSync(join(root,row.path),'utf8'));}
  const bytes=gzipSync(JSON.stringify(data)),path=join(temporary,archive);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,bytes);return run({root:temporary,archive,pin:sha(bytes),id:data.id,targetPrefix:'crate::translation_text_core::'},data);
 }finally{rmSync(temporary,{recursive:true,force:true});}
}
test('all three real PKCE calculations preserve complete original impl source and full current inverses',limits,()=>{
 const result=prepareProductionPkceAdoptionSources();assert.equal(result.files.length,2);assert.equal(result.files.flatMap(row=>row.selections).length,3);assert.equal(result.guards.length,3);
 for(const row of result.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);for(const edit of row.selections){assert.equal(edit.ownerKind,'impl');assert.equal(edit.operandRecipe,'scalar-text-sha256-base64url-fusion');assert.equal(edit.ownership,'borrow-text');assert.equal(edit.replacement,'crate::translation_text_core::sha256_base64_url_no_pad('+edit.replacementOperand+')');}}
 const nativeTestFile=result.files.find(row=>row.path==='rust/src/auth.rs');assert.ok(nativeTestFile.after.includes('Sha256::digest(verifier.as_bytes())'));assert.ok(nativeTestFile.after.includes('#[cfg(test)]\nuse sha2::{Digest, Sha256};'));assert.ok(nativeTestFile.after.includes('#[cfg(test)]\nuse base64::Engine as _;'));
 for(const name of ['semanticAuthority','namespaceAuthority','ownershipAuthority','executableAdmission','runtimeParity','receivingExecuted','crossInvocationCache'])assert.equal(result[name],false,name);
});
test('previous base64 proposals join the complete adjacent PKCE source rather than forgetting or rewriting history',limits,()=>{
 const previous=prepareProductionCoreBase64AdoptionSources(),next=prepareProductionPkceAdoptionSources(),old=previous.files.find(row=>row.path==='rust/src/claude_auth.rs'),current=next.files.find(row=>row.path===old.path);
 assert.equal(old.after,current.before);assert.equal(old.currentAfter,current.after);assert.equal(old.current,current.current);assert.equal(old.laterHistories.length,1);const history=old.laterHistories[0];assert.equal(history.before,old.after);assert.equal(history.after,current.after);assert.equal(history.equation.inverse,old.after);assert.equal(history.inverse,old.after);assert.equal(history.semanticAuthority,false);assert.equal(previous.descendantFiles.length,2);assert.equal(previous.guards.length,5);
});
test('fusion recipes refuse changed receiver field operand owner and destination rather than guessing source types',limits,()=>{
 const changes=[data=>{data.files[0].calls[0].replacementOperand='&different';},data=>{data.files[0].calls[0].operandRecipe='arbitrary';},data=>{data.files[0].calls[0].owner='DifferentOwner';},data=>{data.files[0].calls[0].replacement=data.files[0].calls[0].replacement.replace('sha256_base64_url_no_pad','other');},data=>{data.files[0].calls[0].operand='Sha256::digest(effect().as_bytes())';}];
 for(const change of changes)fixture(change,options=>assert.throws(()=>preparePinnedRustSourceRecipe(options),/source recipe/iu));
 fixture(null,options=>assert.throws(()=>preparePinnedRustSourceRecipe({...options,targetPrefix:'unqualified'}),/qualified repository/u));
});
test('all current native guard and source changes remain visible and every temporary source tree is cleaned',limits,()=>{
 fixture(null,options=>{const path=join(options.root,'rust/src/translation_text_core.rs');writeFileSync(path,readFileSync(path,'utf8')+'\n');assert.throws(()=>preparePinnedRustSourceRecipe(options),/operation source guard/u);});
 fixture(null,options=>{const path=join(options.root,'rust/src/auth.rs');writeFileSync(path,readFileSync(path,'utf8')+'\n');assert.throws(()=>preparePinnedRustSourceRecipe(options),/concurrent source/u);});
 fixture(null,options=>{let read=false;const plans=[];Object.defineProperty(plans,'0',{get(){read=true;throw Error('accessor');}});plans.length=1;assert.throws(()=>preparePinnedRustSourceRecipe({...options,laterPlans:plans}),/descendant own data/u);assert.equal(read,false);});
});
test('all four complete compiler source equations retain native original owners and both ordered phases',limits,()=>{
 const result=prepareProductionPkceSourceHistory();assert.equal(result.files.length,4);for(const row of result.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(result.receivingExecuted,false);assert.equal(result.semanticAuthority,false);
});
