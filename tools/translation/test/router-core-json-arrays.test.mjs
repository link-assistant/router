import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {checkRouterCoreJson} from '../router-core-json.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {serde_json_from_str,serde_json_to_string} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const C='crate::translation_core::',J=C+'json!',T=C+'Json',S='&'+C+'Str',M=C+'Maybe';
const dependencyInputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(repositorySourceURL("Cargo.lock",new URL('../../../',import.meta.url)),'utf8')};
const dependencies=loadJsonMacroSourceProof(dependencyInputs),hash=value=>createHash('sha256').update(value).digest('hex');
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{if(process.env.ROUTER_OWNED_JSON_ARRAY_VECTOR_DIR){const dir=process.env.ROUTER_OWNED_JSON_ARRAY_VECTOR_DIR;mkdirSync(dir,{recursive:true});writeFileSync(join(dir,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n');}}});
const files=(source,extra={})=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,...extra});
function project(input){retain('complete-input',input);return retain('complete-result',translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:dependencies,cargoManifest:dependencyInputs.manifest,compilationProfile:PRODUCTION_PROFILE}));}
const has=(result,name)=>result.meta.executable.some(row=>row.name===name);
function functions(result,names){for(const name of names)assert.equal(has(result,name),true,JSON.stringify(result.meta.refused.filter(row=>row.name===name||name.endsWith('.'+row.name))));}
async function targets(result,verify){const wire=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);retain('complete-meta-targets',{wire,javascript:result.javascript,typescript:result.typescript});try{await verifyTypedTargets(result,verify,{childTimeoutMs:20_000});}catch(error){retain('complete-target-child-failure',{name:error.name,message:error.message,status:error.status,signal:error.signal,stdout:error.stdout?.toString('utf8'),stderr:error.stderr?.toString('utf8')});throw error;}}
const native=value=>{const output=serde_json_to_string(value);assert.equal(output.$,'Ok');return JSON.parse(output.field0);};
const canonical=value=>{const output=serde_json_from_str(JSON.stringify(value));assert.equal(output.$,'Ok');return output.field0;};
function nodes(value,kind,result=[],seen=new WeakSet()){if(!value||typeof value!=='object'||seen.has(value))return result;seen.add(value);if(value.k===kind)result.push(value);for(const child of Object.values(value))if(Array.isArray(child))child.forEach(row=>nodes(row,kind,result,seen));else nodes(child,kind,result,seen);return result;}

