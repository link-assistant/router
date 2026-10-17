import nativeTest from 'node:test';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {writeJsonTextGzip} from '../../evidence/write-json-gzip.mjs';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {parseRust,checkProgram,emitJavaScript,HostChecker} from '../extensions/host-contracts.mjs';
import {SOURCE_STR,SOURCE_STRING,hasSourceBorrowedStrSignature} from '../extensions/source-contract-types.mjs';
import {copyMetadata} from '../extensions/source-links.mjs';
import {originalStandardCallContext} from '../extensions/original-standard-calls.mjs';
import {requireOriginalOptionEqualityOperand} from '../extensions/option-equality.mjs';
import {serde_json_from_str,serde_json_to_string} from '../extensions/json-runtime.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {proposeCoreJsonCorpus} from '../migrate-core-json.mjs';
import {proposeCoreAlgebraicCorpus} from '../migrate-core-algebraic.mjs';
import {proposeCorePrimitivesCorpus} from '../migrate-core-primitives.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {completeCoreSourceFixture} from './complete-core-source-fixture.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),nativeJSON=JSON.stringify;
const read=path=>{try{return readFileSync(join(root,path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;return execFileSync('git',['show','HEAD:'+path],{cwd:root,encoding:'utf8',timeout:20000,maxBuffer:16777216});}};
let number=0;
function test(name,run){const index=++number;nativeTest(name,{timeout:60000},async()=>{const vectors=[];try{await run(vectors);}finally{const directory=process.env.ROUTER_OPTION_CONSTRUCTOR_METADATA_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});const source=nativeJSON({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value instanceof Map?{$map:[...value]}:value);writeJsonTextGzip(join(directory,String(index).padStart(2,'0')+'-complete.json.gz'),source);}}});}
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const has=(result,name)=>result.meta.executable.some(row=>row.name===name);
const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'});
const json=value=>{const result=serde_json_from_str(nativeJSON(value));assert.equal(result.$,'Ok');return result.field0;};
async function targets(result,verify){await verifyTypedTargets(result,verify,{childTimeoutMs:20000});}
const find=(node,predicate)=>{if(!node||typeof node!=='object')return null;if(predicate(node))return node;const values=node instanceof Map?[...node.values()]:Object.values(node);for(const value of values){const result=find(value,predicate);if(result)return result;}return null;};
function refuse(source,vectors){const result=project(source);vectors.push({source,result});assert.equal(has(result,'bad'),false,source);assert.ok(result.meta.refused.some(row=>row.name==='bad'),source);}
function proposalInverse(row){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let source=row.after.source;for(const mapping of [...row.mapping].reverse())if(mapping.kind==='substitution'){assert.equal(source.slice(...mapping.after),mapping.replacement);source=source.slice(0,mapping.after[0])+mapping.expected+source.slice(mapping.after[1]);}assert.equal(source,row.before.source);assert.deepEqual(row.trace.map(row=>row.phase),['language','repository']);assert.equal(row.executableAdmission,false);}

test('registered source signature copies preserve exact own data without creating source authority',vectors=>{
 const copied=copyMetadata(SOURCE_STR);assert.equal(Object.getPrototypeOf(SOURCE_STR.rustStandardSignature),Object.prototype);assert.equal(Object.getPrototypeOf(copied.rustStandardSignature),null);assert.equal(isDeepStrictEqual(copied.rustStandardSignature,SOURCE_STR.rustStandardSignature),false);
 for(const type of [SOURCE_STR,copied,{...SOURCE_STR,rustStandardSignature:{...SOURCE_STR.rustStandardSignature}},{...SOURCE_STR,rustOwnership:copyMetadata(SOURCE_STR.rustOwnership),rustStandardSignature:copyMetadata(SOURCE_STR.rustStandardSignature)}]){const before=Object.getOwnPropertyDescriptors(type);assert.equal(hasSourceBorrowedStrSignature(type),true);assert.deepEqual(Object.getOwnPropertyDescriptors(type),before);vectors.push({type,signaturePrototype:Object.getPrototypeOf(type.rustStandardSignature)===null?'null':'ordinary'});}
 assert.equal(hasSourceBorrowedStrSignature(SOURCE_STRING),false);assert.equal(hasSourceBorrowedStrSignature({kind:'string',rustOwnership:{kind:'borrowed',source:'str'}}),false);
 for(const qualifier of [{rustReference:{kind:'shared',pointee:SOURCE_STR}},{patternOwnershipRefusal:'shared source reference'},{rustGenericIdentityUnresolved:true},{rustBorrowingUnresolved:'unknown'},{rustSourceType:false},{rustOwnership:{kind:'owned',source:'String'}}])assert.equal(hasSourceBorrowedStrSignature({...copied,...qualifier}),false);
});

