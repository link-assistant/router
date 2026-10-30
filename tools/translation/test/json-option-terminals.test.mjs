// Independent optional-field regression SOURCE. All new cases are UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expandCanonicalJsonOptionTerminal,expandCanonicalJsonReaderClosure} from '../canonical-json-option-terminal-normalization.mjs';
import {proposeCoreJsonReadersCorpus,iterateCoreJsonReadersCorpusPackets} from '../migrate-core-json-readers.mjs';
import {prepareJsonOptionTerminalSources} from '../prepare-json-option-terminal-sources.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {serde_json_from_str} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},C='crate::translation_core::',T=C+'Json';
const dependencyInputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const files=source=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE});
const options=source=>({files:files(source),dependencyInputs,compilationProfile:PRODUCTION_PROFILE}),propose=source=>proposeCoreJsonReadersCorpus(options(source)),selected=value=>value.proposals.flatMap(row=>row.selections);
function json(source){const result=serde_json_from_str(source);assert.equal(result.$,'Ok');return result.field0;}
function inverse(row){for(const name of ['before','intermediate','after'])assert.equal(transportConcreteSyntaxMeta(row[name].meta).source,row[name].source);for(const stage of [...row.stages,row]){let source=stage.after.source;for(const part of [...stage.mapping].reverse())if(part.kind==='substitution'){assert.equal(source.slice(...part.after),part.replacement);source=source.slice(0,part.after[0])+part.expected+source.slice(part.after[1]);}assert.equal(source,stage.before.source);}assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);assert.equal(row.executableAdmission,false);}
test('fixed eager and presence equations preserve receiver and fallback positions and rebind only generated paths',limits,()=>{
 const receiver='get("::core::option::Option::Some Ω😀")',input='__router_json_reader_0',payload='__router_json_reader_1',fallback='__router_json_reader_2';
 const eager=expandCanonicalJsonOptionTerminal(receiver,'unwrap_or','fallback()' ,input,payload,fallback);assert.equal(eager.source,'{ let '+input+' = '+receiver+'; let '+fallback+' = fallback(); if let ::core::option::Option::Some('+payload+') = '+input+' { '+payload+' } else { '+fallback+' } }');assert.deepEqual(eager.evaluationOrder,['receiver-once','fallback-once-even-when-Some','select-payload-or-fallback']);assert.ok(eager.repository.includes('"::core::option::Option::Some Ω😀"'));assert.equal(eager.paths.length,1);
 for(const [method,yes,no]of [['is_some','true','false'],['is_none','false','true']]){const row=expandCanonicalJsonOptionTerminal(receiver,method,null,input,payload,null);assert.ok(row.source.endsWith('Some(_) = '+input+' { '+yes+' } else { '+no+' } }'));assert.deepEqual(row.evaluationOrder,['receiver-once','inspect-presence']);for(const path of row.paths)assert.equal(row.source.slice(...path.span),path.expected);}
 const closure=expandCanonicalJsonReaderClosure(receiver,'child','{ child.get("url") }',input,payload);assert.ok(closure.source.includes('{ let child = '+payload+'; { child.get("url") } }'));assert.equal(closure.paths.length,2);assert.deepEqual(closure.evaluationOrder,['receiver-once','Some-bind-and-run-body-once','None-without-body']);for(const path of closure.paths)assert.equal(closure.source.slice(...path.span),path.expected);
 let calls=0;const hook={toString(){calls++;return 'value';}};for(const invoke of [()=>expandCanonicalJsonOptionTerminal(hook,'is_some',null,input,payload,null),()=>expandCanonicalJsonOptionTerminal('value','unwrap_or',hook,input,payload,fallback),()=>expandCanonicalJsonReaderClosure('value',hook,'body',input,payload)])assert.throws(invoke);assert.equal(calls,0);assert.throws(()=>expandCanonicalJsonOptionTerminal('value','unwrap_or_else','body',input,payload,fallback));
});
const source="pub fn nested<'a>(value:&'a "+T+",key:&str)->Option<&'a str>{value.get(\"image_url\").and_then(|child|{child.get(key)}).and_then("+T+'::as_str)}'+
 "pub fn fallback<'a>(value:&'a "+T+",default:&'a str)->&'a str{value.get(\"kind\").and_then("+T+'::as_str).unwrap_or(default,)}'+
 'pub fn numeric(value:&'+T+',default:u64)->u64{value.get("count").and_then('+T+'::as_u64).unwrap_or(default)}'+
 'pub fn present(value:&'+T+')->bool{value.get("field").is_some()}'+
 'pub fn absent(value:&'+T+')->bool{value.get("field").is_none()}'+
 'pub fn array_present(value:&'+T+')->bool{value.get("field").and_then('+T+'::as_array).is_some()}';
