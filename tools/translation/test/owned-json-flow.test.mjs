import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {translateProject} from '../project.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {proposeCoreJsonUpdateCorpus} from '../migrate-core-json-updates.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {serde_json_from_str,serde_json_to_string} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const C='crate::translation_core::',T=C+'Json',M=C+'Maybe',J=C+'json!',U=C+'json_with_field',P=C+'json_copy';
const dependencyInputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(repositorySourceURL("Cargo.lock",new URL('../../../',import.meta.url)),'utf8')};
const jsonMacroDependencies=loadJsonMacroSourceProof(dependencyInputs),deriveDependencies=loadDeriveDependencyProof(dependencyInputs);
let vectors=[];
const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{if(process.env.ROUTER_OWNED_JSON_FLOW_VECTOR_DIR){mkdirSync(process.env.ROUTER_OWNED_JSON_FLOW_VECTOR_DIR,{recursive:true});writeFileSync(join(process.env.ROUTER_OWNED_JSON_FLOW_VECTOR_DIR,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n');}}});
const files=source=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE});
const project=input=>retain('complete-project',translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies,deriveDependencies,cargoManifest:dependencyInputs.manifest,compilationProfile:PRODUCTION_PROFILE}));
const has=(result,name)=>result.meta.executable.some(row=>row.name===name);
const yes=(result,names)=>{for(const name of names)assert.equal(has(result,name),true,JSON.stringify(result.meta.refused));};
const flowNo=(result,names)=>{for(const name of names)assert.match(result.meta.refused.find(row=>row.name===name)?.message??'',/^owned JSON flow:/u,name);};
const no=(result,names)=>{for(const name of names){assert.equal(has(result,name),false,name);assert.ok(result.meta.refused.some(row=>row.name===name),JSON.stringify(result.meta.refused));}};
const json=value=>{const parsed=serde_json_from_str(JSON.stringify(value));assert.equal(parsed.$,'Ok');return parsed.field0;};
const plain=value=>{const result=serde_json_to_string(value);assert.equal(result.$,'Ok');return JSON.parse(result.field0);};
async function targets(result,verify){const wire=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);retain('complete-targets',{wire,javascript:result.javascript,typescript:result.typescript});try{await verifyTypedTargets(result,verify,{childTimeoutMs:20_000});}catch(error){retain('strict-child-failure',{name:error.name,message:error.message,stdout:error.stdout?.toString('utf8'),stderr:error.stderr?.toString('utf8'),status:error.status,signal:error.signal});throw error;}}
function adopted(source){const input=files(source),proposal=retain('complete-adoption',proposeCoreJsonUpdateCorpus({files:input,dependencyInputs,compilationProfile:PRODUCTION_PROFILE}));for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let restored=row.after.source;for(const edit of [...row.mapping].reverse())if(edit.kind==='substitution'){assert.equal(restored.slice(...edit.after),edit.replacement);restored=restored.slice(0,edit.after[0])+edit.expected+restored.slice(edit.after[1]);}assert.equal(restored,row.before.source);input[row.file]=row.after.source;}return {result:project(input),proposal};}