test('actual registered JSON readers compare contextual Some literals through both strict targets',async vectors=>{
 const source='use serde_json::Value;pub fn yes(v:&Value)->bool{v.get("type").and_then(Value::as_str)==Some("yes")}pub fn empty(v:&Value)->bool{v.get("type").and_then(Value::as_str)==Some("")}pub fn unicode(v:&Value)->bool{v.get("type").and_then(Value::as_str)==Some("Ω😀")}',result=project(source);vectors.push({source,result});for(const name of ['yes','empty','unicode'])assert.ok(has(result,name),nativeJSON(result.meta.refused));
 const observed=[];await targets(result,api=>{for(const input of [null,{},[],{type:null},{type:false},{type:1},{type:[]},{type:{}},...['yes','Yes','yes\0',' yes','','Ω😀','é','e\u0301'].map(type=>({type}))]){const value=json(input);for(const [name,text]of [['yes','yes'],['empty',''],['unicode','Ω😀']]){const wanted=input!==null&&!Array.isArray(input)&&typeof input.type==='string'&&input.type===text,actual=api[name](value);assert.equal(actual,wanted);observed.push({input,name,wanted,actual});}}});vectors.push({observed});
});

test('match-tail comparisons and backward named Option contexts retain constructor resolution',async vectors=>{
 const source='use serde_json::Value;pub fn checked(v:&Value)->bool{match v{Value::Object(map)=>{if map.get("type").and_then(Value::as_str)==Some("yes"){return true;}false},_=>false}}pub fn other(v:&Value)->bool{match v{Value::Object(map)=>{if map.get("type").and_then(Value::as_str)==Some("no"){return true;}false},_=>false}}pub fn backward(v:&Value)->bool{let selected=v.get("type").and_then(Value::as_str);Some("yes")==selected}pub fn absent(v:&Value)->bool{let selected=v.get("type").and_then(Value::as_str);None==selected}',dependencyInputs={manifest:read('Cargo.toml'),lock:read('Cargo.lock')},dependencies=loadJsonMacroSourceProof(dependencyInputs),result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,jsonMacroDependencies:dependencies,cargoManifest:dependencyInputs.manifest,compilationProfile:PRODUCTION_PROFILE});vectors.push({source,dependencyInputs,dependencies,compilationProfile:PRODUCTION_PROFILE,result});for(const name of ['checked','other','backward','absent'])assert.ok(has(result,name),nativeJSON(result.meta.refused));
 await targets(result,api=>{for(const input of [null,{},[],{type:0},{type:''},{type:'yes'},{type:'no'},{type:'Ω😀'},{type:'yes\0'}]){const value=json(input),type=input!==null&&!Array.isArray(input)?input.type:undefined;assert.equal(api.checked(value),type==='yes');assert.equal(api.other(value),type==='no');assert.equal(api.backward(value),type==='yes');assert.equal(api.absent(value),typeof type!=='string');}});
});

test('registered borrowed string trim keeps its source receiver and allocation boundaries',async vectors=>{
 const source='use serde_json::Value;pub fn trimmed(v:&Value)->bool{v.get("type").and_then(Value::as_str).unwrap_or("").trim()=="yes"}pub fn mapped(v:&Value)->bool{v.get("type").and_then(Value::as_str).map(|text|text.trim()).unwrap_or("")=="yes"}',result=project(source);vectors.push({source,result});assert.ok(has(result,'trimmed'),nativeJSON(result.meta.refused));assert.ok(has(result,'mapped'),nativeJSON(result.meta.refused));
 await targets(result,api=>{for(const input of [null,{}, {type:0},...['yes',' yes ','\tyes\n','yes\0','no','Ω😀',''].map(type=>({type}))]){const type=input!==null?input.type:undefined,wanted=typeof type==='string'&&type.trim()==='yes',value=json(input);assert.equal(api.trimmed(value),wanted);assert.equal(api.mapped(value),wanted);}});
 for(const source of ['pub fn bad(v:String)->&\'static str{v.trim()}','pub fn bad(v:&str)->Option<&\'static str>{Some(v)}'])refuse(source,vectors);
});

