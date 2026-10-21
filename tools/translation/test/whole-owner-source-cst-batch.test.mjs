import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {prepareWholeOwnerSourceCstBatch,wholeOwnerCstBatchImportChanges,WHOLE_OWNER_CST_BATCH_SOURCE_PATHS} from '../prepare-whole-owner-source-cst-batch.mjs';
import {prepareWholeOwnerDeriveCandidate as oldEight} from '../prepare-whole-owner-derive-candidate.mjs';
import {prepareWholeOwnerDeriveCandidate as nextEight} from '../cst-batched-whole-owner-derive-producer.mjs';
import {prepareWholeOwnerResolverCandidate as oldThree} from '../prepare-whole-owner-resolver-candidate.mjs';
import {prepareWholeOwnerResolverCandidate as nextThree} from '../cst-batched-whole-owner-resolver-producer.mjs';
import {deriveBatchedProofByteAdapterSources} from '../prepare-batched-proof-byte-source-candidate.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/',read=path=>readFileSync(resolve(ROOT,path),'utf8'),wire=value=>JSON.parse(JSON.stringify(value));

test('all four whole native source copies retain both CST phases every input and independent native inverses',{timeout:60000},()=>{
 const plan=prepareWholeOwnerSourceCstBatch();assert.equal(plan.files.length,4);assert.equal(plan.performanceQualified,false);assert.equal(plan.originalDefaultsUnchanged,true);assert.equal(plan.sourceAuthority,false);
 for(const row of plan.inputs)assert.equal(read(row.path),row.source);
 for(const [index,row]of plan.files.entries()){assert.equal(row.path,WHOLE_OWNER_CST_BATCH_SOURCE_PATHS[index]);assert.equal(row.current,row.after);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.inverse,row.before);assert.equal(row.selection.independentNativeWholeInverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepEqual(row.stages.map(value=>value.phase),['language','repository']);assert.ok(row.stages.every(value=>value.completeInverse));if(index<2){assert.equal(row.selection.completeRows,index===0?8:3);assert.equal(row.selection.originalFallbackBeforeGroupedWork,true);assert.equal(row.selection.nativeFilesSymbolChecked,true);}else{assert.equal(row.selection.importOnly,true);assert.equal(row.before,row.language);}}
});

test('the complete eight original source rows including full native bindings CST traces and inverses match',{timeout:60000},()=>{
 const names=['input','$_','lastMatch','$&','lastParen','$+','leftContext','$`','rightContext',"$'",...Array.from({length:9},(_,index)=>'$'+(index+1))],capture=()=>Object.fromEntries(names.map(name=>[name,RegExp[name]]));/whole(owner)/u.exec('wholeowner');const expected=wire(oldEight()),oldRegExp=capture();/whole(owner)/u.exec('wholeowner');const actual=wire(nextEight()),newRegExp=capture();assert.deepStrictEqual(newRegExp,oldRegExp);assert.equal(actual.files.length,8);assert.deepStrictEqual(actual,expected);const changed=wire(actual);changed.files[4].changes.semantic.push({foreign:true});assert.notDeepStrictEqual(changed,expected);
 for(const row of actual.files){assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.inverse,row.before);}
});

test('the complete three resolver rows and nested whole eight-producer result match every original field',{timeout:60000},()=>{
 const expected=wire(oldThree()),actual=wire(nextThree());assert.equal(actual.files.length,3);assert.equal(actual.wholeOwnerProducer.files.length,8);assert.deepStrictEqual(actual,expected);const changed=wire(actual);changed.wholeOwnerProducer.inputs[0].base64+='A';assert.notDeepStrictEqual(changed,expected);
});

test('late Hash and JSON hooks take the exact complete original source pipeline in independent cold processes',{timeout:60000},()=>{
 for(const hook of ['Hash','JSON']){const captures=[];for(const which of ['old','next']){const child=spawnSync(process.execPath,[fileURLToPath(new URL('./fixtures/whole-owner-source-cst-batch-hook-child.mjs',import.meta.url)),which,hook],{encoding:'utf8',timeout:12500,maxBuffer:64*1024*1024});assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);captures.push(child.stdout);}assert.equal(captures[1],captures[0]);const full=JSON.parse(captures[0]);assert.equal(full.ready,false);if(hook==='Hash'){assert.equal(full.error,null);assert.equal(full.result.files.length,8);assert.ok(full.tape.length>0);}else assert.ok(full.error||full.result);}
});

test('only exact current original producer source and native module bindings admit the new routing layer',{timeout:60000},()=>{
 const root=mkdtempSync(resolve(tmpdir(),'whole-owner-cst-source-corruption-'));try{for(const path of ['prepare-whole-owner-derive-candidate.mjs','prepare-whole-owner-resolver-candidate.mjs','prepare-whole-owner-core-producer-candidate.mjs','prepare-whole-owner-core-corpus-candidate.mjs']){const target=resolve(root,BASE+path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,read(BASE+path));}const target=resolve(root,BASE+'prepare-whole-owner-resolver-candidate.mjs');writeFileSync(target,read(BASE+'prepare-whole-owner-resolver-candidate.mjs')+'\n');assert.throws(()=>prepareWholeOwnerSourceCstBatch({root}),/complete original producer source differs/);}finally{rmSync(root,{recursive:true,force:true});}
 const ts=ownershipCompiler(),source=read(BASE+'prepare-whole-owner-core-producer-candidate.mjs'),file=ts.createSourceFile('actual.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),edits=wholeOwnerCstBatchImportChanges(ts,file,'resolver');assert.equal(edits.length,1);assert.equal(source.slice(...edits[0].span),edits[0].expected);const foreign=ts.createSourceFile('foreign.mjs',source.replace('./prepare-whole-owner-resolver-candidate.mjs','./foreign.mjs'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.throws(()=>wholeOwnerCstBatchImportChanges(ts,foreign,'resolver'));
 const row=deriveBatchedProofByteAdapterSources().files.find(value=>value.path===BASE+'prepare-proof-byte-core-stream-candidate.mjs');assert.equal(row.selection.upstreamBatchLayer,true);assert.notEqual(row.after,row.dispatcherOnly);assert.equal(row.selection.independentNativeInverse,row.before);assert.equal(row.selection.allOriginalHashCallSitesRetained,true);assert.ok(row.after.includes('./cst-batched-whole-owner-corpus-producer.mjs'));assert.ok(row.dispatcherOnly.includes('./prepare-whole-owner-core-corpus-candidate.mjs'));
});
