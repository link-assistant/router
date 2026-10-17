import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {translateProject} from '../project.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {serde_json_from_str,serde_json_to_string} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const C='crate::translation_core::',T=C+'Json',M=C+'Maybe',J=C+'json!',P=C+'json_copy',U=C+'json_with_field';
const dependencyInputs={manifest:readFileSync(new URL('../../../Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const jsonMacroDependencies=loadJsonMacroSourceProof(dependencyInputs),deriveDependencies=loadDeriveDependencyProof(dependencyInputs);
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{const root=process.env.ROUTER_JSON_COLLECTION_VECTOR_DIR;if(root){mkdirSync(root,{recursive:true});writeFileSync(join(root,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n');}}});
const files=(source,extra={})=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,...extra});
const project=input=>retain('complete-checked-project',translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies,deriveDependencies,cargoManifest:dependencyInputs.manifest,compilationProfile:PRODUCTION_PROFILE}));
const has=(result,name)=>result.meta.executable.some(row=>row.name===name);
const yes=(result,names)=>{for(const name of names)assert.equal(has(result,name),true,JSON.stringify(result.meta.refused));};
const no=(result,names)=>{for(const name of names){assert.equal(has(result,name),false,name);assert.ok(result.meta.refused.some(row=>row.name===name||row.name===name.split('.').at(-1)),JSON.stringify(result.meta.refused));}};
const json=value=>{const parsed=serde_json_from_str(JSON.stringify(value));assert.equal(parsed.$,'Ok');return parsed.field0;};
const plain=value=>{const encoded=serde_json_to_string(value);assert.equal(encoded.$,'Ok');return JSON.parse(encoded.field0);};
const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'});
async function targets(result,verify){const wire=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);retain('complete-targets',{wire,javascript:result.javascript,typescript:result.typescript});try{await verifyTypedTargets(result,verify,{childTimeoutMs:20_000});}catch(error){retain('strict-child-failure',{name:error.name,message:error.message,stdout:error.stdout?.toString('utf8'),stderr:error.stderr?.toString('utf8'),status:error.status,signal:error.signal});throw error;}}
import {parseRust,checkProgram,emitJavaScript} from '../extensions/host-contracts.mjs';
import {router_core_json_map,router_core_json_filter_map} from '../json-collections-runtime.mjs';

test('owned eager map preserves empty single and ordered independent canonical outputs',async()=>{
 const result=project(files(`pub fn mapped(values:&[${T}])->Vec<${T}>{${C}json_map(values,|item|{${P}(item)})}`));yes(result,['mapped']);
 await targets(result,({mapped})=>{for(const values of [[],[null],[{text:'猫😀'},[true],false]]){const input=Object.freeze(values.map(json)),before=structuredClone(input),output=mapped(input);assert.deepEqual(output.map(plain),values);assert.ok(Object.isFrozen(output));assert.deepEqual(input,before);for(let at=0;at<input.length;at++){if(input[at].$==='Null'){assert.deepEqual(output[at],input[at]);assert.ok(Object.isFrozen(output[at]));}else assert.notStrictEqual(output[at],input[at]);}}});
});
test('owned eager filter map consumes only actual Some payloads in stable order',async()=>{
 const result=project(files(`pub fn filtered(values:&[${T}])->Vec<${T}>{${C}json_filter_map(values,|item|{if item.is_null(){None}else{Some(${P}(item))}})}`));yes(result,['filtered']);
 await targets(result,({filtered})=>{const input=Object.freeze([null,'Ω',null,{x:true},false].map(json));assert.deepEqual(filtered(input).map(plain),['Ω',{x:true},false]);assert.deepEqual(filtered(Object.freeze([])),[]);assert.deepEqual(input.map(plain),[null,'Ω',null,{x:true},false]);});
});
test('fresh callback locals support sequential conditional updates and local early returns',async()=>{
 const result=project(files(`pub fn built(values:&[${T}],flag:bool)->Vec<${T}>{${C}json_filter_map(values,|item|{if item.is_null(){return None;}let mut doc=${J}({"start":true});if let Some(value)=item.get("data"){doc=${U}(doc,"data",${P}(value));}if flag{doc=${U}(doc,"flag",${J}(true));}Some(doc)})}`));yes(result,['built']);
 await targets(result,({built})=>{for(const flag of [false,true]){const input=Object.freeze([json(null),json({data:['😀',true]}),json({})]),before=structuredClone(input);assert.deepEqual(built(input,flag).map(plain),[{start:true,data:['😀',true],...(flag?{flag:true}:{})},{start:true,...(flag?{flag:true}:{})}]);assert.deepEqual(input,before);}});
});
test('borrowed input captures and immutable scalars do not move their lexical roots',async()=>{
 const result=project(files(`pub fn captured(values:&[${T}],fallback:&${T},flag:bool)->Vec<${T}>{${C}json_map(values,|item|{if flag{${P}(item)}else{${P}(fallback)}})}`));yes(result,['captured']);
 await targets(result,({captured})=>{const values=Object.freeze([json({x:true}),json('a')]),fallback=json({fallback:['猫']});assert.deepEqual(captured(values,fallback,true).map(plain),[{x:true},'a']);assert.deepEqual(captured(values,fallback,false).map(plain),[{fallback:['猫']},{fallback:['猫']}]);const out=captured(values,fallback,false);assert.notEqual(out[0],out[1]);assert.notEqual(out[0],fallback);});
});
test('captured owned cells mutation borrowed moves unknown calls loops and escapes refuse',async()=>{
 const source=`fn unknown(value:&${T})->${T}{${P}(value)}pub fn owned(values:&[${T}],value:${T})->Vec<${T}>{${C}json_map(values,|item|{${U}(value,"x",${P}(item))})}pub fn borrowed(values:&[${T}])->Vec<${T}>{${C}json_map(values,|item|{item})}pub fn retained(values:&[${T}])->Vec<${T}>{${C}json_map(values,|item|{unknown(item)})}pub fn mutated(values:&[${T}])->Vec<${T}>{let mut flag=false;${C}json_map(values,|item|{flag=true;${P}(item)})}pub fn looping(values:&[${T}])->Vec<${T}>{${C}json_map(values,|item|{while false{}${P}(item)})}pub fn tried(values:&[${T}])->Vec<${T}>{${C}json_filter_map(values,|item|{let value=item.get("x")?;Some(${P}(value))})}`;
 no(project(files(source)),['owned','borrowed','retained','mutated','looping','tried']);
 const transfers=`pub fn reuse(values:&[${T}])->Vec<${T}>{let first=${C}json_map(values,|item|{${P}(item)});let moved=first;first}pub fn captured_borrow(values:&[${T}],owned:${T})->Vec<${T}>{${C}json_map(values,|item|{${P}(&owned)})}`;no(project(files(transfers)),['reuse','captured_borrow']);
 const restricted=`pub fn outside(value:&${T},text:&str)->${T}{match text{"a"|"b"=>${P}(value),_=>${J}(null)}}pub fn guarded(values:&[${T}])->Vec<${T}>{${C}json_map(values,|item|{let text=if let Some(text)=item.as_str(){text}else{""};match text{"a" if true=>${P}(item),_=>${J}(null)}})}pub fn payload(values:&[${T}])->Vec<${T}>{${C}json_map(values,|item|{match item.as_str(){Some(text)=>${J}(text),None=>${J}(null)}})}`;const restrictedResult=project(files(restricted));yes(restrictedResult,['outside']);no(restrictedResult,['guarded','payload']);await targets(restrictedResult,({outside})=>{for(const text of ['a','b','z']){const value=json({nested:['猫😀']});assert.deepEqual(plain(outside(value,text)),['a','b'].includes(text)?{nested:['猫😀']}:null);}});
});
test('runtime callback order None flattening and panic short circuit remain explicit',()=>{
 const input=Object.freeze([json(0),json(1),json(2)]),events=[];
 const output=router_core_json_filter_map(input,value=>{events.push(plain(value));return plain(value)===1?none:some(value);});retain('runtime-order',{events,output});assert.deepEqual(events,[0,1,2]);assert.deepEqual(output.map(plain),[0,2]);
 events.length=0;assert.throws(()=>router_core_json_map(input,value=>{events.push(plain(value));if(plain(value)===1)throw new RangeError('independent callback stop');return value;}),/independent callback stop/u);assert.deepEqual(events,[0,1]);
});
test('runtime enforces unchanged immutable view per Json and aggregate output budgets',()=>{
 let calls=0,traps=0;const callback=value=>{calls++;return value;},proxy=new Proxy([],{get(){traps++;throw new Error('trap');},getPrototypeOf(){traps++;throw new Error('trap');}});
 for(const input of [proxy,[json(null)],Object.freeze(new Array(1)),Object.freeze(Array.from({length:4097},()=>json(null)))])assert.throws(()=>router_core_json_map(input,callback),TypeError);
 assert.equal(calls,0);assert.equal(traps,0);
 let deep=null;for(let at=0;at<34;at++)deep=[deep];assert.throws(()=>router_core_json_map(Object.freeze([json(deep)]),callback),TypeError);assert.equal(calls,0);
 const wide=json(Array.from({length:2100},()=>null));assert.throws(()=>router_core_json_map(Object.freeze([wide,wide]),callback),TypeError);assert.equal(calls,2);
 const bad=Object.freeze({$: 'Some',get field0(){traps++;return json(null);}});assert.throws(()=>router_core_json_filter_map(Object.freeze([json(null)]),()=>bad),TypeError);assert.equal(traps,0);
});
test('complete source counterfeits and noncanonical callbacks cannot issue private receipts',()=>{
 const source=`pub fn copied(values:&[${T}])->Vec<${T}>{${C}json_map(values,|item|{${P}(item)})}`;
 no(project(files(source,{'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE+'\n// counterfeit\n'})),['copied']);
 no(project(files(source,{'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE+'\n// counterfeit\n'})),['copied']);
 const parsed=parseRust('pub fn fake()->bool{true}fn main(){}'),forged=structuredClone(parsed),entry=forged.items.find(row=>row.k==='fn'&&row.name==='fake');entry.body={k:'routerCoreJsonUpdateCall',operation:'json_map',args:[],span:entry.body.span,compatibilityCore:{id:'router-owned-json-collections-v1'}};retain('forged-copied-source',forged);assert.throws(()=>checkProgram(forged),/owned JSON update lacks its actual qualified source call/u);
 const genuine=project(files(`pub fn recorded(values:&[${T}])->Vec<${T}>{${C}json_map(values,|item|{${P}(item)})}`));yes(genuine,['recorded']);const wire=JSON.stringify(genuine.meta.checkedSemanticProgram),program=parseProgram(wire);
 const find=node=>{if(!node||typeof node!=='object')return null;if(node.k==='routerCoreJsonCollection')return node;for(const value of Object.values(node)){for(const child of Array.isArray(value)?value:[value]){const found=find(child);if(found)return found;}}return null;};
 const target=[...program.declarations.values()].find(entry=>entry.k==='fn'&&find(entry.body));assert.ok(target);const call=find(target.body);assert.ok(call);call.id='router_core_json_filter_map';retain('forged-checked-collection',JSON.parse(serializeProgram(program)));assert.throws(()=>emitJavaScript(program),/Owned JSON projection|actual source|changed/u);
 const fake=`enum Fake{None,Some(bool)}pub fn fake(values:&[${T}])->Vec<${T}>{${C}json_filter_map(values,|item|{Fake::Some(true)})}pub fn array(value:&[bool])->Vec<${T}>{${C}json_map(value,|item|{${J}(true)})}`;no(project(files(fake)),['fake','array']);
});
