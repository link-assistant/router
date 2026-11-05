// Separate correction receiving SOURCE. No source/case has been executed.
import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {fileURLToPath} from 'node:url';
import {withReadonlySourceProfiles,readSourceProfileFileSync} from './ordered-text-map-callers-20261102-source-storage.mjs';
import {readonlySourceProfileReexportSourceData,proposeReadonlySourceProfileReexportSuccessors} from './ordered-text-map-callers-20261102-source-storage-reexport-profile.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),archive=join(root,'tools/translation/source-profiles/ordered-text-map-callers-20261102-source-storage-reexport/ordered-text-map-callers-20261102-source-storage-reexport-source-history.json.gz');
function results(){let getterCalls=0;const thenable=Object.defineProperty({},'then',{get(){getterCalls++;throw null;}});return {values:[Promise.resolve('unobserved'),thenable,new Proxy({},{})],calls:()=>getterCalls};}
test('absent storage and reused actual storage scopes enforce the same synchronous result boundary',{timeout:60000},()=>{
 const ordinary=mkdtempSync(join(tmpdir(),'readonly-physical-domain-'));try{for(const value of results().values)assert.throws(()=>withReadonlySourceProfiles(ordinary,()=>value));assert.equal(withReadonlySourceProfiles(ordinary,()=>23),23);}finally{rmSync(ordinary,{recursive:true});}
 const sample=results();withReadonlySourceProfiles(root,token=>{assert.ok(token);for(const value of sample.values)assert.throws(()=>withReadonlySourceProfiles(root,()=>value));assert.equal(withReadonlySourceProfiles(root,()=>31),31);});assert.equal(sample.calls(),0);
});
test('compressed read options are own DATA and accessor/proxy refusal does not invoke traps',{timeout:60000},()=>{
 let reads=0;for(const key of ['encoding','flag']){const options={};Object.defineProperty(options,key,{enumerable:true,get(){reads++;throw undefined;}});assert.throws(()=>readSourceProfileFileSync(archive,options));}const proxy=new Proxy({encoding:'utf8'},{get(){reads++;throw null;},ownKeys(){reads++;throw false;}});assert.throws(()=>readSourceProfileFileSync(archive,proxy));assert.equal(reads,0);
 const raw=readSourceProfileFileSync(archive);assert.deepEqual(readSourceProfileFileSync(archive,null),raw);assert.deepEqual(readSourceProfileFileSync(archive,{encoding:null,flag:'r'}),raw);assert.equal(readSourceProfileFileSync(archive,{encoding:'hex'}),raw.toString('hex'));assert.throws(()=>readSourceProfileFileSync(archive,{flag:'w'}));assert.throws(()=>readSourceProfileFileSync(archive,Object.create({encoding:'utf8'})));
});
test('complete source correction packet retains original sources, inverses and reparsed CST',{timeout:60000},()=>{
 const value=proposeReadonlySourceProfileReexportSuccessors(),rows=readonlySourceProfileReexportSourceData();assert.equal(value.files.length,6);assert.equal(rows.length,6);assert.equal(value.semanticAuthority,false);assert.equal(value.sourceInstalled,false);
 for(const row of value.files){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}assert.equal(readFileSync(join(root,row.path),'utf8'),row.after);}
});
