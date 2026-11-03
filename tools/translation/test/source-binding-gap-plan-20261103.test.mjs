// Actual original binder/physical-source receiving case SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {withSourceBindingBulk20261101,withSourceBindingGapInputs20261103} from '../source-binding-bulk-20261101.mjs';
import {collectSourceBindingGapPlan20261103} from '../source-binding-gap-plan-20261103.mjs';
import {isResolvedSourceScopeSet,assertResolvedSourceScopeOrigin} from '../module-bindings.mjs';
const limits={timeout:60000};
function fixture(t,changes={}){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-binding-gap-plan-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const sources={'src/lib.rs':'mod model; mod api; mod consumer;\n','src/model.rs':'pub struct Value; pub const COUNT:u8=7;\n','src/api.rs':'pub use crate::model::{Value as Item,COUNT as count};\n','src/consumer.rs':'use crate::api::{Item as Alias,count as total};\n',...changes};
 const write=(path,source)=>{fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),source);};for(const [path,source]of Object.entries(sources))write(path,source);
 return {root,sources,write,options:{root,sourceDirectory:'src',entry:'src/lib.rs'}};
}
test('inspection returns detached unbranded DATA while original parser configuration keeps its genuine aliases',limits,t=>{
 const f=fixture(t);let expired;
 withSourceBindingBulk20261101(f.options,api=>{
  expired=api;const first=api.inspectBindings();assert.equal(isResolvedSourceScopeSet(first.scopes),false);assert.throws(()=>assertResolvedSourceScopeOrigin(first.scopes,{modules:[]}));assert.equal(first.namespaceAuthority,false);
  const scope=first.scopes.find(row=>row.path.join('::')==='consumer'),alias=scope.bindings.find(row=>row.name==='Alias'&&row.namespace==='type');assert.ok(alias);alias.target=['forged'];scope.unresolvedTypeScope=true;
  const fresh=api.inspectBindings().scopes.find(row=>row.path.join('::')==='consumer');assert.equal(fresh.unresolvedTypeScope,false);
  const parser=api.configure({},['consumer']);assert.deepEqual(parser.sourceNamespaceAliases.type.get('consumer').get('Alias'),['crate','model','Value']);
 });
 assert.throws(()=>expired.inspectBindings(),/expired/u);
});
test('the real physical scope adopter emits no invented success or production denominator for a clean graph',limits,t=>{
 const f=fixture(t),plan=collectSourceBindingGapPlan20261103(f.options);assert.equal(plan.sources.length,4);assert.equal(plan.originalScopeCount,4);assert.equal(plan.gaps,0);assert.deepEqual(plan.originalBindingDiagnostics,[]);
 assert.equal(plan.scopeReviewComplete,false);assert.equal(plan.productionFunctionDenominator,null);assert.equal(plan.translationCoverage,null);assert.equal(plan.draftedRequirements,null);assert.equal(plan.semanticAuthority,false);assert.equal(plan.verification,'UNRUN');assert.deepEqual(plan.trace.map(row=>row.phase),['language','repository']);assert.deepEqual([...new Set(plan.originalTrace.map(row=>row.phase))],['language','repository']);assert.equal(Object.isFrozen(plan.rows),true);
});
test('original ambiguous bindings, unknown producers and unresolved namespace flags all map to actual L02/B05 work',limits,t=>{
 const f=fixture(t,{'src/lib.rs':'mod model; mod other; mod consumer; mod producer;\n','src/other.rs':'pub struct Value;\n','src/consumer.rs':'// Unicode 🌍 λ\r\nuse crate::model::Value as Same; use crate::other::Value as Same;\n','src/producer.rs':'#[unknown] pub struct Produced;\n','src/unreferenced.rs':'pub fn unreviewed(){}\n'}),plan=collectSourceBindingGapPlan20261103(f.options);
 assert.ok(plan.originalBindingDiagnostics.some(row=>row.message.includes('ambiguous')));assert.ok(plan.rows.some(row=>row.kind==='original-unresolved-or-ambiguous-binding'));assert.ok(plan.rows.some(row=>row.kind==='original-unresolved-namespace-flag'));assert.ok(plan.rows.some(row=>row.kind==='physical-source-outside-original-binding-closure'&&row.location.path==='src/unreferenced.rs'));
 for(const row of plan.rows){assert.deepEqual(row.requirements,['L02','B05']);assert.equal(row.reviewStatus,'OPEN');assert.equal(row.semanticAuthority,false);assert.ok(row.unresolved.length>0);if(row.location.status==='located'){const source=f.sources[row.location.path],{span}=row.location;assert.equal(Buffer.from(source).subarray(span.byteStart,span.byteEnd).toString('utf8'),source.slice(span.start,span.end));}}
 assert.equal(new Set(plan.rows.map(row=>row.id)).size,plan.rows.length);
});
test('a missing original module remains a complete native graph diagnostic rather than omitted scope',limits,t=>{
 const f=fixture(t,{'src/lib.rs':'mod absent;\n'}),plan=collectSourceBindingGapPlan20261103(f.options);assert.ok(plan.originalGraphDiagnostics.length>0);assert.equal(plan.rows.filter(row=>row.kind==='original-module-graph-diagnostic').length,plan.originalGraphDiagnostics.length);assert.equal(plan.scopeReviewComplete,false);
});
test('the explicit513-file inspection domain leaves the old512-file configuration limit intact',limits,t=>{
 const f=fixture(t);for(let at=0;at<509;at++)f.write('src/extra'+at+'.rs','// complete unreferenced source\n');let called=false;
 assert.throws(()=>withSourceBindingBulk20261101(f.options,()=>{called=true;}),/source count\/byte bound/u);assert.equal(called,false);
 const plan=collectSourceBindingGapPlan20261103(f.options);assert.equal(plan.sources.length,513);assert.equal(plan.rows.filter(row=>row.kind==='physical-source-outside-original-binding-closure').length,509);
 withSourceBindingGapInputs20261103(f.options,api=>{assert.equal(api.configure,undefined);assert.equal(api.configureMany,undefined);assert.equal(isResolvedSourceScopeSet(api.inspectBindings().scopes),false);});
});
test('inspection source changes and caught nested failures poison old and new frames even after restoration',limits,t=>{
 const f=fixture(t);let primary;
 assert.throws(()=>withSourceBindingBulk20261101(f.options,()=>{
  try{withSourceBindingGapInputs20261103(f.options,api=>{f.write('src/model.rs','pub struct Changed;');try{api.inspectBindings();}catch(error){primary=error;}f.write('src/model.rs',f.sources['src/model.rs']);});}catch(error){assert.equal(error,primary);}
 }),error=>error===primary);
 const fresh=collectSourceBindingGapPlan20261103(f.options);assert.equal(fresh.gaps,0);
});
test('the wider inspection profile refuses4097 whole sources before any consumer runs',limits,t=>{
 const f=fixture(t);for(let at=0;at<4093;at++)f.write('src/extra'+at+'.rs','// bounded census refusal\n');let called=false;
 assert.throws(()=>withSourceBindingGapInputs20261103(f.options,()=>{called=true;}),/source count\/byte bound/u);assert.equal(called,false);
});
test('falsy and frozen consumer primary failures survive complete physical closing checks',limits,t=>{
 const f=fixture(t);
 for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('original consumer'))]){
  let thrown=false;try{withSourceBindingGapInputs20261103(f.options,()=>{f.write('src/model.rs','pub struct Changed;');throw primary;});}catch(error){thrown=true;assert.equal(error,primary);}finally{f.write('src/model.rs',f.sources['src/model.rs']);}assert.equal(thrown,true);
 }
});
test('full census/profile identity changes bookkeeping without clearing native gaps or accepting caller scope flags',limits,t=>{
 const f=fixture(t,{'src/consumer.rs':'use missing::*;'}),first=collectSourceBindingGapPlan20261103(f.options);f.write('src/unreferenced.rs','pub fn added(){}');const second=collectSourceBindingGapPlan20261103(f.options);assert.notEqual(second.sourceCensusSha256,first.sourceCensusSha256);assert.ok(second.gaps>0);
 assert.throws(()=>collectSourceBindingGapPlan20261103({...f.options,scopes:[],sourceAuthority:true}));assert.throws(()=>withSourceBindingGapInputs20261103(f.options,async()=>{}),/synchronous/u);
});
test('actual complete Router Rust source produces a full physical-source worklist through the original binder',{timeout:900000},()=>{
 const root=fileURLToPath(new URL('../../../',import.meta.url)),expected=[],pending=['rust/src'];
 while(pending.length){const directory=pending.pop();for(const entry of fs.readdirSync(join(root,directory),{withFileTypes:true})){const path=directory+'/'+entry.name;if(entry.isDirectory())pending.push(path);else if(entry.isFile()&&path.endsWith('.rs'))expected.push(path);else if(entry.isSymbolicLink())assert.fail('actual whole-source input has an unreviewed symlink');}}
 const plan=collectSourceBindingGapPlan20261103({root,sourceDirectory:'rust/src',entry:'rust/src/lib.rs'});assert.ok(expected.length>500);assert.deepEqual(plan.sources.map(row=>row.path).sort(),expected.sort());assert.ok(plan.originalScopeCount>1);assert.equal(plan.rows.filter(row=>row.kind==='original-module-binding-diagnostic').length,plan.originalBindingDiagnostics.length);assert.equal(plan.rows.filter(row=>row.kind==='original-module-graph-diagnostic').length,plan.originalGraphDiagnostics.length);assert.equal(plan.productionFunctionDenominator,null);assert.equal(plan.translationCoverage,null);assert.equal(plan.scopeReviewComplete,false);
});