test('descriptor checks reject unknown signature records without getters proxies or coercion',vectors=>{
 let callbacks=0;const ordinary=()=>({...SOURCE_STR,rustStandardSignature:{...SOURCE_STR.rustStandardSignature}}),negative=[];
 const add=(label,type)=>{negative.push(label);assert.equal(hasSourceBorrowedStrSignature(type),false,label);};
 for(const key of ['kind','origin']){const type=ordinary();Object.defineProperty(type.rustStandardSignature,key,{enumerable:true,get(){callbacks++;throw Error('signature getter');}});add('signature accessor '+key,type);}
 for(const key of ['kind','rustOwnership','rustStandardSignature','rustReference']){const type=ordinary();Object.defineProperty(type,key,{enumerable:true,get(){callbacks++;throw Error('type getter');}});add('type accessor '+key,type);}
 const ownership=ordinary();Object.defineProperty(ownership.rustOwnership={...SOURCE_STR.rustOwnership},'source',{enumerable:true,get(){callbacks++;throw Error('owner getter');}});add('owner accessor',ownership);
 for(const key of ['extra',Symbol('hidden')]){const type=ordinary();Object.defineProperty(type.rustStandardSignature,key,{value:true,enumerable:true});add('extra signature '+String(key),type);}
 const hidden=ordinary();Object.defineProperty(hidden.rustStandardSignature,'origin',{value:'registered-standard-library-signature',enumerable:false});add('hidden field',hidden);
 for(const field of ['rustOwnership','rustStandardSignature']){const type=ordinary();type[field]=new Proxy(type[field],{get(){callbacks++;throw Error('get');},ownKeys(){callbacks++;throw Error('keys');},getPrototypeOf(){callbacks++;throw Error('prototype');},getOwnPropertyDescriptor(){callbacks++;throw Error('descriptor');}});add('proxy '+field,type);}
 add('proxy type',new Proxy(ordinary(),{get(){callbacks++;throw Error('get');},ownKeys(){callbacks++;throw Error('keys');},getPrototypeOf(){callbacks++;throw Error('prototype');},getOwnPropertyDescriptor(){callbacks++;throw Error('descriptor');}}));
 for(const field of ['rustOwnership','rustStandardSignature']){const type=ordinary();Object.setPrototypeOf(type[field]={...type[field]},{});add('foreign prototype '+field,type);}
 const foreign=ordinary();Object.setPrototypeOf(foreign,{});add('foreign prototype type',foreign);
 for(const replacement of [undefined,null,{},[],{kind:'borrowed-str'},{kind:'borrowed-str',origin:'forged'},{kind:{toString(){callbacks++;return 'borrowed-str';}},origin:'registered-standard-library-signature'}])add('wrong signature shape',{...SOURCE_STR,rustStandardSignature:replacement});
 const cycle={};cycle.next=cycle;assert.throws(()=>copyMetadata(cycle),/acyclic/u);const accessor={};Object.defineProperty(accessor,'value',{enumerable:true,get(){callbacks++;throw Error('copy getter');}});assert.throws(()=>copyMetadata(accessor),/accessor/u);
 let deep=null;for(let index=0;index<161;index++)deep={next:deep};assert.throws(()=>copyMetadata(deep),/metadata budget/u);assert.throws(()=>copyMetadata('x'.repeat(4194305)),/metadata byte budget/u);
 assert.equal(callbacks,0);vectors.push({negative,callbacks,ordinary:SOURCE_STR,copied:copyMetadata(SOURCE_STR)});
});

test('canonical nested constructors preserve per-use lifetimes and real custom Some callees',async vectors=>{
 const dynamic='pub fn dynamic(v:&str)->Option<&str>{Some(v)}pub fn nested(v:&str)->Option<Option<&str>>{Some(Some(v))}pub fn result(v:&str)->Result<Option<&str>,u8>{Ok(Some(v))}',frozen='pub fn frozen(v:&\'static str)->Option<&\'static str>{Some(v)}';
 for(const parts of [[dynamic,frozen],[frozen,dynamic]]){const source=parts.join(' '),result=project(source);vectors.push({source,result});assert.deepEqual(result.meta.refused,[]);await targets(result,api=>{assert.deepEqual(api.dynamic('Ω😀'),some('Ω😀'));assert.deepEqual(api.nested('input'),some(some('input')));assert.deepEqual(api.result('input'),{$:'Ok',field0:some('input')});assert.deepEqual(api.frozen('literal'),some('literal'));});}
 const custom='fn Some(_value:&str)->Option<&str>{None}pub fn actual(v:Option<&str>)->bool{v==Some("yes")}',result=project(custom);vectors.push({source:custom,result});assert.deepEqual(result.meta.refused,[]);await targets(result,api=>{assert.equal(api.actual(none),true);assert.equal(api.actual(some('yes')),false);});
 for(const source of ['pub fn bad(v:Option<String>)->bool{v==Some(String::from("yes"))}','pub fn bad(v:Option<&mut str>)->bool{v==None}','enum Option{Some(&\'static str),None}pub fn bad(v:Option)->bool{v==Some("yes")}','use unknown::Option;pub fn bad(v:Option<&str>)->bool{v==None}','inject!();pub fn bad(v:Option<&str>)->bool{v==Some("yes")}'])refuse(source,vectors);
});