test('closed field callbacks compose with canonical function readers and eager/presence terminals in both proposal entry points',limits,()=>{
 const result=propose('// Ω😀\r\n'+source);assert.deepEqual(selected(result).map(row=>row.function),['nested','fallback','numeric','present','absent','array_present']);assert.deepEqual(selected(result)[0].readers.map(row=>row.member),['get','as_str']);assert.equal(selected(result)[0].readers[0].callback.binder,'child');assert.equal(selected(result)[1].terminal.fallbackSource,'default');assert.deepEqual(selected(result)[1].terminal.evaluationOrder,['receiver-once','fallback-once-even-when-Some','select-payload-or-fallback']);assert.equal(selected(result)[3].readers.length,0);assert.equal(selected(result)[3].terminal.method,'is_some');for(const row of result.proposals)inverse(row);
 const stream=iterateCoreJsonReadersCorpusPackets(options('// Ω😀\r\n'+source));let next;do{next=stream.next();}while(!next.done);stream.verify();assert.deepEqual(next.value.after,result.after);assert.equal(next.value.summary.selections,6);assert.ok(result.after['src/lib.rs'].includes('// Ω😀\r\n'));assert.equal(result.after['src/lib.rs'].includes('.and_then('),false);assert.equal(result.after['src/lib.rs'].includes('.unwrap_or('),false);
});
test('actual JS and independently strict TS distinguish missing wrong kinds defaults and nested borrowed fields',limits,async()=>{
 const proposed=propose(source),result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposed.after),readSource:path=>proposed.after[path],cargoManifest:dependencyInputs.manifest,jsonMacroDependencies:loadJsonMacroSourceProof(dependencyInputs),deriveDependencies:loadDeriveDependencyProof(dependencyInputs),compilationProfile:PRODUCTION_PROFILE});for(const name of ['nested','fallback','numeric','present','absent','array_present'])assert.ok(result.meta.executable.some(row=>row.name===name),name+JSON.stringify(result.meta.refused));const wire=JSON.stringify(result.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);
 await verifyTypedTargets(result,api=>{
  for(const text of ['null','{}','{"image_url":null}','{"image_url":false}','{"image_url":{"url":4}}'])assert.deepEqual(api.nested(json(text),'url'),{$:'None'});
  assert.deepEqual(api.nested(json('{"image_url":{"url":"猫😀\\u0000"}}'),'url'),{$:'Some',field0:'猫😀\0'});assert.equal(api.fallback(json('{}'),'default'),'default');assert.equal(api.fallback(json('{"kind":false}'),'default'),'default');assert.equal(api.fallback(json('{"kind":""}'),'default'),'');assert.equal(api.numeric(json('{"count":18446744073709551615}'),9n),18446744073709551615n);assert.equal(api.numeric(json('{"count":-1}'),9n),9n);
  for(const [text,present,array]of [['{}',false,false],['{"field":null}',true,false],['{"field":false}',true,false],['{"field":[]}',true,true],['{"field":{}}',true,false]]){const value=json(text);assert.equal(api.present(value),present);assert.equal(api.absent(value),!present);assert.equal(api.array_present(value),array);}
 },{childTimeoutMs:20000});
});
test('closed scalar callbacks and all reader presence kinds retain source without granting caller authority',limits,()=>{
 for(const member of ['as_str','as_bool','as_u64','as_i64','as_f64','as_null','as_number','as_array','as_object']){const result=propose('pub fn check(value:&'+T+')->bool{value.get("v").and_then(|child|child.'+member+'()).is_none()}');assert.equal(selected(result).length,1,member);assert.equal(selected(result)[0].readers[0].callback.member,member);assert.equal(selected(result)[0].terminal.method,'is_none');assert.equal(selected(result)[0].executableAdmission,false);for(const row of result.proposals)inverse(row);}
});
test('unknown callbacks, shadowed roots, callback returns/try and comments stay preserved for independent handling',limits,()=>{
 for(const callback of ['|child|child.get(unknown())','|child:&'+T+'|child.get("url")','|mut child|child.get("url")','move |child|child.get("url")','|child|child.custom()','|child|{return child.get("url");}','|child|child.get("url")?','|value|value.get("url")','|child|child/*keep*/.get("url")']){const result=propose('pub fn pending(value:&'+T+')->Option<&'+T+'>{value.get("v").and_then('+callback+')}');assert.equal(selected(result).length,0,callback);assert.deepEqual(result.before,result.after);}
 for(const suffix of ['.unwrap_or(a,b)','.unwrap_or_else(default)','.is_some(custom)','.is_none/*keep*/()']){const result=propose('pub fn pending(value:&'+T+')->bool{value.get("v").and_then('+T+'::as_bool)'+suffix+'}');assert.equal(selected(result).length,1);assert.equal(selected(result)[0].terminal,null);assert.ok(result.after['src/lib.rs'].includes(suffix));}
});
test('three complete source equations retain exact original modules, both phases and full inverses',limits,()=>{
 const plan=prepareJsonOptionTerminalSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
