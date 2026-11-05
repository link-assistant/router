// Independent full-source receiving cases. ALL UNRUN; no Rust child calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {receiveConstantIndexProfile} from './constant-index-profile-20261101-receiving.mjs';
import {proposeConstantIndexProfile,visitConstantIndexProfileSourceEquations,withConstantIndexProfileInstalledSources} from '../constant-index-profile-20261101-profile.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {DYNAMIC_OUTPUT_FACADE_SOURCE,DYNAMIC_OUTPUT_LEAF_SOURCE,DYNAMIC_OUTPUT_PRODUCTION_OWNERS,DYNAMIC_OUTPUT_ORIGINAL_FACADE_SOURCE} from '../dynamic-primitive-output-20261101-source.mjs';
import {LITERAL_ARGUMENTS_LEAF_SOURCE} from '../literal-arguments-core-20261101-source.mjs';
import {OUTPUT_LITERAL_LEAF_SOURCE} from '../output-literal-core-20261101-source.mjs';
import {PERSISTENT_OUTPUT_LEAF_SOURCE} from '../persistent-output-backend-20261101-source.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(repositorySourceURL(path,root),'utf8'),manifest=read('Cargo.toml'),lock=read('Cargo.lock'),limits={timeout:60000,concurrency:false};
const SOURCE="pub mod translation_core;const LABELS:[&crate::translation_core::Str;3]=[\"É😀\",\"\",\"tail\"];const SELECT:usize=2usize;pub fn header()->crate::translation_core::Text{crate::translation_core::format!(\"{0:<6}|{1}|{2}\",LABELS[0usize],LABELS[1usize],LABELS[SELECT])}pub fn header_output(){crate::translation_core::output_text_write(false,header());}";
function request(body=SOURCE){return {entry:'src/lib.rs',manifest,lock,files:[{path:'src/lib.rs',source:body},{path:'src/translation_core.rs',source:DYNAMIC_OUTPUT_FACADE_SOURCE},{path:'src/translation_core/dynamic_primitive_output_20261101.rs',source:DYNAMIC_OUTPUT_LEAF_SOURCE},{path:'src/translation_core/literal_arguments_core_20261101.rs',source:LITERAL_ARGUMENTS_LEAF_SOURCE},{path:'src/translation_core/output_literal_core_20261101.rs',source:OUTPUT_LITERAL_LEAF_SOURCE},{path:'src/translation_core/persistent_output_backend_20261101.rs',source:PERSISTENT_OUTPUT_LEAF_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'src/translation_core/ranges.rs',source:ROUTER_CORE_RANGES_SOURCE},{path:'src/translation_core/json_collections.rs',source:ROUTER_CORE_JSON_COLLECTIONS_SOURCE},{path:'src/translation_core/base64.rs',source:ROUTER_CORE_BASE64_SOURCE}]};}
const caseStarts=new WeakMap(),receive=(t,extra)=>receiveConstantIndexProfile(t,{request:request(),operation:'compile',...extra},{startedAt:caseStarts.get(t)}),success=value=>{assert.equal(value.result.ok,true,JSON.stringify(value.result.error));return value.result.result;};
test('all170 parent versions, complete split histories and seven actual source successors remain source DATA',limits,()=>{
 const proposal=proposeConstantIndexProfile();assert.equal(proposal.predecessor,'json-scalar-readers-20261101');assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.all170ParentVersionsRetained,true);assert.ok(proposal.sources.length>170);assert.deepEqual(proposal.ruleTrace.map(row=>row.phase),['language','repository']);let split=0,ordinary=0,resources=0;
 const result=visitConstantIndexProfileSourceEquations(event=>{if(event.kind==='complete-untranslated-resource'){assert.equal(event.source,event.inverse);assert.equal(event.cstClaimed,false);resources++;return null;}assert.equal(event.history.inverse,event.history.before);assert.equal(transportConcreteSyntaxMeta(event.history.beforeMeta).source,event.history.before);assert.equal(transportConcreteSyntaxMeta(event.history.afterMeta).source,event.history.after);assert.deepEqual(event.history.trace.map(row=>row.phase),['language','repository']);if(event.kind==='complete-constant-index-module-equation')split++;else{assert.equal(event.kind,undefined);ordinary++;}return null;});assert.equal(split,3);assert.equal(ordinary,result.visited);assert.equal(resources,3);assert.equal(result.fullCstRetained,false);
});
test('actual header const cells and const usize execute emitted JS and separately strictTS with real native owners',limits,t=>{caseStarts.set(t,performance.now());
 const value=success(receive(t,{verify:[{name:'header',value:'É😀    ||tail'},{name:'header_output',stdout:'É😀    ||tail'}]}));assert.ok(value.constantIndexOrigins.cells.length>=3);assert.equal(value.productionCoverageQualified,false);assert.equal(value.originalBuiltinEquivalent,false);
});
test('renamed array and repeated actual cell uses do not acquire name/table permissions',limits,t=>{caseStarts.set(t,performance.now());
 const source=SOURCE.replaceAll('LABELS','ARBITRARY_OWNER').replace('"{0:<6}|{1}|{2}",ARBITRARY_OWNER[0usize],ARBITRARY_OWNER[1usize],ARBITRARY_OWNER[SELECT]','"{0}/{1}",ARBITRARY_OWNER[0usize],ARBITRARY_OWNER[0usize]');success(receive(t,{request:request(source),verify:[{name:'header',value:'É😀/É😀'},{name:'header_output',stdout:'É😀/É😀'}]}));
});
test('whole original constant attributes retain genuine file offsets through changed-cell inverse',limits,t=>{caseStarts.set(t,performance.now());
 const source=SOURCE.replace('const LABELS:','#[cfg(all())] const LABELS:');const value=success(receive(t,{request:request(source),operation:'inverse-cell',language:'JavaScript',before:'tail',after:'ATTR',verify:[{name:'header',value:'É😀    ||ATTR'}]}));assert.ok(value.rustEdit.after.includes('#[cfg(all())] const LABELS:'));
});
for(const language of ['JavaScript','TypeScript'])test(language+' whole edited const cell rechecks native owner and reproduces both receiving targets',limits,t=>{caseStarts.set(t,performance.now());
 const value=success(receive(t,{operation:'inverse-cell',language,before:'tail',after:'changed-λ🧱',verify:[{name:'header',value:'É😀    ||changed-λ🧱'},{name:'header_output',stdout:'É😀    ||changed-λ🧱'}]}));assert.ok(value.rustEdit.after.includes('changed-λ🧱'));assert.equal(value.rustEdit.history.inverse,value.rustEdit.before);assert.equal(value.javascriptHistory.inverse,value.javascriptHistory.before);assert.equal(value.typescriptHistory.inverse,value.typescriptHistory.before);assert.deepEqual([...new Set(value.ruleTrace.map(row=>row.phase))],['language','repository']);
});
for(const language of ['JavaScript','TypeScript'])test(language+' whole edited usize use-site cannot substitute a public u64 type hint',limits,t=>{caseStarts.set(t,performance.now());
 const value=success(receive(t,{operation:'inverse-index',language,before:0,after:1,verify:[{name:'header',value:'      ||tail'},{name:'header_output',stdout:'      ||tail'}]}));assert.ok(value.rustEdit.after.includes('LABELS[1usize]'));assert.equal(value.selection.kind,'actual-literal-usize-index');
});
test('full4096 fixed-array bound retains actual first/last source cells without lifting Copy or CTFE caps',limits,t=>{caseStarts.set(t,performance.now());
 const values=Array.from({length:4096},(_,at)=>JSON.stringify(at===0?'FIRST':at===4095?'LAST':'')),source='pub mod translation_core;const BOUND:[&crate::translation_core::Str;4096]=['+values.join(',')+'];pub fn boundary(){crate::translation_core::output_text_write(false,crate::translation_core::format!("{}:{}",BOUND[0usize],BOUND[4095usize]));}';success(receive(t,{request:request(source),verify:[{name:'boundary',stdout:'FIRST:LAST'}]}));
});
test('source const operands preserve eager arithmetic failure and the original partial output order',limits,t=>{caseStarts.set(t,performance.now());
 const source=SOURCE+'pub fn ordered(divisor:u64){crate::translation_core::output_text_write(false,crate::translation_core::format!("BEFORE;"));crate::translation_core::output_text_write(false,crate::translation_core::format!("{}:{}",LABELS[0usize],4_u64/divisor));}';success(receive(t,{request:request(source),verify:[{name:'ordered',arguments:[{kind:'fixed',value:'0'}],failure:'zero',stdout:'BEFORE;'}]}));
});
test('nested function owners use genuine module joins and preserve existing mixed parent output semantics',limits,t=>{caseStarts.set(t,performance.now());
 const source='pub mod translation_core;pub mod nested{const VALUES:[&crate::translation_core::Str;1]=["NESTED"];pub fn show(){crate::translation_core::output_text_write(false,crate::translation_core::format!("{}",VALUES[0usize]));}}pub fn prior(){crate::translation_core::output_write(false,"LITERAL");}';const value=success(receive(t,{request:request(source),verify:[{name:'nested.show',stdout:'NESTED'},{name:'prior',stdout:'LITERAL'}]}));assert.ok(value.constantIndexOrigins.cells.some(row=>row.owner==='nested.show'));
});
test('out-of-range, wrong suffix and local-shadow source cannot qualify new header output',limits,t=>{caseStarts.set(t,performance.now());
 for(const source of [SOURCE.replace('LABELS[0usize]','LABELS[3usize]'),SOURCE.replace('LABELS[0usize]','LABELS[0u64]'),SOURCE.replace('pub fn header()->','pub fn header(index:usize)->').replace('LABELS[0usize]','LABELS[index]'),SOURCE.replace('const SELECT:usize=2usize;','const SELECT:u64=2u64;'),SOURCE.replace('pub fn header()->crate::translation_core::Text{','pub fn header()->crate::translation_core::Text{let LABELS=["a","b","c"];')]){const received=receive(t,{request:request(source)});if(received.result.ok)assert.ok(received.result.result.meta.refused.some(row=>row.name==='header'||row.name==='header_output'));else assert.ok(received.result.error);}
});
test('forged meta, disjoint public kernel instance and restored source failures cannot stand in for actual Host birth/seal',limits,t=>{caseStarts.set(t,performance.now());
 assert.equal(success(receive(t,{operation:'meta-forgery'})).forgeryRefused,true);assert.equal(success(receive(t,{operation:'sibling-kernel'})).siblingRefused,true);assert.equal(receive(t,{operation:'caught-source'}).result.ok,false);
});
test('unrelated target source edits and changed literal-index bounds refuse exact canonical reproduction',limits,t=>{caseStarts.set(t,performance.now());
 assert.equal(receive(t,{operation:'inverse-cell',language:'JavaScript',before:'tail',after:'changed',extraTargetText:'\nconsole.log("foreign");\n'}).result.ok,false);assert.equal(receive(t,{operation:'inverse-index',language:'TypeScript',before:0,after:3}).result.ok,false);
});
test('source callbacks preserve exact falsy/frozen primaries and reject async/proxy consumers without executing them',limits,()=>{
 for(const primary of [undefined,null,false,0,'',Object.freeze(Error('constant source primary'))]){let failed=false,caught;try{visitConstantIndexProfileSourceEquations(()=>{throw primary;});}catch(error){failed=true;caught=error;}assert.equal(failed,true);assert.strictEqual(caught,primary);}let invoked=0;for(const callback of [async()=>{invoked++;},new Proxy(()=>{invoked++;},{apply(){invoked++;}})])assert.throws(()=>withConstantIndexProfileInstalledSources(callback));assert.equal(invoked,0);
});
test('actual complete token_report native source remains intact; println/JSON loop/row are explicit remaining prerequisites',limits,()=>{
 const source=read('rust/src/token_report.rs'),history=transportConcreteSourceEquations([{before:source,after:source,language:'Rust'}])[0];assert.equal(history.inverse,source);assert.equal(transportConcreteSyntaxMeta(history.beforeMeta).source,source);assert.match(source,/const HEADERS: \[&crate::translation_core::Str; 9\]/u);assert.ok(source.includes('println!'));assert.ok(source.includes('for record in records'));assert.ok(source.includes('row(record)')); // Preservation only; no detached production admission.
});