test('literal arrays including the former boolean refusal preserve order and nested values',async()=>{
  const source='pub fn literal()->'+T+'{'+J+'([true])}pub fn nested()->'+T+'{'+J+'([null,false,"猫😀",[],{"items":[true,{"β":"Ω"}]}])}',result=project(files(source));functions(result,['literal','nested']);
  await targets(result,api=>{assert.deepEqual(native(api.literal()),[true]);assert.deepEqual(native(api.nested()),[null,false,'猫😀',[],{items:[true,{β:'Ω'}]}]);});
});
test('typed array operands retain signed unsigned boolean and borrowed text representations',async()=>{
  const source='pub fn values(u:u64,i:i64,b:bool,s:'+S+')->'+T+'{'+J+'([u,i,b,s])}',result=project(files(source));functions(result,['values']);
  await targets(result,api=>{for(const [u,i]of [[0n,-1n],[(1n<<64n)-1n,-(1n<<63n)]]){const value=api.values(u,i,true,'e\u0301猫😀');assert.equal(value.$,'Array');assert.equal(value.field0[0].field0.$,'PosInt');assert.equal(value.field0[0].field0.field0,u);assert.equal(value.field0[1].field0.$,'NegInt');assert.equal(value.field0[1].field0.field0,i);assert.equal(value.field0[2].field0,true);assert.equal(value.field0[3].field0,'e\u0301猫😀');}assert.throws(()=>api.values(1n<<64n,0n,false,''));});
});
test('repeated canonical JSON operands become independent complete nested copies',async()=>{
  const source='pub fn copies(value:&'+T+')->'+T+'{'+J+'([value,value])}',result=project(files(source));functions(result,['copies']);
  await targets(result,api=>{const input=canonical({nested:[true,{text:'猫😀'}]}),before=structuredClone(input),value=api.copies(input);assert.deepEqual(native(value),[{nested:[true,{text:'猫😀'}]},{nested:[true,{text:'猫😀'}]}]);assert.deepEqual(input,before);assert.notEqual(value.field0[0],input);assert.notEqual(value.field0[1],input);assert.notEqual(value.field0[0],value.field0[1]);assert.notEqual(value.field0[0].field0,value.field0[1].field0);});
});
test('array interpolation question marks keep the real enclosing Option short circuit',async()=>{
  const source='pub fn optional(a:'+M+'<'+S+'>,b:'+M+'<'+S+'>)->'+M+'<'+T+'>{Some('+J+'([a?,{"tail":b?}]))}',result=project(files(source));functions(result,['optional']);
  const entry=result.meta.checkedSemanticProgram.program.items.find(row=>row.name==='optional'||row.fullName==='optional'),macro=nodes(entry.body,'routerJsonMacro')[0];assert.equal(macro.args.length,2);assert.equal(nodes(macro.args[0].value,'routerTry').length,1);assert.equal(nodes(macro.args[1].value,'routerTry').length,1);assert.ok(macro.args[0].value.span.start<macro.args[1].value.span.start);
  await targets(result,api=>{const none=Object.freeze({$:'None'}),some=value=>Object.freeze({$:'Some',field0:value});assert.deepEqual(api.optional(none,some('second')),none);assert.deepEqual(api.optional(some('first'),none),none);assert.deepEqual(api.optional(none,none),none);const value=api.optional(some('猫😀'),some('Ω'));assert.equal(value.$,'Some');assert.deepEqual(native(value.field0),['猫😀',{tail:'Ω'}]);});
});
test('nested arrays retain serializer ownership effects and malformed syntax refusals',()=>{
  const inputs=[
    'pub fn bad(v:f64)->'+T+'{'+J+'([v])}',
    'pub fn bad(v:'+C+'Text)->'+T+'{'+J+'([v])}',
    'pub fn bad(v:u128)->'+T+'{'+J+'([v])}',
    'struct Custom;pub fn bad(v:Custom)->'+T+'{'+J+'([v])}',
    'fn effect()->bool{true}pub fn bad()->'+T+'{'+J+'([effect()])}',
    'pub fn bad()->'+T+'{let mut v=0u64;'+J+'([{v+=1;v}])}',
    'pub fn bad()->'+T+'{'+J+'([true;2])}',
    'pub fn bad()->'+T+'{'+J+'([{"a":true,"a":false}])}',
  ];
  for(const source of inputs){const result=project(files(source));assert.equal(has(result,'bad'),false,source);assert.ok(result.meta.refused.some(row=>row.name==='bad'));}
});
test('syntax and aggregate runtime node and depth budgets retain their original boundaries',async()=>{
  const atLimit='pub fn boundary()->'+T+'{'+J+'(['+Array(255).fill('true').join(',')+'])}pub fn copies(value:&'+T+')->'+T+'{'+J+'([value,value])}pub fn single(value:&'+T+')->'+T+'{'+J+'([value])}',result=project(files(atLimit));functions(result,['boundary','copies','single']);
  await targets(result,api=>{const value=native(api.boundary());assert.equal(value.length,255);assert.ok(value.every(value=>value===true));const input=canonical(Array(2100).fill(true));assert.throws(()=>api.copies(input),TypeError);let deep=true;for(let at=0;at<32;at++)deep=[deep];assert.throws(()=>api.single(canonical(deep)),TypeError);assert.deepEqual(native(api.single(canonical([false]))),[[false]]);});
  for(const value of ['['+Array(256).fill('true').join(',')+']','['.repeat(17)+'true'+']'.repeat(17)]){const refused=project(files('pub fn bad()->'+T+'{'+J+'('+value+')}'));assert.equal(has(refused,'bad'),false);assert.ok(refused.meta.refused.some(row=>row.name==='bad'&&/budget/.test(row.message)));}
});
test('the complete physical ActivityPub module retains its checked literal context array',async()=>{
  const source=readFileSync(new URL('../../../rust/src/activitypub.rs',import.meta.url),'utf8'),cst=transportConcreteSyntaxSource(source,{language:'Rust'});assert.equal(cst.source,source);assert.equal(transportConcreteSyntaxMeta(cst.meta).source,source);retain('complete-original-module-and-CST',{source,sha256:hash(source),cst,scope:'complete original module under explicit fixture root; no full original crate admission claim'});
  const result=project(files('pub mod activitypub;',{'src/activitypub.rs':source}));functions(result,['activitypub.activitypub_context']);await targets(result,api=>assert.deepEqual(native(api['activitypub.activitypub_context']()),['https://www.w3.org/ns/activitystreams','https://forgefed.org/ns',{fep:'https://w3id.org/fep/ef61#',aliases:'fep:aliases'}]));
});
test('copied array nodes and changed owned facades grant no source permission',async()=>{
  const node={k:'routerCoreJsonCall',jsonTree:{kind:'array',items:[{kind:'bool',value:true}]},args:[],span:{start:0,end:1}};assert.throws(()=>checkRouterCoreJson({},structuredClone(node),new Map(),[],null));
  const source='pub fn bad()->'+T+'{'+J+'([true])}',result=project(files(source,{'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE.replace('::serde_json::json!','::other::json!')}));assert.equal(has(result,'bad'),false);
  const restored=project(files('pub fn good()->'+T+'{'+J+'([false])}'));functions(restored,['good']);await targets(restored,api=>assert.deepEqual(native(api.good()),[false]));
});
