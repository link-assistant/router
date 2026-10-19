import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {serde_json_from_str,serde_json_to_string} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const C='crate::translation_core::',T=C+'Json',M=C+'Maybe',J=C+'json!',U=C+'json_with_field',P=C+'json_copy';
const dependencyInputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const jsonMacroDependencies=loadJsonMacroSourceProof(dependencyInputs),deriveDependencies=loadDeriveDependencyProof(dependencyInputs),hash=value=>createHash('sha256').update(value).digest('hex');
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{if(process.env.ROUTER_JSON_READER_LOAN_VECTOR_DIR){mkdirSync(process.env.ROUTER_JSON_READER_LOAN_VECTOR_DIR,{recursive:true});writeFileSync(join(process.env.ROUTER_JSON_READER_LOAN_VECTOR_DIR,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n');}}});
const files=(source,extra={})=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,...extra});
const project=input=>retain('complete-checked-project',translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies,deriveDependencies,cargoManifest:dependencyInputs.manifest,compilationProfile:PRODUCTION_PROFILE}));
const has=(result,name)=>result.meta.executable.some(row=>row.name===name);
const yes=(result,names)=>{for(const name of names)assert.equal(has(result,name),true,JSON.stringify(result.meta.refused));};
const no=(result,names)=>{for(const name of names){assert.equal(has(result,name),false,name);assert.ok(result.meta.refused.some(row=>row.name===name),JSON.stringify(result.meta.refused));}};
const flowNo=(result,names)=>{no(result,names);for(const name of names)assert.match(result.meta.refused.find(row=>row.name===name).message,/^owned JSON flow:/u,name);};
const json=value=>{const parsed=serde_json_from_str(JSON.stringify(value));assert.equal(parsed.$,'Ok');return parsed.field0;};
const plain=value=>{const encoded=serde_json_to_string(value);assert.equal(encoded.$,'Ok');return JSON.parse(encoded.field0);};
const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'});
async function targets(result,verify){const wire=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);retain('complete-targets',{wire,javascript:result.javascript,typescript:result.typescript});try{await verifyTypedTargets(result,verify,{childTimeoutMs:20_000});}catch(error){retain('strict-child-failure',{name:error.name,message:error.message,stdout:error.stdout?.toString('utf8'),stderr:error.stderr?.toString('utf8'),status:error.status,signal:error.signal});throw error;}}