test('actual private source calls copy borrowed values and move distinct owned parameters',async()=>{
 const result=project(files('pub fn copied(v:&'+T+')->'+T+'{'+P+'(v)}pub fn updated(a:'+T+',b:'+T+')->'+T+'{'+U+'(a,"b",b)}'));
 yes(result,['copied','updated']);await targets(result,({copied,updated})=>{const v=json({nested:[true]});assert.deepEqual(plain(copied(v)),{nested:[true]});assert.deepEqual(plain(updated(json({a:false}),v)),{a:false,b:{nested:[true]}});assert.deepEqual(plain(v),{nested:[true]});});
});
test('same call double consumption reuse after move and borrowed moves are refused',()=>{
 const source='pub fn twice(v:'+T+')->'+T+'{'+U+'(v,"same",v)}pub fn reused(v:'+T+')->'+T+'{let first='+U+'(v,"x",'+J+'(null));'+P+'(&v)}pub fn wrong(v:&'+T+')->'+T+'{'+U+'(v,"x",'+J+'(null))}pub fn copied_late(v:'+T+')->'+T+'{'+U+'(v,"x",'+P+'(&v))}';
 const result=project(files(source));no(result,['twice','reused','wrong','copied_late']);flowNo(result,['twice','reused','copied_late']);
});
test('sequential and conditional original assignments preserve the outer reinitialized value',async()=>{
 const source='pub fn conditional(flag:bool)->'+T+'{let mut doc='+J+'({"start":true});doc["first"]='+J+'(1);if flag{doc["second"]='+J+'([false,"猫😀"]);}doc["last"]='+J+'(null);doc}';
 const {result,proposal}=adopted(source);assert.equal(proposal.proposals[0].selections.length,3);yes(result,['conditional']);await targets(result,({conditional})=>{assert.deepEqual(plain(conditional(false)),{start:true,first:1,last:null});assert.deepEqual(plain(conditional(true)),{start:true,first:1,second:[false,'猫😀'],last:null});});
});
test('branch states permit one move per path and deny a maybe moved continuation',async()=>{
 const source='pub fn paths(v:'+T+',flag:bool)->'+T+'{if flag{'+U+'(v,"yes",'+J+'(true))}else{'+U+'(v,"no",'+J+'(false))}}pub fn exits(v:'+T+',flag:bool)->'+T+'{if flag{return '+U+'(v,"early",'+J+'(true));}'+U+'(v,"late",'+J+'(false))}pub fn maybe(v:'+T+',flag:bool)->'+T+'{if flag{'+U+'(v,"x",'+J+'(null));}v}';
 const result=project(files(source));yes(result,['paths','exits']);no(result,['maybe']);flowNo(result,['maybe']);await targets(result,({paths,exits})=>{assert.deepEqual(plain(paths(json({}),true)),{yes:true});assert.deepEqual(plain(paths(json({}),false)),{no:false});assert.deepEqual(plain(exits(json({}),true)),{early:true});assert.deepEqual(plain(exits(json({}),false)),{late:false});});
});
test('retained loans closures loops and unknown aggregate Drop retain explicit refusals',()=>{
 const source='struct Payload{value:bool}pub fn alias(v:'+T+')->'+T+'{let loan=&v;'+U+'(v,"x",'+P+'(loan))}pub fn captured(v:'+T+')->'+T+'{let f=||'+P+'(&v);'+U+'(v,"x",f())}pub fn looping(v:'+T+')->'+T+'{let mut doc='+J+'({});while false{doc='+U+'(doc,"x",'+J+'(null));}'+U+'(doc,"y",v)}pub fn loan_text(v:'+T+')->'+M+'<'+T+'>{let key=v.as_str()?;Some('+U+'(v,key,'+J+'(null)))}pub fn drop_unknown(v:'+T+',other:Payload)->'+T+'{'+P+'(&v)}pub fn old_mutable()->'+T+'{let mut doc='+J+'({});doc}';
 no(project(files(source)),['alias','captured','looping','loan_text','drop_unknown','old_mutable']);
});
test('actual early return and Option short circuit retain only successful continuation state',async()=>{
 const source='pub fn early(flag:bool,value:'+M+'<&'+C+'Str>)->'+M+'<'+T+'>{let mut doc='+J+'({});if flag{return Some('+J+'({"early":true}));}doc["text"]='+J+'(value?);Some(doc)}';
 const {result,proposal}=adopted(source);assert.equal(proposal.proposals[0].selections.length,1);yes(result,['early']);await targets(result,({early})=>{assert.deepEqual(plain(early(true,Object.freeze({$:'None'})).field0),{early:true});assert.deepEqual(early(false,Object.freeze({$:'None'})),{$:'None'});assert.deepEqual(plain(early(false,Object.freeze({$:'Some',field0:'Ω😀'})).field0),{text:'Ω😀'});});
});
test('lexical rebinding and independent copied arguments do not alias or consume the old value',async()=>{
 const source='pub fn rebinding(v:'+T+')->'+T+'{let v='+P+'(&v);'+U+'('+P+'(&v),"copy",v)}pub fn repeated(v:&'+T+')->'+T+'{let first='+P+'(v);let second='+P+'(v);'+U+'(first,"second",second)}';
 const result=project(files(source));yes(result,['rebinding','repeated']);await targets(result,({rebinding,repeated})=>{const v=json({n:1});assert.deepEqual(plain(rebinding(v)),{n:1,copy:{n:1}});assert.deepEqual(plain(repeated(v)),{n:1,second:{n:1}});assert.deepEqual(plain(v),{n:1});});
});
test('flow checks remain per original declaration and do not waive counterfeits or unrelated bodies',()=>{
 const source='pub fn bad(v:'+T+')->'+T+'{let consumed='+U+'(v,"x",'+J+'(null));v}pub fn ordinary(x:bool)->bool{!x}pub fn good(v:&'+T+')->'+T+'{'+P+'(v)}';
 const input=files(source),result=project(input);no(result,['bad']);flowNo(result,['bad']);yes(result,['ordinary','good']);
 const counterfeit={...input,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE.replace('base[key] = value;','base[key] = json_copy(&value);')};no(project(counterfeit),['good']);
 const unknown=project(files('pub fn bad(v:'+T+')->'+T+'{let alias='+J+'({"v":(if true{v}else{'+J+'(null)})});'+U+'(v,"x",alias)}'));no(unknown,['bad']);
});
