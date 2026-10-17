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
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{const root=process.env.ROUTER_JSON_COLLECTION_SLICE_VECTOR_DIR;if(root){mkdirSync(root,{recursive:true});writeFileSync(join(root,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n');}}});
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

test('actual original Host signatures retain borrowed slice ownership in outer and pointee',()=>{
 const parsed=parseRust('pub fn witness(values:&[u8])->bool{false}fn main(){}'),program=checkProgram(parsed),type=program.declarations.get('witness').params[0].type;retain('complete-actual-parser-signature',{parsed,program:JSON.parse(serializeProgram(program)),type});
 for(const current of [type,type.rustReference.pointee]){assert.equal(current.kind,'array');assert.equal(current.rustSourceType,true);assert.deepEqual(current.rustOwnership,{kind:'borrowed',source:'slice'});assert.equal(current.rustFixedArray,undefined);}assert.equal(type.rustReference.kind,'shared');assert.equal(type.rustReference.tokens[0].value,'&');assert.equal(type.rustReference.pointee.rustReference,undefined);assert.equal(type.element.rustPrimitiveName,'u8');
 const result=project(files(`pub fn witnessed(values:&[${T}])->bool{false}`));yes(result,['witnessed']);const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),actual=checked.declarations.get('witnessed').params[0].type;retain('complete-actual-canonical-Json-slice',actual);assert.deepEqual(actual.rustOwnership,{kind:'borrowed',source:'slice'});assert.deepEqual(actual.rustReference.pointee.rustOwnership,{kind:'borrowed',source:'slice'});assert.equal(actual.element.name,actual.rustReference.pointee.element.name);
});
test('elided actual Json slices map and filter without moving input roots in both typed targets',async()=>{
 const result=project(files(`pub fn mapped(values:&[${T}])->Vec<${T}>{${C}json_map(values,|item|{${P}(item)})}pub fn filtered(values:&[${T}])->Vec<${T}>{${C}json_filter_map(values,|item|{if item.is_null(){None}else{Some(${P}(item))}})}`));yes(result,['mapped','filtered']);
 await targets(result,api=>{for(const raw of [[],[null],[null,{v:['猫😀']},false]]){const input=Object.freeze(raw.map(json)),snapshot=structuredClone(input),out=api.mapped(input);assert.deepEqual(out.map(plain),raw);assert.deepEqual(api.filtered(input).map(plain),raw.filter(value=>value!==null));assert.deepEqual(input,snapshot);assert.ok(Object.isFrozen(out));for(let at=0;at<input.length;at++)if(input[at].$!=='Null')assert.notStrictEqual(out[at],input[at]);}});
});
test('named and static source slice lifetimes remain actual reference metadata',async()=>{
 const result=project(files(`pub fn named<'a>(values:&'a [${T}])->Vec<${T}>{${C}json_map(values,|item|{${P}(item)})}pub fn static_values(values:&'static [${T}])->Vec<${T}>{${C}json_map(values,|item|{${P}(item)})}`));yes(result,['named','static_values']);
 await targets(result,api=>{const input=Object.freeze([json({v:'Ω'})]);assert.deepEqual(api.named(input).map(plain),[{v:'Ω'}]);assert.deepEqual(api.static_values(input).map(plain),[{v:'Ω'}]);assert.deepEqual(input.map(plain),[{v:'Ω'}]);});
});
test('local reference copies preserve the same live slice root and distinct borrowed captures',async()=>{
 const result=project(files(`pub fn aliased(values:&[${T}],fallback:&${T},flag:bool)->Vec<${T}>{let source=values;${C}json_map(source,|item|{if flag{${P}(item)}else{${P}(fallback)}})}`));yes(result,['aliased']);
 await targets(result,api=>{const input=Object.freeze([json({a:true}),json('猫')]),fallback=json({deep:[false]});assert.deepEqual(api.aliased(input,fallback,true).map(plain),[{a:true},'猫']);const out=api.aliased(input,fallback,false);assert.deepEqual(out.map(plain),[{deep:[false]},{deep:[false]}]);assert.notStrictEqual(out[0],out[1]);assert.notStrictEqual(out[0],fallback);});
});
test('owned vectors fixed arrays mutable nested and noncanonical element forms still refuse',()=>{
 const entries=[['owned',`values:Vec<${T}>`],['vector_ref',`values:&Vec<${T}>`],['fixed',`values:&[${T};1]`],['mutable',`values:&mut [${T}]`],['nested',`values:&&[${T}]`],['bools','values:&[bool]'],['references',`values:&[&${T}]`],['custom','values:&[Custom]']];
 const source='struct Custom{value:bool}'+entries.map(([name,param])=>`pub fn ${name}(${param})->Vec<${T}>{${C}json_map(values,|item|{${J}(true)})}`).join('');no(project(files(source)),entries.map(([name])=>name));
});
test('copied public source markers and checked collection tags cannot issue a current call',()=>{
 const parsed=parseRust('pub fn fake(values:&[u8])->bool{false}fn main(){}'),forged=structuredClone(parsed),entry=forged.items.find(row=>row.k==='fn'&&row.name==='fake');entry.body={k:'routerCoreJsonUpdateCall',operation:'json_map',args:[],span:entry.body.span,compatibilityCore:{id:'router-owned-json-collections-v1'},rustSourceType:true,rustOwnership:{kind:'borrowed',source:'slice'}};retain('complete-forged-source',forged);assert.throws(()=>checkProgram(forged),/actual qualified source call/);
 const result=project(files(`pub fn good(values:&[${T}])->Vec<${T}>{${C}json_map(values,|item|{${P}(item)})}`));yes(result,['good']);const program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),find=node=>{if(!node||typeof node!=='object')return null;if(node.k==='routerCoreJsonCollection')return node;for(const value of Object.values(node))for(const child of Array.isArray(value)?value:[value]){const found=find(child);if(found)return found;}return null;},call=find([...program.declarations.values()].find(row=>row.name==='good').body);assert.ok(call);call.args[0].type.rustReference.kind='mutable';retain('complete-forged-checked-reference',JSON.parse(serializeProgram(program)));assert.throws(()=>emitJavaScript(program),/changed|actual source|projection/i);
});
test('complete owned source tampering still refuses while the original positive source restores',()=>{
 const source=`pub fn copied(values:&[${T}])->Vec<${T}>{${C}json_map(values,|item|{${P}(item)})}`;for(const [path,before]of [['src/translation_core.rs',ROUTER_FORMATTING_FACADE_SOURCE],['src/translation_core/json_collections.rs',ROUTER_CORE_JSON_COLLECTIONS_SOURCE],['src/translation_core/primitives.rs',ROUTER_CORE_PRIMITIVES_SOURCE]])no(project(files(source,{[path]:before+'\n// changed complete source\n'})),['copied']);yes(project(files(source)),['copied']);
});
test('the exact slice repair preserves callback order panic and aggregate runtime bounds',()=>{
 const input=Object.freeze([json({v:0}),json({v:1}),json({v:2})]),events=[];assert.throws(()=>router_core_json_map(input,item=>{const value=plain(item).v;events.push(value);if(value===1)throw new Error('independent stop');return item;}),/independent stop/);assert.deepEqual(events,[0,1]);
 let calls=0;const proxy=new Proxy([],{get(){calls++;throw new Error('trap');},getPrototypeOf(){calls++;throw new Error('trap');},ownKeys(){calls++;throw new Error('trap');}});assert.throws(()=>router_core_json_map(proxy,value=>value),TypeError);assert.equal(calls,0);const wide=json(Array.from({length:2100},()=>null));assert.throws(()=>router_core_json_map(Object.freeze([json(null),json(null)]),()=>wide),TypeError);assert.deepEqual(router_core_json_filter_map(input,()=>none),[]);
});
