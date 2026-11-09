import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync,symlinkSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {retainBulkDraft} from '../bulk-draft-custody.mjs';
import {regenerate} from '../bulk.mjs';
import {regenerateWithDraftCustody} from '../bulk-with-draft-custody.mjs';
import {prepareBulkDraftCustody,assertBulkDraftCompanionsFresh} from '../prepare-bulk-draft-custody.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'router-bulk-custody-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const expected=new Map([['ts/generated/a.ts','export const text="λ";\r\n'],['parity/inventory.json','{"runtimeParity":false}\n']]);
 const outputs=Array.from(expected,([path,text])=>({path,bytes:Buffer.byteLength(text),sha256:hash(text)}));
 return {root,expected,plan:{outputs,expectedBytes:outputs.reduce((sum,row)=>sum+row.bytes,0)},inputs:{head:null},directory:'js/node_modules/.bulk-drafts'};
}
test('complete custody retains Unicode and line endings without installing or qualifying outputs',t=>{
 const value=fixture(t),attempt=retainBulkDraft(value),record=JSON.parse(readFileSync(join(attempt,'manifest.json')));
 assert.equal(record.schema,'unqualified-complete-bulk-draft-v1');assert.deepEqual(record.plan,value.plan);assert.deepEqual(record.inputs,value.inputs);
 assert.equal(record.members.length,value.expected.size);assert.equal(record.completeBytes,value.plan.expectedBytes);
 for(const key of ['semanticAuthority','sourceAuthority','privatePlanAuthority','runtimeParity','rustExecuted'])assert.equal(record[key],false);
 for(const row of record.members){
  const packed=readFileSync(join(attempt,row.storedAs)),bytes=gunzipSync(packed);
  assert.equal(packed.length,row.storedBytes);assert.equal(hash(packed),row.storedSha256);
  assert.deepEqual(bytes,Buffer.from(value.expected.get(row.path)));assert.equal(hash(bytes),row.sha256);
  assert.equal(existsSync(join(value.root,row.path)),false);
 }
});
test('incomplete, corrupt, unsafe and changed-input attempts fail without partial custody',t=>{
 const value=fixture(t),[first,second]=value.expected;
 const cases=[
  {...value,expected:[first]},
  {...value,expected:[first,first]},
  {...value,expected:[first,[second[0],'changed']]},
  {...value,expected:[first,[second[0],'\ud800']]},
  {...value,expected:[['../outside','text']]},
  {...value,plan:{...value.plan,expectedBytes:0}},
  {...value,plan:{...value.plan,outputs:[...value.plan.outputs,value.plan.outputs[0]]}},
  {...value,verifyFresh(){throw Error('original input changed');}},
 ];
 for(const input of cases){assert.throws(()=>retainBulkDraft(input));assert.deepEqual(readdirSync(join(value.root,value.directory)),[]);}
 assert.equal(existsSync(join(value.root,'outside')),false);
});
test('custody refuses external, generated and linked destinations',t=>{
 const value=fixture(t);
 for(const directory of [undefined,'../outside','ts/generated',value.root])assert.throws(()=>retainBulkDraft({...value,directory}),/require js/);
 mkdirSync(join(value.root,'js'));symlinkSync(tmpdir(),join(value.root,'js/node_modules'),'dir');
 assert.throws(()=>retainBulkDraft(value),/symbolic links/);
});
test('actual canonical generation keeps every freshness failure while retaining every computed output',{timeout:60000},t=>{
 const value=fixture(t);mkdirSync(join(value.root,'src'));writeFileSync(join(value.root,'src/lib.rs'),'pub fn twice(value: i64) -> i64 { value + value }\n');
 const options={root:value.root,sources:['src/lib.rs'],entries:['src/lib.rs'],check:true};
 const original=regenerate(options);assert.equal(existsSync(join(value.root,value.directory)),false);
 const retained=regenerateWithDraftCustody({...options,draftDirectory:value.directory});
 assert.ok(original.failures.length);assert.deepEqual(retained.failures,original.failures);assert.deepEqual(retained.manifest,original.manifest);
 const record=JSON.parse(readFileSync(join(retained.draft,'manifest.json')));
 assert.equal(record.members.length,record.plan.outputs.length);assert.ok(record.members.length>6);
 assert.equal(record.completeBytes,record.plan.expectedBytes);assert.equal(record.inputs.corpus.sources[0].source,'src/lib.rs');
 assert.equal(record.inputs.typescript.find(row=>row.path==='package.json')?.sha256,hash(readFileSync(new URL('../../../js/node_modules/typescript/package.json',import.meta.url))));
 for(const row of record.members){const bytes=gunzipSync(readFileSync(join(retained.draft,row.storedAs)));assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);assert.equal(existsSync(join(value.root,row.path)),false);}
 const attempts=readdirSync(join(value.root,value.directory));
 assert.throws(()=>regenerateWithDraftCustody({...options,check:false,draftDirectory:value.directory}),/requires the original freshness check/);
 assert.deepEqual(readdirSync(join(value.root,value.directory)),attempts);
});
test('actual source mutation during generation prevents retaining or installing stale outputs',{timeout:60000},t=>{
 const value=fixture(t);mkdirSync(join(value.root,'src'));const source=join(value.root,'src/lib.rs');writeFileSync(source,'pub fn answer() -> i64 { 42 }\n');
 let changed=false;
 assert.throws(()=>regenerateWithDraftCustody({root:value.root,sources:['src/lib.rs'],entries:['src/lib.rs'],check:true,draftDirectory:value.directory,
  progress(record){if(!changed&&record.stage==='plan'&&record.state==='end'){writeFileSync(source,'pub fn answer() -> i64 { 43 }\n');changed=true;}}
 }),/inputs changed/);
 assert.equal(changed,true);assert.equal(existsSync(join(value.root,value.directory)),false);
 assert.equal(existsSync(join(value.root,'parity')),false);
});
test('whole bulk and CLI sources retain both CST phases, native copies and complete inverses',{timeout:60000},()=>{
 const result=prepareBulkDraftCustody();assert.equal(result.typescriptVersion,'5.9.3');assert.equal(result.originalRegenerateBodyChanged,false);
 assert.equal(result.files.length,2);
 assert.equal(result.originals.length,2);assert.equal(assertBulkDraftCompanionsFresh(),true);
 for(const row of result.originals)assert.equal(readFileSync(row.path,'utf8'),row.source,'complete original source stays unchanged');
 for(const row of result.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.nativeCopies.length,2);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
 assert.equal(result.semanticAuthority,false);assert.equal(result.runtimeParity,false);
});
