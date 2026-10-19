import testCase from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,Hash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {proposeCoreJsonIndicesCorpus} from '../migrate-core-json-indices.mjs';
import {proposeCoreJsonCopiesCorpus} from '../migrate-core-json-copies.mjs';
import {proposeCoreJsonUpdateCorpus} from '../migrate-core-json-updates.mjs';
import {proposeCoreAdoptionSequence,CORE_ADOPTION_PACKET_LIMITS as L} from '../propose-core-adoption-corpus.mjs';
import {translateProject} from '../project.mjs';
import {emitJavaScript} from '../extensions/host-contracts.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {serde_json_from_str,serde_json_to_string} from '../extensions/json-runtime.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const C='crate::translation_core::',T=C+'Json',J=C+'json!',hash=value=>createHash('sha256').update(value).digest('hex');
const dependencyInputs={manifest:fs.readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:fs.readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')},jsonMacroDependencies=loadJsonMacroSourceProof(dependencyInputs),deriveDependencies=loadDeriveDependencyProof(dependencyInputs);
const files=source=>({'src/lib.rs':(source.startsWith('\uFEFF')?'\uFEFFpub mod translation_core;\n'+source.slice(1):'pub mod translation_core;\n'+source),'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE});
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{if(process.env.ROUTER_JSON_ERROR_FLOW_VECTOR_DIR){fs.mkdirSync(process.env.ROUTER_JSON_ERROR_FLOW_VECTOR_DIR,{recursive:true});fs.writeFileSync(join(process.env.ROUTER_JSON_ERROR_FLOW_VECTOR_DIR,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n');}}});
function inverse(row){
 assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let old=0,current=0,source=row.after.source;
 for(const part of row.mapping){assert.equal(part.before[0],old);assert.equal(part.after[0],current);if(part.kind==='unchanged')assert.equal(row.before.source.slice(...part.before),row.after.source.slice(...part.after));else{assert.equal(row.before.source.slice(...part.before),part.expected);assert.equal(row.after.source.slice(...part.after),part.replacement);}old=part.before[1];current=part.after[1];}
 assert.equal(old,row.before.source.length);assert.equal(current,row.after.source.length);for(const part of [...row.mapping].reverse())if(part.kind==='substitution')source=source.slice(0,part.after[0])+part.expected+source.slice(part.after[1]);assert.equal(source,row.before.source);
}
function propose(input,extra={}){const value=proposeCoreJsonCopiesCorpus({files:input,compilationProfile:PRODUCTION_PROFILE,dependencyInputs,...extra});for(const row of value.proposals)inverse(row);return retain('complete-proposal',{input,value}).value;}
const count=result=>result.proposals.reduce((sum,row)=>sum+row.selections.length,0);
const project=input=>retain('complete-project',translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:dependencyInputs.manifest,jsonMacroDependencies,deriveDependencies}));
const no=(result,names)=>{for(const name of names){assert.equal(result.meta.executable.some(row=>row.name===name),false,name);assert.ok(result.meta.refused.some(row=>row.name===name),name+': '+JSON.stringify(result.meta.refused));}};
const yes=(result,names)=>{for(const name of names)assert.ok(result.meta.executable.some(row=>row.name===name),name+': '+JSON.stringify(result.meta.refused));};
const json=value=>{const result=serde_json_from_str(JSON.stringify(value));assert.equal(result.$,'Ok');return result.field0;};
const native=value=>{const result=serde_json_to_string(value);assert.equal(result.$,'Ok');return JSON.parse(result.field0);};
async function targets(result,verify){const wire=JSON.stringify(result.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);retain('complete-wire-targets',{wire,javascript:result.javascript,typescript:result.typescript});await verifyTypedTargets(result,verify,{childTimeoutMs:20_000});}
const M=C+'Maybe',R=C+'Outcome',F=C+'format!',COPY=C+'json_copy';
const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'});
function outcome(value){assert.ok(['Ok','Err'].includes(value.$));if(value.$==='Err')return {error:value.field0};const optional=value.field0;assert.ok(['Some','None'].includes(optional.$));return {ok:optional.$==='None'?null:native(optional.field0)};}
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const [key,value]of Object.entries(node))if(!['type','span','pinnedStandardBodyProof','sourceFrameProof','originalCallbackProof','sourceSharedPatternProof'].includes(key))for(const child of Array.isArray(value)?value:[value]){const found=find(child,predicate);if(found)return found;}return null;}
const basic='pub fn payload(value:&'+T+',fail:bool)->'+R+'<'+M+'<'+T+'>,String>{if fail{return Err('+F+'("{}","bad 猫😀"));}Ok(Some('+COPY+'(value)))}';

test('owned String errors remain linear while complete canonical success and empty branches execute in both targets',async()=>{
 const result=project(files(basic+'pub fn optional(value:'+M+'<&'+T+'>)->'+R+'<'+M+'<'+T+'>,String>{let Some(value)=value else{return Ok(None);};Ok(Some('+COPY+'(value)))}'));yes(result,['payload','optional']);
 await targets(result,api=>{for(const value of [null,false,1,'猫😀',[true,null],{nested:{text:'Ω'}}]){const input=json(value),before=structuredClone(input);assert.deepEqual(outcome(api.payload(input,false)),{ok:value});assert.deepEqual(outcome(api.payload(input,true)),{error:'bad 猫😀'});assert.deepEqual(outcome(api.optional(some(input))),{ok:value});assert.deepEqual(input,before);}assert.deepEqual(outcome(api.optional(none)),{ok:null});});
});
test('transient shared Json and Map Result question marks keep lazy errors receiver roots and None propagation',async()=>{
 const source='pub fn field(value:&'+T+',divisor:u64)->'+R+'<'+M+'<'+T+'>,String>{let child=value.get("v").ok_or_else(||'+F+'("{}",1u64/divisor))?;Ok(Some('+COPY+'(child)))}pub fn object(value:&'+T+')->'+R+'<'+M+'<'+T+'>,String>{let object=value.as_object().ok_or_else(||'+F+'("{}","object required"))?;let Some(child)=object.get("v")else{return Ok(None);};Ok(Some('+COPY+'(child)))}pub fn filtered(value:&'+T+')->'+R+'<'+M+'<'+T+'>,String>{let child=value.get("v").filter(|child|child.is_object()).ok_or_else(||'+F+'("{}","object child required"))?;Ok(Some('+COPY+'(child)))}pub fn nested(values:&['+T+'])->Vec<'+T+'>{'+C+'json_filter_map(values,|p|{let child=if let Some(value)=p.get("nested"){value.get("url")}else{None};if let Some(value)=child{Some('+COPY+'(value))}else{None}})}',result=project(files(source));yes(result,['field','object','filtered','nested']);
 await targets(result,api=>{for(const value of [{v:false},{v:null},{v:{text:'猫😀'}}]){const input=json(value),before=structuredClone(input);assert.deepEqual(outcome(api.field(input,0n)),{ok:value.v});assert.deepEqual(outcome(api.object(input)),{ok:value.v});assert.deepEqual(input,before);}assert.deepEqual(outcome(api.field(json({}),2n)),{error:'0'});assert.throws(()=>api.field(json({}),0n),/zero|division/i);assert.deepEqual(outcome(api.object(json({}))),{ok:null});assert.deepEqual(outcome(api.object(json(null))),{error:'object required'});for(const value of [{},{v:null},{v:false},{v:'text'}])assert.deepEqual(outcome(api.filtered(json(value))),{error:'object child required'});const object={text:'猫😀'},input=json({v:object}),before=structuredClone(input);assert.deepEqual(outcome(api.filtered(input)),{ok:object});assert.deepEqual(input,before);const values=Object.freeze([{}, {nested:{}}, {nested:{url:null}}, {nested:{url:'猫😀'}}, {nested:{url:false}}].map(json)),original=structuredClone(values);assert.deepEqual(api.nested(values).map(native),[null,'猫😀',false]);assert.deepEqual(values,original);assert.deepEqual(api.nested(Object.freeze([])),[]);});
});
test('readonly original helper bodies close forward declarations with borrowed text and fresh JSON results',async()=>{
 const outer='pub fn outer(value:&'+T+')->'+R+'<'+M+'<'+T+'>,String>{let label=label(value)?;validate(value)?;let output=fresh(label);Ok(Some('+C+'json_with_field(output,"copy",'+COPY+'(value))))}';
 const helpers='use serde_json::Value;fn label(value:&'+T+')->Result<&str,String>{value.get("label").and_then(Value::as_str).ok_or_else(||'+F+'("{}","label required"))}fn validate(value:&'+T+')->Result<(),String>{if value.is_null(){Err('+F+'("{}","null"))}else{Ok(())}}fn fresh(label:&str)->'+T+'{'+J+'({"label":label})}';
 for(const source of [outer+helpers,helpers+outer]){const result=project(files(source));yes(result,['outer','label','validate','fresh']);await targets(result,api=>{for(const label of ['','猫😀','e\u0301']){const value={label,other:[true]},input=json(value),before=structuredClone(input);assert.deepEqual(outcome(api.outer(input)),{ok:{label,copy:value}});assert.deepEqual(input,before);}assert.deepEqual(outcome(api.outer(json({}))),{error:'label required'});});}
});
test('unknown error Drop retained helpers cycles stored borrowed Results and repeated linear moves stay refused',()=>{
 const sources=[
  'pub struct Error{message:String}pub fn bad(value:&'+T+',error:Error)->Result<'+T+',Error>{let copy='+COPY+'(value);Err(error)}',
  'pub fn bad(value:&'+T+',error:String)->'+R+'<'+M+'<'+T+'>,String>{let moved:Result<(),String>=Err(error);let copy='+COPY+'(value);Err(error)}',
  'pub fn bad(value:&'+T+')->'+R+'<'+M+'<'+T+'>,String>{let pending=value.get("v").ok_or_else(||'+F+'("{}","missing"));let child=pending?;Ok(Some('+COPY+'(child)))}',
  'fn label(value:&'+T+')->Result<&str,String>{label(value)}pub fn bad(value:&'+T+')->'+R+'<'+M+'<'+T+'>,String>{let text=label(value)?;Ok(Some('+COPY+'(value)))}',
  'fn label(value:&'+T+')->Result<&str,String>{unknown(value)}pub fn bad(value:&'+T+')->'+R+'<'+M+'<'+T+'>,String>{let text=label(value)?;Ok(Some('+COPY+'(value)))}',
  'fn helper(value:&'+T+')->Result<(),String>{let ignored=std::fs::read_to_string("effect");Ok(())}pub fn bad(value:&'+T+')->'+R+'<'+M+'<'+T+'>,String>{helper(value)?;Ok(Some('+COPY+'(value)))}',
 ];for(const source of sources)no(project(files(source)),['bad']);
});
test('both complete current structured builders execute independent schema strict and error cases after fresh proposals',async()=>{
 const path='src/structured_output.rs',source=fs.readFileSync(new URL('../../../'+path,import.meta.url),'utf8'),input={...files('mod actual;'),'src/actual.rs':source},indices=proposeCoreJsonIndicesCorpus({files:input,dependencyInputs}),copies=proposeCoreJsonCopiesCorpus({files:indices.after,dependencyInputs}),updates=proposeCoreJsonUpdateCorpus({files:copies.after,dependencyInputs});for(const stage of [indices,copies,updates])for(const row of stage.proposals)inverse(row);const result=project(updates.after);retain('complete-current-parent-and-stages',{path,source,sha256:hash(source),indices,copies,updates,result});yes(result,['actual.chat_to_responses_format','actual.responses_to_chat_format','actual.required_type','actual.validate_name_and_strict','actual.generic_object_format']);
 await targets(result,api=>{
  const chat=api['actual.chat_to_responses_format'],responses=api['actual.responses_to_chat_format'];assert.deepEqual(outcome(chat(none)),{ok:null});assert.deepEqual(outcome(responses(none)),{ok:null});
  for(const type of ['text','json_object']){assert.deepEqual(outcome(chat(some(json({type})))),{ok:{type}});assert.deepEqual(outcome(responses(some(json({format:{type}})))),{ok:{type}});}
  for(const strict of [undefined,false,true]){const schema={type:'object',description:'猫😀'},definition={name:'schema_1',schema,...(strict===undefined?{}:{strict})},chatInput={type:'json_schema',json_schema:definition},responseInput={format:{type:'json_schema',...definition}},a=json(chatInput),b=json(responseInput),beforeA=structuredClone(a),beforeB=structuredClone(b);assert.deepEqual(outcome(chat(some(a))),{ok:{type:'json_schema',...definition}});assert.deepEqual(outcome(responses(some(b))),{ok:{type:'json_schema',json_schema:definition}});assert.deepEqual(a,beforeA);assert.deepEqual(b,beforeB);}
  for(const [value,error]of [[{},'response_format.type must be a non-empty string'],[{type:'json_schema',json_schema:{}},'response_format.json_schema.name must be a non-empty string'],[{type:'json_schema',json_schema:{name:'ok',schema:{},strict:'yes'}},'response_format.json_schema.strict must be a boolean'],[{type:'json_schema',json_schema:{name:'ok',schema:false}},'response_format.json_schema.schema must be an object']])assert.deepEqual(outcome(chat(some(json(value)))),{error});
  assert.deepEqual(outcome(responses(some(json({format:{type:'json_schema',name:'ok',schema:false}})))),{error:'text.format.schema must be an object'});
 });
});
test('new Result propagation preserves local named static error and foreign owner lifetime refusals',()=>{
 const sources=[
  'pub fn bad(value:&'+T+')->Result<&\'static str,String>{let copy='+COPY+'(value);value.as_str().ok_or_else(||'+F+'("{}","missing"))}',
  'pub fn bad<\'a>(value:&\'a '+T+',error:&\'a str)->Result<'+T+',&\'a str>{let child=value.get("v").ok_or_else(||error)?;Ok('+COPY+'(child))}',
  'pub fn bad(value:&'+T+')->Result<&str,String>{let text='+F+'("{}","owned");let copy='+COPY+'(value);Ok(&text)}',
  'pub struct Owner{value:String}pub fn bad(value:&'+T+',owner:&Owner)->Result<&Owner,String>{let copy='+COPY+'(value);Some(owner).ok_or_else(||'+F+'("{}","none"))}',
 ];for(const source of sources)no(project(files(source)),['bad']);
});
test('actual function-tail text matches preserve enclosing returns ordered arms and error laziness',async()=>{
 const source='pub fn choose(value:&'+T+',kind:&str)->'+R+'<'+M+'<'+T+'>,String>{match kind{"none"=>Ok(None),"copy"=>{if value.is_null(){return Err('+F+'("{}","null"));}Ok(Some('+COPY+'(value)))},other=>Err('+F+'("unknown: {other}"))}}',result=project(files(source));yes(result,['choose']);
 await targets(result,api=>{const input=json({v:'猫😀'}),before=structuredClone(input);assert.deepEqual(outcome(api.choose(input,'none')),{ok:null});assert.deepEqual(outcome(api.choose(input,'copy')),{ok:{v:'猫😀'}});assert.deepEqual(outcome(api.choose(json(null),'copy')),{error:'null'});assert.deepEqual(outcome(api.choose(input,'Ω')),{error:'unknown: Ω'});assert.deepEqual(input,before);});
 const scalarSource='pub fn nested(kind:&str,flag:bool)->u8{match kind{"猫"=>{if flag{return 7;}8},_=>9}}',scalar=project(files(scalarSource));yes(scalar,['nested']);
 await targets(scalar,api=>{for(const [kind,flag,wanted]of [['猫',true,7n],['猫',false,8n],['Ω',true,9n],['',false,9n]])assert.equal(api.nested(kind,flag),wanted);});
 for(const source of [
  'pub fn bad(kind:&str,flag:bool)->u8{let value=match kind{"猫"=>{if flag{return 7;}8},_=>9};value}',
  'pub fn bad(kind:String,flag:bool)->u8{match kind{"猫"=>{if flag{return 7;}8},_=>9}}',
  'pub fn bad(kind:&mut str,flag:bool)->u8{match kind{"猫"=>{if flag{return 7;}8},_=>9}}',
 ])no(project(files(source)),['bad']);
});
test('semantic re-emission rejects changed Result errors format bodies layouts and private source associations',()=>{
 const result=project(files('pub fn checked(value:&'+T+')->'+R+'<'+M+'<'+T+'>,String>{let child=value.get("v").ok_or_else(||'+F+'("{}","missing"))?;Ok(Some('+COPY+'(child)))}'));yes(result,['checked']);const wire=JSON.stringify(result.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);retain('complete-reemitted',emitJavaScript(parseProgram(wire)));
 for(const [name,mutate]of [
  ['standard-source',node=>{node.pinnedStandardBodyProof.syntaxSha256='0'.repeat(64);}],
  ['outer-result',node=>{node.type={...node.type,rustReference:{kind:'mutable',pointee:node.type}};}],
  ['receiver',node=>{const variable=find(node.body,value=>value.k==='var');assert.ok(variable);variable.name='foreign';}],
 ]){const program=parseProgram(wire),node=find([...program.declarations.values()],value=>value.k==='routerPinnedStandardBody'&&value.pinnedStandardBodyProof?.method==='ok_or_else');assert.ok(node,name);mutate(node);retain('tamper',{name,wire:serializeProgram(program)});assert.throws(()=>emitJavaScript(program),/source|body|Result|type|original|unbound|receiver|private|changed/i,name);}
 const filtered=project(files('pub fn checked(value:&'+T+')->'+R+'<'+M+'<'+T+'>,String>{let child=value.get("v").filter(|child|child.is_object()).ok_or_else(||'+F+'("{}","missing"))?;Ok(Some('+COPY+'(child)))}'));yes(filtered,['checked']);const filterWire=JSON.stringify(filtered.meta.targetSemanticProgram);retain('actual-selected-filter-emission',emitJavaScript(parseProgram(filterWire)));for(const mutation of ['proof','layout']){const changed=parseProgram(filterWire),node=find([...changed.declarations.values()],value=>value.k==='routerPinnedOptionCallbackBody'&&value.originalCallbackProof?.method==='filter');assert.ok(node);if(mutation==='proof')node.originalCallbackProof.key='0'.repeat(64);else{const owner=changed.declarations.get(node.type.name);assert.ok(owner);owner.ctors.find(ctor=>ctor.name==='Some').fields[0].type={kind:'bool'};}retain('selected-filter-tamper',{mutation,wire:serializeProgram(changed)});assert.throws(()=>emitJavaScript(changed),/source|body|layout|payload|Option|changed|private|type/i,mutation);}
 // The exact previously issued loan survives source-coordinate specialization;
 // altering either its actual loan envelope or borrowed value still refuses.
 for(const mutation of ['loan-span','loan-value','loan-proof']){
  const changed=parseProgram(filterWire),loan=find([...changed.declarations.values()],node=>node.k==='routerOriginalCallbackLoan'&&node.originalLoanProof?.profile==='original-standard-ephemeral-callback-loan-v1');assert.ok(loan,mutation);
  if(mutation==='loan-span')loan.type.rustReference.span.start++;else if(mutation==='loan-proof')loan.originalLoanProof.key='0'.repeat(64);else{const variable=find(loan.value,node=>node.k==='var');assert.ok(variable);variable.name='foreign_loan';}
  retain('actual-filter-loan-tamper',{mutation,wire:serializeProgram(changed)});assert.throws(()=>emitJavaScript(changed),/source|body|loan|frame|original|unbound|changed|private|type/i,mutation);
 }
 const ordering=project(files('pub fn ordering(values:&['+T+'])->Vec<'+T+'>{'+C+'json_map(values,|value|{if value.is_null(){let copy='+COPY+'(value);copy}else{let copy='+COPY+'(value);copy}})}'));yes(ordering,['ordering']);const orderWire=JSON.stringify(ordering.meta.targetSemanticProgram),reordered=parseProgram(orderWire),conditional=find([...reordered.declarations.values()],node=>node.k==='if'&&node.then?.k==='let'&&node.else?.k==='let');assert.ok(conditional);const replacement=Object.fromEntries(Object.entries(conditional).reverse());for(const key of Object.keys(conditional))delete conditional[key];Object.assign(conditional,replacement);retain('semantic-key-order-reemission',emitJavaScript(reordered));
 const fallbackSource='pub fn renamed(value:&'+T+',kind:&str)->'+R+'<'+M+'<'+T+'>,String>{match kind{"copy"=>Ok(Some('+COPY+'(value))),other=>Err('+F+'("unknown: {other}"))}}',fallback=project(files(fallbackSource));yes(fallback,['renamed']);const fallbackWire=JSON.stringify(fallback.meta.targetSemanticProgram);retain('actual-enclosing-fallback-reemission',emitJavaScript(parseProgram(fallbackWire)));
 const wrongFallback=parseProgram(fallbackWire),renamedEntries=[...wrongFallback.declarations.values()].filter(row=>row.k==='fn'&&(row.fullName==='renamed'||row.fullName==='rp_'+Buffer.from('renamed').toString('hex')));assert.equal(renamedEntries.length,1);assert.ok(renamedEntries[0].params.some(param=>param.name==='kind'));const formatter=find(renamedEntries[0].body,node=>node.k==='routerConstObligation'&&node.sourceFeature==='router-core-format'&&find(node,child=>child.k==='var'&&child.name==='other'));assert.ok(formatter);const renamed=find(formatter,node=>node.k==='var'&&node.name==='other');assert.ok(renamed);assert.equal(files(fallbackSource)['src/lib.rs'].slice(renamed.span.start,renamed.span.end),'other');renamed.name='kind';retain('bound-but-wrong-fallback-tamper',serializeProgram(wrongFallback));assert.throws(()=>emitJavaScript(wrongFallback),/source|body|changed|original|private|frame|unbound/i);
 const program=parseProgram(wire),format=find([...program.declarations.values()],node=>node.formatProvenance);assert.ok(format);format.type={...format.type,rustOwnership:{kind:'borrowed',source:'str'}};retain('format-type-tamper',serializeProgram(program));assert.throws(()=>emitJavaScript(program),/source|body|flow|ownership|type|changed/i);
 const withHelper=project(files('fn helper(value:&'+T+')->Result<(),String>{if value.is_null(){Err('+F+'("{}","null"))}else{Ok(())}}pub fn checked(value:&'+T+')->'+R+'<'+M+'<'+T+'>,String>{helper(value)?;Ok(Some('+COPY+'(value)))}'));yes(withHelper,['helper','checked']);const helperWire=JSON.stringify(withHelper.meta.targetSemanticProgram);retain('complete-helper-reemission',emitJavaScript(parseProgram(helperWire)));const altered=parseProgram(helperWire),helper=[...altered.declarations.values()].find(row=>row.k==='fn'&&(row.fullName==='helper'||row.fullName==='rp_'+Buffer.from('helper').toString('hex')));assert.ok(helper);const predicate=find(helper.body,node=>node.k==='routerHostCall'&&node.id==='serde_json_value_is_null');assert.ok(predicate);predicate.id='serde_json_value_is_boolean';retain('actual-helper-body-tamper',serializeProgram(altered));assert.throws(()=>emitJavaScript(altered),/source|helper|body|changed/i);
});
