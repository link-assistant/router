// Independent fixed-point orchestration SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const limits={timeout:60000},root=new URL('../',import.meta.url);
async function fixture(t,mode){
 const directory=mkdtempSync(join(tmpdir(),'router-fixed-point-controls-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));let source=readFileSync(new URL('source-bound-owned-core-fixed-point.mjs',root),'utf8');for(const name of ['cfg-profile.mjs','formatting-packet-io.mjs'])source=source.replace("'./"+name+"'",JSON.stringify(new URL(name,root).href));writeFileSync(join(directory,'runner.mjs'),source);
 const first=`export function proposeCoreIntegerMethodCorpus(options){const before={...options.files},after={...before};const source=before['src/lib.rs'];after['src/lib.rs']=${mode==='unstable'?"source+'x'":mode==='wrong'?"source+'x'":"source.includes('eligible')?source.replace('eligible','qualified'):source"};return {before:${mode==='wrong'?"{...before,'src/lib.rs':'wrong original'}":"before"},after,proposals:[],semanticAuthority:false};}`;
 const second="export function proposeCoreTextMethodCorpus(options){const before={...options.files},after={...before};after['src/lib.rs']=before['src/lib.rs'].replace('pending','eligible');return {before,after,proposals:[],semanticAuthority:false};}";writeFileSync(join(directory,'source-bound-owned-migrate-core-integer-methods.mjs'),first);writeFileSync(join(directory,'source-bound-owned-migrate-core-text-methods.mjs'),second);const api=await import(pathToFileURL(join(directory,'runner.mjs')).href),input={entry:'src/lib.rs',files:{'src/lib.rs':'pending'},dependencyInputs:{manifest:'',lock:''},stages:['integer-methods','text-methods']};return {api,input};
}
test('a later-stage prerequisite is revisited and only a complete unchanged round issues a receipt',limits,async t=>{
 const {api,input}=await fixture(t,'stable'),packets=[],result=await api.collectSourceBoundOwnedCoreFixedPoint(input,packet=>{packets.push({schema:packet.schema,round:packet.round,stage:packet.stage});});assert.equal(result.files['src/lib.rs'],'qualified');assert.equal(result.receipt.rounds,3);assert.equal(result.receipt.iterations,6);assert.equal(result.receipt.stabilized,true);assert.equal(result.receipt.coverageComplete,false);assert.equal(result.receipt.runtimeParity,false);assert.equal(result.executableAdmission,false);assert.deepEqual(result.stages.map(row=>[row.round,row.stage,row.changedFiles.length]),[[0,'integer-methods',0],[0,'text-methods',1],[1,'integer-methods',1],[1,'text-methods',0],[2,'integer-methods',0],[2,'text-methods',0]]);assert.equal(packets.at(-1).schema,'source-bound-owned-core-fixed-point-receipt-v1');assert.equal(input.files['src/lib.rs'],'pending');
});
test('four-round refusal emits no misleading complete receipt',limits,async t=>{
 const {api,input}=await fixture(t,'unstable'),schemas=[];await assert.rejects(()=>api.collectSourceBoundOwnedCoreFixedPoint(input,packet=>{schemas.push(packet.schema);}),/four-round/u);assert.equal(schemas.filter(schema=>schema==='source-bound-owned-core-fixed-point-stage-v1').length,8);assert.equal(schemas.includes('source-bound-owned-core-fixed-point-receipt-v1'),false);
});
test('original source association observer faults changed inputs and mutated packet sources fail closed',limits,async t=>{
 const wrong=await fixture(t,'wrong');await assert.rejects(()=>wrong.api.collectSourceBoundOwnedCoreFixedPoint(wrong.input),/association/u);const changed=await fixture(t,'stable');await assert.rejects(()=>changed.api.collectSourceBoundOwnedCoreFixedPoint(changed.input,packet=>{if(packet.proposal)changed.input.files['src/lib.rs']='external change';}),/changed/u);const mutated=await fixture(t,'stable');await assert.rejects(()=>mutated.api.collectSourceBoundOwnedCoreFixedPoint(mutated.input,packet=>{if(packet.proposal)packet.proposal.after['src/lib.rs']='forged after';}),/changed/u);const fault=await fixture(t,'stable'),error=Error('observer error');await assert.rejects(()=>fault.api.collectSourceBoundOwnedCoreFixedPoint(fault.input,()=>{throw error;}),value=>value===error);
});