test('complete actual tool-choice body retains full parent CST adoption inverses and independent goldens',async vectors=>{
 const file='src/openai_tools.rs',original=read(file),declarations=sourceItems(original).filter(row=>row.term==='fn'&&row.name==='translate_tool_choice');assert.equal(declarations.length,1);const item=declarations[0],declaration=original.slice(item.start,item.end),carrier='use serde_json::{Value,json};\n'+declaration,dependencyInputs={manifest:read('Cargo.toml'),lock:read('Cargo.lock')},dependencies=loadJsonMacroSourceProof(dependencyInputs);
 const files={'src/lib.rs':'pub mod translation_core;mod openai_tools;','src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,[file]:carrier},jsonProposal=proposeCoreJsonCorpus({files,dependencyInputs}),algebraic=proposeCoreAlgebraicCorpus({files:jsonProposal.after,compilationProfile:PRODUCTION_PROFILE}),primitives=proposeCorePrimitivesCorpus({files:algebraic.after,compilationProfile:PRODUCTION_PROFILE});for(const proposal of [jsonProposal,algebraic,primitives])for(const row of proposal.proposals)proposalInverse(row);
 const actual=completeCoreSourceFixture(primitives.after),result=translateProject({entry:'src/lib.rs',paths:Object.keys(actual),readSource:path=>actual[path],jsonMacroDependencies:dependencies,cargoManifest:dependencyInputs.manifest,compilationProfile:PRODUCTION_PROFILE});vectors.push({file,original,span:{start:item.start,end:item.end},declaration,carrierScope:'Exact complete function in separately authored carrier; original parent and full crate admission unmeasured',files,jsonProposal,algebraic,primitives,actual,result});assert.ok(has(result,'openai_tools.translate_tool_choice'),nativeJSON(result.meta.refused));
 const fixtureSource=read('fixtures/translation/openai-tool-choice.json'),fixture=JSON.parse(fixtureSource);assert.equal(fixture.length,24);vectors.push({fixtureSource,fixture});await targets(result,api=>{for(const row of fixture){const input=json(row.input),before=structuredClone(input),output=api['openai_tools.translate_tool_choice'](input),serialized=serde_json_to_string(output);assert.equal(serialized.$,'Ok');assert.deepEqual(JSON.parse(serialized.field0),row.expected,row.name);assert.deepEqual(input,before);}});
});

test('serialized metadata and copied source cannot manufacture original operand or emission receipts',async vectors=>{
 const source='pub fn pair(a:Option<&str>,b:Option<&str>)->bool{a==b}',result=project(source);assert.deepEqual(result.meta.refused,[]);vectors.push({source,result});const wire=nativeJSON(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);
 await targets(result,api=>{assert.equal(api.pair(some('Ω😀'),some('Ω😀')),true);assert.equal(api.pair(some('a'),some('b')),false);assert.equal(api.pair(none,none),true);});
 const actual=parseRust(source+'fn main(){}'),checker=new HostChecker('Rust',[]);checker.program(actual);const call=find(actual,node=>node.k==='binary'&&node.op==='eq');assert.ok(call);assert.equal(originalStandardCallContext(checker,call).owner,'pair');assert.throws(()=>requireOriginalOptionEqualityOperand(checker,call,0,{k:'var',name:'a',type:SOURCE_STR}),/privately checked operand/u);assert.throws(()=>checkProgram(structuredClone(parseRust(source+'fn main(){}'))),/private|captured|original|operand|equality|binary/u);
 const program=parseProgram(nativeJSON(result.meta.targetSemanticProgram)),frame=find(program.declarations,node=>node.k==='routerOriginalStandardFrame');assert.ok(frame);frame.sourceFrameProof.returnScope='caller';assert.throws(()=>emitJavaScript(program),/changed|private|captured|source|layout/u);
 const script=`import {readFileSync} from 'node:fs';import {parseProgram} from ${nativeJSON(new URL('../semantic-meta.mjs',import.meta.url).href)};import {emitJavaScript} from ${nativeJSON(new URL('../extensions/host-contracts.mjs',import.meta.url).href)};let observation;try{emitJavaScript(parseProgram(readFileSync(0,'utf8')));observation={accepted:true};}catch(error){observation={accepted:false,name:error.name,message:error.message};}console.log(JSON.stringify(observation));`,child=spawnSync(process.execPath,process.versions.bun?['--eval',script]:['--input-type=module','--eval',script],{input:nativeJSON(result.meta.targetSemanticProgram),encoding:'utf8',timeout:20000,maxBuffer:4194304});vectors.push({script,child});assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);assert.equal(JSON.parse(child.stdout).accepted,false);
});
