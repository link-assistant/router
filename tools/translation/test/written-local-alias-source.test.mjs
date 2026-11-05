// Independent written-local regression SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {readLocalAliasInitializer,createWrittenLocalAliasRules} from '../local-alias-written-source.mjs';
import {createBase64LocalArgumentSource} from '../base64-local-argument-source.mjs';
import {createPrimitiveLocalArgumentSource,readPrimitiveAliasOperand,readPrimitiveWrittenAliasDomain} from '../primitive-local-argument-source.mjs';
import {createTextLocalArgumentSource} from '../text-local-argument-source.mjs';
import {createPrimitiveCarrierLocalSource} from '../primitive-carrier-local-source.mjs';
import {createJsonFieldLocalSource} from '../json-field-local-source.mjs';
import {createJsonSliceLocalSource} from '../json-slice-local-source.mjs';
import {createOwnedJsonLocalSource} from '../owned-json-local-source.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {INTEGER_NATIVE_SOURCE} from '../integer-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from '../json-fields-native-source.mjs';
import {JSON_ITERATION_NATIVE_SOURCE} from '../json-iteration-native-source.mjs';
import {JSON_STATE_NATIVE_SOURCE} from '../json-state-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {json_macro_null as nil,json_macro_bool as boolean,json_macro_string as text,json_macro_array as array,json_macro_object as object} from '../json-macro-runtime.mjs';
import {prepareWrittenLocalAliasSources} from '../prepare-written-local-alias-sources.mjs';
const limits={timeout:60000},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),C='crate::translation_core::',T=C+'Json',root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const carrierRole=rows=>({ 'Option<u64>':{kind:'option',domain:'u64'},'Option<bool>':{kind:'option',domain:'bool'} })[rows.map(row=>row.text).join('')]??null;
const families=[
 ['base64',createBase64LocalArgumentSource,'owned-text','String','&str'],
 ['integer',createPrimitiveLocalArgumentSource,'u64','u64','i64'],
 ['text',createTextLocalArgumentSource,'text-owned','String','&str'],
 ['carrier',(rows,parameters)=>createPrimitiveCarrierLocalSource(rows,parameters,new Set(parameters.keys()),{readWrittenRole:carrierRole}),{kind:'option',domain:'u64'},'Option<u64>','Option<bool>'],
 ['JSON field',(rows,parameters)=>createJsonFieldLocalSource(rows,parameters,new Set(parameters.keys())),'json-reference','&'+T,'&str'],
 ['JSON slice',(rows,parameters)=>createJsonSliceLocalSource(rows,parameters,new Set(parameters.keys())),'json-slice','&['+T+']','Vec<'+T+'>'],
 ['owned JSON',(rows,parameters)=>createOwnedJsonLocalSource(rows,parameters,new Set(parameters.keys())),{kind:'result',borrowed:false},C+'Outcome<'+T+',::std::string::String>','&'+C+'Outcome<'+T+',::std::string::String>'],
];
for(const [name,make,kind,type,wrong]of families)test(name+' actual typed aliases require matching known operands and retain lexical timing scopes and false authorities',limits,()=>{
 const source='let alias:'+type+'=value;probe(alias);{let hidden:'+type+'=alias;probe(hidden);}probe(hidden);let mismatch:'+wrong+'=value;probe(mismatch);let unknown:'+type+'=effect();probe(unknown);let mut mutable:'+type+'=value;probe(mutable);',rows=tokens(source),provider=make(rows,new Map([['value',kind]])),probes=rows.flatMap((row,at)=>row.text==='probe'?[{position:row.start,name:rows[at+2].text}]:[]);assert.ok(provider);for(const [at,probe]of probes.entries()){assert.deepEqual(provider.at(probe.position).get(probe.name),at<2?kind:undefined);const evidence=provider.evidence(probe.name);if(evidence){assert.equal(evidence.sourceAuthority,false);assert.equal(evidence.semanticAuthority,false);assert.ok(source.slice(...evidence.span).includes(':'+type+'='));}else assert.ok(at>=2);}assert.throws(()=>provider.at(0),/monotonic/u);
});
test('bounded actual type tokens preserve array semicolons lifetimes and unknown or incomplete declaration refusals',limits,()=>{
 for(const source of ['let value:[u8;32]=input;','let value:&\'a str=input;','let value:Option<u64>=input;','let value:Vec<Vec<u8>>=input;']){const rows=tokens(source),selected=readLocalAliasInitializer(rows,0,part=>part.map(row=>row.text).join(''));assert.equal(rows[selected.start].text,'input');}for(const source of ['let mut value:u64=input;','let value:u64;','let value:(u64]=input;','let value:Other=input;','let value:{u64}=input;'])assert.equal(readLocalAliasInitializer(tokens(source),0,part=>readPrimitiveWrittenAliasDomain(part)),null,source);
 const typed=tokens('let alias:u64=selected(value);probe(alias);'),start=typed.find(row=>row.text==='selected'),known=createWrittenLocalAliasRules({readWrittenDomain:readPrimitiveWrittenAliasDomain,readOperand:readPrimitiveAliasOperand,acceptResult:event=>event.returnsKind});assert.equal(known.initializerStart(0,typed),typed.indexOf(start));assert.equal(known.acceptResult({span:[start.start,start.end],returnsKind:'i64'}),null);assert.equal(known.acceptResult({span:[start.start,start.end],returnsKind:'u64'}),'u64');assert.equal(known.readOperand(tokens('other'),new Map()),null);
});
test('written fixed scalar and portable count literals retain exact independent minimum maximum sign and overflow boundaries',limits,()=>{
 for(const [literal,domain,wanted]of [['255','u8',true],['256','u8',false],['-128','i8',true],['-129','i8',false],['65535','u16',true],['65536','u16',false],['-32768','i16',true],['-32769','i16',false],['4294967295','u32',true],['4294967296','u32',false],['-2147483648','i32',true],['-2147483649','i32',false],['18446744073709551615','u64',true],['18446744073709551616','u64',false],['-9223372036854775808','i64',true],['-9223372036854775809','i64',false],['340282366920938463463374607431768211455','u128',true],['340282366920938463463374607431768211456','u128',false],['-170141183460469231731687303715884105728','i128',true],['-170141183460469231731687303715884105729','i128',false],['-1','u64',false]])assert.equal(readPrimitiveAliasOperand(tokens(literal),new Map(),domain)?.kind??null,wanted?domain:null,literal+':'+domain);
 for(const [literal,wanted]of [['0',true],['4294967295',true],['4294967296',false],['-1',false]]){const source='let count:usize='+literal+';probe(count);',rows=tokens(source),provider=createTextLocalArgumentSource(rows,new Map());assert.equal(provider.at(rows.find(row=>row.text==='probe').start).get('count'),wanted?'usize-count':undefined);}
});
const original=[
 'pub fn integer(value:u64)->u64{let alias:u64=value;let first:u64=alias.saturating_add(1);first.saturating_mul(2)}',
 'pub fn copied(value:&str)->String{let first:String=value.to_owned();let second:String=first.repeat(2);second}',
 'pub fn repeated(value:String,count:usize)->String{let owned:String=value;let view:&str=owned.as_str();let amount:usize=count;view.repeat(amount)}',
 `pub fn lookup(value:&${T})->${C}Maybe<&${T}>{let alias:&${T}=value;let key:&str="label";alias.get(key)}`,
 `pub fn mapped(values:&[${T}])->Vec<${T}>{let items:&[${T}]=values;items.iter().map(|value|{value.clone()}).collect()}`,
 `pub fn accumulated(values:&[${T}],initial:${T})->${T}{let items:&[${T}]=values;let mut result=initial;for value in items{result=crate::translation_state_core::json_append(result,value.clone());}result}`,
].join('\n');
function input(){const modules={translation_integer_core:INTEGER_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_collections_core:JSON_ITERATION_NATIVE_SOURCE,translation_state_core:JSON_STATE_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 keeps source coordinates\n'+original,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
test('five real bulk stages preserve whole typed caller bodies CST and source inverses before independent JS and strict TS behavior',limits,async()=>{
 let request=input();for(const [stage,wanted]of [['integer-methods',2],['text-methods',3],['json-fields',1],['json-collections',1],['json-loops',1]]){const proposal=await proposeSourceBoundOwnedCoreStage(stage,request),row=proposal.proposals.find(part=>part.file==='src/lib.rs');assert.equal(row.edits.length,wanted,stage);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,request.files['src/lib.rs']);assert.equal(proposal.executableAdmission,false);request={...request,files:proposal.after};}
 const {files}=request,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});for(const name of ['integer','copied','repeated','lookup','mapped','accumulated'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.integer(0n),2n);assert.equal(api.integer(18446744073709551615n),18446744073709551615n);assert.equal(api.copied('é😀'),'é😀é😀');assert.equal(api.repeated('é😀',2n),'é😀é😀');assert.equal(api.repeated('é😀',0n),'');assert.deepEqual(api.lookup(object([['label',boolean(false)]])),{$:'Some',field0:boolean(false)});assert.deepEqual(api.lookup(object([])),{$:'None'});const values=Object.freeze([nil(),boolean(false),text('é😀')]);assert.deepEqual(api.mapped(values),values);assert.deepEqual(api.accumulated(values,array([])),array(values));assert.deepEqual(api.accumulated([],text('unchanged')),text('unchanged'));},{childTimeoutMs:20000});
});
test('eleven complete source equations retain complete original owners both real phases and all inverses',limits,()=>{
 const plan=prepareWrittenLocalAliasSources();assert.equal(plan.files.length,11);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
