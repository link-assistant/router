import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {deriveProofScannerSourceEvolution} from '../proof-scanner-source-evolution.mjs';
import {prepareInvocationLocalFreezer,invocationLocalFreezerSourcePairs} from '../prepare-invocation-local-freezer.mjs';
import {prepareStaticSourceRelease} from '../prepare-static-source-release.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const hash=value=>createHash('sha256').update(value).digest('hex');
const producer='tools/translation/prepare-real-source-fixtures.mjs',consumer='tools/translation/test/static-source-lifecycle.test.mjs';
test('the complete scanner retains its original cost-store source through both declared evolutions',{timeout:60000},()=>{
 const current=read('private-native-proof-json.mjs'),row=deriveProofScannerSourceEvolution(current);
 assert.equal(row.current,current);assert.equal(row.original,invocationLocalFreezerSourcePairs()[1].after);
 assert.equal(hash(row.original),'b02892e676b928339f15d2a529d0467dfd60efedbe8e991df0910400289db338');
 assert.equal(hash(row.unguarded),'f23c8f96cddf92af07495e67622fd98d8b9bcf04b9ed62a78693ee7455ba027b');
 assert.equal(row.inverse,row.original);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}
 assert.equal(row.sourceAuthority,false);assert.equal(row.runtimeAuthority,false);
});
test('scanner evolution refuses unrelated bodies imports and modified eligibility code',{timeout:60000},()=>{
 const source=read('private-native-proof-json.mjs');
 for(const changed of [source+'\n// unrelated\n',source.replace("'./guarded-proof-lexing-intrinsics.mjs'","'./foreign.mjs'"),source.replace('try{return withinNativeBudget(value);}','try{return true;}')]){
  assert.notEqual(changed,source);assert.throws(()=>deriveProofScannerSourceEvolution(changed),/pin|lexing|source/u);
 }
});
test('the actual freezer producer rejoins both current complete sources and original inverses',{timeout:60000},()=>{
 const plan=prepareInvocationLocalFreezer();assert.equal(plan.files.length,2);
 for(const row of plan.files){assert.equal(row.before,row.after);assert.equal(row.after,read(row.path.slice('tools/translation/'.length)));assert.equal(row.inverse,row.original);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.original);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);}
 assert.equal(plan.files[1].sourceEvolution.original,invocationLocalFreezerSourcePairs()[1].after);
 assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.runtimeAuthority,false);
});
test('allocation imports preserve preceding genuine imports and every original function body',{timeout:60000},()=>{
 const plan=prepareStaticSourceRelease(),row=plan.files.find(row=>row.path===producer),ts=ownershipCompiler();
 assert.ok(row.before.startsWith("#!/usr/bin/env node\nimport {readSelectedGitSizeRecords}"));assert.equal(row.before,row.after);
 const functions=source=>{const file=ts.createSourceFile(producer,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);return file.statements.filter(ts.isFunctionDeclaration).map(node=>node.getText(file));};
 const originals=functions(row.original),installed=functions(row.after);assert.ok(originals.length>10);
 for(const definition of originals)assert.ok(installed.includes(definition),'complete original function bytes preserved');
 assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.original);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.inverse,row.original);
 assert.equal(plan.originalProducerBodyUnchanged,true);assert.equal(plan.originalLimitsUnchanged,true);assert.equal(plan.runtimeAuthority,false);
});
test('allocation preparation refuses duplicated separated or renamed generated imports',{timeout:60000},()=>{
 const source=read('prepare-real-source-fixtures.mjs'),receiving=read('test/static-source-lifecycle.test.mjs');
 const anchor="import {originalBatchedDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';\n";
 assert.equal(source.split(anchor).length,2);
 for(const changed of [source.replace(anchor,anchor+anchor),source.replace(anchor,anchor+'// separated allocation imports\n'),source.replace(anchor,anchor.replace('originalBatchedDataFreezeIntrinsicsUnchanged','foreignFreeze'))]){
  const root=mkdtempSync(join(tmpdir(),'router-producer-evolution-'));
  try{for(const [path,text]of [[producer,changed],[consumer,receiving]]){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),text);}assert.throws(()=>prepareStaticSourceRelease({root}),/allocation imports/u);}
  finally{rmSync(root,{recursive:true,force:true});}
 }
});