test('input field loans coexist with updates to an independent fresh output root',async()=>{
 const source='pub fn build(input:&'+T+',flag:bool)->'+T+'{let mut doc='+J+'({"start":true});if let Some(child)=input.get("child"){doc='+U+'(doc,"child",'+P+'(child));}if flag{doc='+U+'(doc,"flag",'+J+'(true));}doc}',result=project(files(source));yes(result,['build']);
 await targets(result,({build})=>{for(const flag of [false,true]){const input=json({child:{text:'猫😀',nested:[true]}}),before=structuredClone(input),output=build(input,flag);assert.deepEqual(plain(output),{start:true,child:{text:'猫😀',nested:[true]},...(flag?{flag:true}:{})});assert.deepEqual(input,before);const child=output.field0.entries.find(row=>row.key==='child').value,original=input.field0.entries.find(row=>row.key==='child').value;assert.notEqual(child,original);}assert.deepEqual(plain(build(json({}),false)),{start:true});});
});
test('actual Option shared inputs and checked let else keep None and Some continuation roots',async()=>{
 const source='pub fn optional(input:'+M+'<&'+T+'>)->'+M+'<'+T+'>{let Some(input)=input else{return None;};let Some(value)=input.get("data") else{return None;};let mut doc='+J+'({});doc='+U+'(doc,"data",'+P+'(value));Some(doc)}pub fn mapped(input:&'+T+')->'+M+'<'+T+'>{let Some(object)=input.as_object() else{return None;};let Some(value)=object.get("data") else{return None;};Some('+P+'(value))}pub fn copied_text(input:&'+T+')->'+M+'<'+T+'>{let Some(value)=input.as_str() else{return None;};let copied='+P+'(input);Some('+J+'({"text":value,"source":copied}))}',result=project(files(source));yes(result,['optional','mapped','copied_text']);
 await targets(result,({optional,mapped,copied_text})=>{assert.deepEqual(optional(none),none);assert.deepEqual(optional(some(json({}))),none);const input=json({data:[false,'Ω😀']});assert.deepEqual(plain(optional(some(input)).field0),{data:[false,'Ω😀']});assert.deepEqual(plain(input),{data:[false,'Ω😀']});assert.deepEqual(plain(mapped(input).field0),[false,'Ω😀']);assert.deepEqual(mapped(json([])),none);assert.deepEqual(plain(copied_text(json('猫😀')).field0),{text:'猫😀',source:'猫😀'});assert.deepEqual(copied_text(json(true)),none);});
});
test('branch joins and same spelling shadows preserve the actual distinct input root',async()=>{
 const source='pub fn branched(left:&'+T+',right:&'+T+',flag:bool)->'+M+'<'+T+'>{let selected=if flag{left.get("pick")}else{right.get("pick")};let Some(selected)=selected else{return None;};Some('+P+'(selected))}pub fn shadow(input:&'+T+')->'+M+'<'+T+'>{let Some(child)=input.get("child") else{return None;};let input='+J+'({});let input='+U+'(input,"copy",'+P+'(child));Some(input)}',result=project(files(source));yes(result,['branched','shadow']);
 await targets(result,({branched,shadow})=>{const a=json({pick:{side:'left'},child:[true]}),b=json({pick:{side:'right'}});assert.deepEqual(plain(branched(a,b,true).field0),{side:'left'});assert.deepEqual(plain(branched(a,b,false).field0),{side:'right'});assert.deepEqual(branched(a,json({}),false),none);assert.deepEqual(plain(shadow(a).field0),{copy:[true]});assert.deepEqual(plain(a),{pick:{side:'left'},child:[true]});});
});
test('live lexical loans reject root consumption replacement and reads after a move',()=>{
 const source='pub fn move_live(v:'+T+')->'+M+'<'+T+'>{let loan=v.get("x");let moved='+U+'(v,"y",'+J+'(null));let Some(loan)=loan else{return None;};Some('+P+'(loan))}pub fn replace_live()->'+M+'<'+T+'>{let mut doc='+J+'({"x":true});let loan=doc.get("x");doc='+J+'({});let Some(loan)=loan else{return None;};Some('+P+'(loan))}pub fn after_move(v:'+T+')->'+M+'<'+T+'>{let moved='+U+'(v,"y",'+J+'(null));let Some(loan)=v.get("x") else{return None;};Some('+P+'(loan))}',result=project(files(source));flowNo(result,['move_live','replace_live','after_move']);
});
test('Option short circuit loans cannot hide a same call move or a borrowed pointee move',()=>{
 const source='pub fn conflict(v:'+T+')->'+M+'<'+T+'>{let child=v.get("x")?;Some('+U+'(v,"copy",'+P+'(child)))}pub fn pointee(v:&'+T+')->'+T+'{'+U+'(v,"x",'+J+'(null))}pub fn mutable(v:&mut '+T+')->'+T+'{'+P+'(v)}pub fn text_key(v:'+T+')->'+M+'<'+T+'>{let key=v.as_str()?;Some('+U+'(v,key,'+J+'(null)))}',result=project(files(source));no(result,['conflict','pointee','mutable','text_key']);flowNo(result,['conflict','text_key']);
});
test('unknown retention Drop loops and counterfeit JSON owners still refuse',()=>{
 const source='struct Payload{value:bool}fn inspect(v:&'+T+')->bool{v.is_null()}pub fn retained(v:&'+T+')->'+T+'{let copied='+P+'(v);let test=inspect(v);'+J+'(test)}pub fn drop_unknown(v:&'+T+',other:Payload)->'+T+'{'+P+'(v)}pub fn looping(v:&'+T+')->'+T+'{let mut doc='+J+'({});while false{doc='+U+'(doc,"x",'+P+'(v));}doc}struct Fake{value:bool}pub fn wrong(v:&Fake)->'+T+'{'+P+'(v)}',result=project(files(source));no(result,['retained','drop_unknown','looping','wrong']);flowNo(result,['retained','drop_unknown','looping']);
 const input=files('pub fn counterfeit(v:&'+T+')->'+T+'{let Some(value)=v.get("x") else{return '+J+'(null);};'+P+'(value)}',{'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE+'\n// forged complete owned source\n'});no(project(input),['counterfeit']);
 const shadow=project(files('enum Shadow{None,Some(bool)}pub fn fake(v:Shadow)->'+T+'{let copied='+P+'(&'+J+'(null));if let Shadow::Some(flag)=v{'+J+'(flag)}else{copied}}'));no(shadow,['fake']);
});
test('complete retained Router source keeps its real already positive and unresolved body outcomes',()=>{
 const provider=readFileSync(new URL('./owned-json-receiving-repair.test.mjs',import.meta.url),'utf8'),rows=[...provider.matchAll(/^const ORIGINAL_STRUCTURED=(.*);$/gmu)];assert.equal(rows.length,1);const original=JSON.parse(rows[0][1]);assert.equal(original.path,'src/structured_output.rs');assert.equal(hash(original.source),'4b7cc5ecbaa57e1f56568e5564390ad1d5df45a2e074edbdba95552af7b0310f');
 const result=project(files('mod actual;',{'src/actual.rs':original.source}));retain('complete-historical-parent-and-current-outcomes',{provider,original,result});yes(result,['actual.required_type']);for(const name of ['chat_format','responses_format','schema_format','chat_to_responses_format','responses_to_chat_format'])assert.ok(has(result,'actual.'+name)||result.meta.refused.some(row=>row.name===name||row.name==='actual.'+name),'every full body retains its actual result; no indexing or helper transfer waiver');
});
test('borrowed returns keep input origins while local roots static escapes and array loans refuse',async()=>{
 const source="pub fn returned<'a,'b>(input:&'a "+T+",key:&'b "+C+"Str)->"+M+"<&'a "+T+'>{let copied='+P+'(input);input.get(key)}pub fn local_escape<\'a>(input:&\'a '+T+')->'+M+'<&\'a '+T+'>{let local='+P+'(input);local.get("keep")}pub fn static_escape(input:&'+T+')->'+M+'<&\'static '+T+'>{let copied='+P+'(input);input.get("keep")}pub fn owned_escape<\'a>(input:'+T+')->'+M+'<&\'a '+T+'>{let copied='+P+'(&input);input.get("keep")}pub fn wrong_key<\'a,\'b>(input:&\'a '+T+',key:&\'b '+C+'Str)->'+M+'<&\'b '+T+'>{let copied='+P+'(input);input.get(key)}pub fn array_loan(input:&'+T+')->'+T+'{let copied='+P+'(input);let view=input.as_array();copied}',result=project(files(source));yes(result,['returned']);no(result,['local_escape','static_escape','owned_escape','wrong_key','array_loan']);flowNo(result,['local_escape','array_loan']);
 await targets(result,({returned})=>{assert.deepEqual(returned(json({}),'keep'),none);const input=json({keep:{x:true}}),selected=input.field0.entries.find(row=>row.key==='keep').value,output=returned(input,'keep');assert.equal(output.$,'Some');assert.equal(output.field0,selected);assert.deepEqual(plain(output.field0),{x:true});});
});
