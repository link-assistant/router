// Fixed end-to-end receiving case SOURCE. UNRUN during issue #759 drafting.
// Explicit driver only; no skip, substitute parser or test-only issuer exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync,cpSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {translateProjectOrderedTextMaps} from '../ordered-text-map-callers-20261102-project.mjs';
import {analyzeOrderedTextMapReverseModule,emitOrderedTextMapReverseProgram,serializeOrderedTextMapReverseMeta,readOrderedTextMapReverseMeta,prepareOrderedTextMapReverseRuntime,evaluateOrderedTextMapReverseProgram} from '../ordered-text-map-callers-20261102-reverse-project.mjs';
import {ORDERED_MAP_FORWARD_ACCEPTANCE_SOURCES,ORDERED_MAP_FORWARD_REFUSAL_SOURCES,ORDERED_MAP_REVERSE_ACCEPTANCE_SOURCE,ORDERED_MAP_REVERSE_ACCEPTANCE_JAVASCRIPT,ORDERED_MAP_REVERSE_REFUSAL_SOURCES} from '../ordered-text-map-callers-20261102-receiving-cases.mjs';
import {ownedCoreRuntimeSources} from '../js-to-rust/owned-vector-candidate-source.mjs';
import {prepareOwnedCorePairedTypes} from '../js-to-rust/owned-core-paired-types.mjs';
import {hostRuntimeAssets} from '../host-assets.mjs';
import {effectRuntimeAssets} from '../effect-assets.mjs';
import {ORDERED_TEXT_MAP_NATIVE_SOURCE} from '../ordered-text-map-20261102-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
const limits={timeout:60000},packageRoot=fileURLToPath(new URL('../../../',import.meta.url)),sourceRoot=process.env.ROUTER_ORDERED_MAP_CASE_SOURCE_ROOT??packageRoot;
const manifest=readFileSync(join(packageRoot,'rust/Cargo.toml'),'utf8'),lock=readFileSync(join(packageRoot,'Cargo.lock'),'utf8'),compiler=join(sourceRoot,'js/node_modules/typescript/bin/tsc');
const native={
 'src/lib.rs':'pub mod translation_core;\npub mod translation_ordered_text_map_core;\n',
 'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,
 'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,
 'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,
 'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,
 'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,
 'src/translation_ordered_text_map_core.rs':ORDERED_TEXT_MAP_NATIVE_SOURCE,
};
function forward(source,leaf=ORDERED_TEXT_MAP_NATIVE_SOURCE,prefix=''){const files={...native,'src/lib.rs':prefix+native['src/lib.rs']+source,'src/translation_ordered_text_map_core.rs':leaf};return translateProjectOrderedTextMaps({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],cargoManifest:manifest,jsonMacroDependencies:loadJsonMacroSourceProof({manifest,lock}),deriveDependencies:loadDeriveDependencyProof({manifest,lock}),compilationProfile:PRODUCTION_PROFILE});}
function reverseInput(javascript=ORDERED_MAP_REVERSE_ACCEPTANCE_JAVASCRIPT,typescript=ORDERED_MAP_REVERSE_ACCEPTANCE_SOURCE){return {runtimeRoot:'runtime',declarationRoot:'runtime',vectorBindings:[],files:[...ownedCoreRuntimeSources(),...Object.entries(native).map(([path,source])=>({path,source})),{path:'Cargo.toml',source:manifest},{path:'Cargo.lock',source:lock},{path:'caller.mjs',source:javascript},{path:'caller.mts',source:typescript}]};}
function strict(directory,sourcePath){const version=execFileSync(process.execPath,[compiler,'--version'],{encoding:'utf8',timeout:20000,maxBuffer:4194304});assert.equal(version.trim(),'Version 5.9.3');execFileSync(process.execPath,[compiler,'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',directory,'--outDir',join(directory,'out'),sourcePath],{timeout:20000,maxBuffer:4194304,stdio:'pipe'});return version.trim();}
function assets(directory){const files=hostRuntimeAssets(),effects=effectRuntimeAssets();files.set('effects.mjs',effects.javascript);files.set('effects.d.mts',effects.declarations);for(const [name,source]of files){const path=join(directory,'runtime',name);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,source);}writeFileSync(join(directory,'package.json'),'{"type":"module"}\n');}
async function targets(javascript,typescript,relative,run){const directory=mkdtempSync(join(tmpdir(),'router-map-receiving-'));try{assets(directory);const js=join(directory,relative+'.mjs'),ts=join(directory,relative+'.ts');mkdirSync(dirname(js),{recursive:true});writeFileSync(js,javascript);writeFileSync(ts,typescript);strict(directory,ts);cpSync(join(directory,'runtime'),join(directory,'out/runtime'),{recursive:true});return await run(await import(pathToFileURL(js)),await import(pathToFileURL(join(directory,'out',relative+'.js'))));}finally{rmSync(directory,{recursive:true,force:true});}}

test('real forward caller bodies survive semantic meta and strict generated targets',limits,async()=>{
 const result=forward(ORDERED_MAP_FORWARD_ACCEPTANCE_SOURCES.join('\n'));
 for(const name of ['make','input_count','input_contains','input_value','stream_query','inserted','removed','copied'])assert.ok(result.meta.executable.some(row=>row.name===name),name+': '+JSON.stringify(result.meta.refused));
 await targets(result.javascript,result.typescript,'src/lib',(js,ts)=>{
  for(const module of [js,ts]){const api=module.translated,empty=api.make();assert.equal(api.input_count(empty),0n);assert.deepEqual(api.input_value(empty),{$:'None'});
   for(const [value,expected]of [['',false],['true',true],['1',true],['TRUE',false],['true\0',false]]){const map=api.inserted(empty,'stream',value);assert.equal(api.stream_query(map),expected);assert.equal(api.input_contains(map),true);assert.deepEqual(api.input_value(map),{$:'Some',field0:value});assert.equal(api.input_count(api.removed(map,'stream')),0n);assert.deepEqual(api.input_value(api.copied(map)),{$:'Some',field0:value});assert.equal(api.input_count(empty),0n);}
  }
 });
 for(const source of ORDERED_MAP_FORWARD_REFUSAL_SOURCES){const refused=forward(source),name=/pub fn ([a-z_]+)/u.exec(source)[1];assert.equal(refused.meta.executable.some(row=>row.name===name),false,source);}
 const changed=forward(ORDERED_MAP_FORWARD_ACCEPTANCE_SOURCES[1],ORDERED_TEXT_MAP_NATIVE_SOURCE+'\n// changed whole native source\n');assert.equal(changed.meta.executable.some(row=>row.name==='input_count'),false);
});

test('real reverse native symbols paired types meta reissue runtime and emission agree',limits,async()=>{
 const input=reverseInput(),analysis=analyzeOrderedTextMapReverseModule(input,'caller.mjs');assert.equal(analysis.program.length,5,JSON.stringify(analysis.diagnostics));
 const meta=serializeOrderedTextMapReverseMeta(analysis.program),decoded=readOrderedTextMapReverseMeta(meta,{input,path:'caller.mjs'}),rust=emitOrderedTextMapReverseProgram(decoded,'rust'),typescript=emitOrderedTextMapReverseProgram(decoded,'typescript',{outputPath:'caller.mts'}),token=await prepareOrderedTextMapReverseRuntime(decoded);
 assert.match(rust,/translation_ordered_text_map_core::text_map_copy/u);assert.match(rust,/text_map_get/u);assert.ok(decoded.flatMap(item=>item.params).filter(param=>param.name==='map').every(param=>param.type==='text-map-input'));
 const map=(await import('../ordered-text-map-20261102-runtime.mjs')).router_text_map_insert((await import('../ordered-text-map-20261102-runtime.mjs')).router_text_map_new(),'stream','true');
 assert.equal(evaluateOrderedTextMapReverseProgram(decoded,'count',[map],token),1n);assert.deepEqual(evaluateOrderedTextMapReverseProgram(decoded,'value',[map],token),{$:'Some',field0:'true'});
 const updated=evaluateOrderedTextMapReverseProgram(decoded,'updated',[map,'stream','false'],token);assert.deepEqual(evaluateOrderedTextMapReverseProgram(decoded,'value',[updated],token),{$:'Some',field0:'false'});assert.deepEqual(evaluateOrderedTextMapReverseProgram(decoded,'value',[map],token),{$:'Some',field0:'true'});
 await targets(ORDERED_MAP_REVERSE_ACCEPTANCE_JAVASCRIPT,typescript,'caller',(js,ts)=>{assert.equal(js.count(map),1n);assert.equal(ts.count(map),1n);assert.deepEqual(ts.value(map),{$:'Some',field0:'true'});});
 const pair=prepareOwnedCorePairedTypes('caller.mjs',ORDERED_MAP_REVERSE_ACCEPTANCE_JAVASCRIPT,'caller.mts',ORDERED_MAP_REVERSE_ACCEPTANCE_SOURCE);let inverse=pair.erasure.source;for(const edit of [...pair.erasure.edits].reverse())inverse=inverse.slice(0,edit.afterSpan[0])+edit.expected+inverse.slice(edit.afterSpan[1]);assert.equal(inverse,ORDERED_MAP_REVERSE_ACCEPTANCE_SOURCE);
 const altered=JSON.parse(meta);altered.program[0].body=[];assert.throws(()=>readOrderedTextMapReverseMeta(JSON.stringify(altered),{input,path:'caller.mjs'}));
 for(const source of ORDERED_MAP_REVERSE_REFUSAL_SOURCES){const bad=reverseInput('',source);try{const result=analyzeOrderedTextMapReverseModule(bad,'caller.mts');assert.equal(result.program.length,0);}catch(error){assert.ok(error instanceof TypeError);}}
});

test('actual caller paths refuse a crate with unavailable standard/prelude owners',limits,()=>{
 const result=forward(ORDERED_MAP_FORWARD_ACCEPTANCE_SOURCES[1],ORDERED_TEXT_MAP_NATIVE_SOURCE,'#![no_std]\n');assert.equal(result.meta.executable.some(row=>row.name==='input_count'),false);assert.ok(result.meta.refused.length);
 const input=reverseInput();input.files.find(row=>row.path==='src/lib.rs').source='#![no_std]\n'+native['src/lib.rs'];assert.throws(()=>analyzeOrderedTextMapReverseModule(input,'caller.mjs'));
});

test('independent paired CST inverse preserves the whole authored TypeScript source',limits,()=>{
 const pair=prepareOwnedCorePairedTypes('caller.mjs',ORDERED_MAP_REVERSE_ACCEPTANCE_JAVASCRIPT,'caller.mts',ORDERED_MAP_REVERSE_ACCEPTANCE_SOURCE);let inverse=pair.erasure.source;for(const edit of [...pair.erasure.edits].reverse())inverse=inverse.slice(0,edit.afterSpan[0])+edit.expected+inverse.slice(edit.afterSpan[1]);assert.equal(inverse,ORDERED_MAP_REVERSE_ACCEPTANCE_SOURCE);
});

test('monomorphic native source ABI rejoins actual unit std prelude and leaf owners without native execution',limits,async()=>{
 const {resolveModuleGraph}=await import('../project.mjs'),{captureOriginalCargoEdition}=await import('../cargo-edition-context.mjs'),{createMatchesMacroContext,configureMatchesMacroParser,matchesParserFacts}=await import('../matches-macro-context.mjs'),{HostRustParser}=await import('../extensions/host-contracts.mjs'),{tokenizeRust}=await import('../extensions/lexical.mjs'),{requireOrderedTextMapNativeLibraryOwners}=await import('../ordered-text-map-callers-20261102-native-owner.mjs'),{requireOrderedTextMapNativeSourceABI}=await import('../ordered-text-map-callers-20261102-native-abi.mjs');
 const frame=(physical=false)=>{
  const prefix=physical?'rust/':'',files=new Map(Object.entries(native).map(([path,source])=>[prefix+path,source])),entry=prefix+'src/lib.rs',graph=resolveModuleGraph({entry,paths:[...files.keys()],readSource:path=>files.get(path),compilationProfile:PRODUCTION_PROFILE});assert.deepEqual(graph.diagnostics,[]);
  const deriveDependencies=loadDeriveDependencyProof({manifest,lock}),cargoEditionContext=captureOriginalCargoEdition(manifest,{sourcePath:physical?'rust/Cargo.toml':'Cargo.toml'}),context=createMatchesMacroContext({modules:graph.modules,deriveDependencies,cargoEditionContext,compilationProfile:PRODUCTION_PROFILE}),parser=new HostRustParser(tokenizeRust(files.get(entry)));parser.compilationProfile=PRODUCTION_PROFILE;configureMatchesMacroParser(parser,context,{file:entry});const state=matchesParserFacts(parser);
  return {parser,modules:state.facts.modules,sourceScopes:state.facts.evidence.scopes,compilationProfile:state.facts.compilationProfile,cargoEditionContext,deriveDependencies};
 };
 for(const physical of [false,true]){
  const input=frame(physical),abi=requireOrderedTextMapNativeLibraryOwners(input);requireOrderedTextMapNativeSourceABI(abi,{parser:input.parser});
  assert.equal(abi.sourceCompatibilityBoundary,true);assert.equal(abi.actualInvocationObserved,false);assert.equal(abi.nativeSysrootConformance,false);assert.equal(abi.nativeOracleQualification,'UNRUN');assert.equal(abi.callerBodyQualified,false);assert.equal(abi.nativeInternalsUntranslated,true);
  assert.equal(abi.originalUnit.root.manifest,manifest);assert.equal(abi.originalUnit.root.target.path,'src/lib.rs');if(physical)assert.equal(abi.originalUnit.root.target.sourcePath,'rust/src/lib.rs');
  assert.equal(abi.allocUnit.package.name,'alloc');assert.deepEqual(abi.operations.map(row=>row.operation),['new','insert','remove','get','contains','len','copy','keys','from_pairs','pairs']);assert.equal(abi.operations.find(row=>row.operation==='get').loanRoot,0);
  assert.throws(()=>requireOrderedTextMapNativeSourceABI(JSON.parse(JSON.stringify(abi)),{parser:input.parser}));assert.throws(()=>requireOrderedTextMapNativeSourceABI(abi,{parser:frame(physical).parser}));
 }
});

test('keys returns actual owned Vec<String> through forward meta strict targets and original reverse contexts',limits,async()=>{
 const {ORDERED_MAP_KEYS_FORWARD_ACCEPTANCE_SOURCES:accepted,ORDERED_MAP_KEYS_FORWARD_REFUSAL_SOURCES:refused,ORDERED_MAP_KEYS_REVERSE_ACCEPTANCE_SOURCE:typescript,ORDERED_MAP_KEYS_REVERSE_ACCEPTANCE_JAVASCRIPT:javascript}=await import('../ordered-text-map-callers-20261102-receiving-cases.mjs');
 const result=forward(accepted.join('\n'));for(const name of ['projected_keys','keys_after_update'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));
 const runtime=await import('../ordered-text-map-20261102-runtime.mjs'),make=()=>{let value=runtime.router_text_map_new();for(const [key,text]of [['\u{10000}','astral'],['\ue000','bmp'],['a','first'],['a','replaced']])value=runtime.router_text_map_insert(value,key,text);return value;};
 await targets(result.javascript,result.typescript,'src/lib',(js,ts)=>{for(const value of [js,ts]){const map=make(),keys=value.translated.projected_keys(map);assert.deepEqual(keys,['a','\ue000','\u{10000}']);assert.deepEqual(value.translated.keys_after_update(map,'z','next'),keys);assert.equal(runtime.router_text_map_len(map),3n);}});
 for(const source of refused){const result=forward(source),name=/pub fn ([a-z_]+)/u.exec(source)[1];assert.equal(result.meta.executable.some(row=>row.name===name),false);}
 const input=reverseInput(javascript,typescript),analysis=analyzeOrderedTextMapReverseModule(input,'caller.mjs');assert.equal(analysis.program.length,1,JSON.stringify(analysis.diagnostics));assert.equal(analysis.program[0].returns,'vec:text-owned');
 const decoded=readOrderedTextMapReverseMeta(serializeOrderedTextMapReverseMeta(analysis.program),{input,path:'caller.mjs'}),rust=emitOrderedTextMapReverseProgram(decoded,'rust'),written=emitOrderedTextMapReverseProgram(decoded,'typescript',{outputPath:'caller.mts'}),token=await prepareOrderedTextMapReverseRuntime(decoded);assert.match(rust,/::std::vec::Vec<::std::string::String>/u);assert.match(rust,/text_map_keys/u);assert.deepEqual(evaluateOrderedTextMapReverseProgram(decoded,'projected_keys',[make()],token),['a','\ue000','\u{10000}']);
 await targets(javascript,written,'caller',(js,ts)=>{assert.deepEqual(js.projectedKeys(make()),['a','\ue000','\u{10000}']);assert.deepEqual(ts.projectedKeys(make()),['a','\ue000','\u{10000}']);});
 const alias='import {router_text_map_keys as keys} from "./runtime/ordered-text-map-20261102-runtime.mjs";export function alias(map:Parameters<typeof keys>[0]):ReturnType<typeof keys>{const values=keys(map);return values;}';const bad=analyzeOrderedTextMapReverseModule(reverseInput('',alias),'caller.mts');assert.equal(bad.program.length,0);
});

test('Rust source binds only the genuine map return-loan root and keeps key and unused map independent',limits,async()=>{
 const cases=await import('../ordered-text-map-callers-20261102-receiving-cases.mjs'),input=reverseInput(cases.ORDERED_MAP_LOAN_HEADER_JAVASCRIPT,cases.ORDERED_MAP_LOAN_HEADER_TYPESCRIPT),analysis=analyzeOrderedTextMapReverseModule(input,'caller.mjs');assert.equal(analysis.program.length,1,JSON.stringify(analysis.diagnostics));assert.equal(analysis.program[0].resultRoot,'map');
 const rust=emitOrderedTextMapReverseProgram(analysis.program,'rust');assert.match(rust,/fn independently_borrowed<'ro_map>\(map: &'ro_map crate::translation_ordered_text_map_core::OrderedTextMap, key: &str, unused: &crate::translation_ordered_text_map_core::OrderedTextMap\) -> ::std::option::Option<&'ro_map str>/u);assert.equal(rust.includes("key: &'ro_map"),false);assert.equal(rust.includes("unused: &'ro_map"),false);assert.equal(rust.includes("<'a>"),false);
 const meta=serializeOrderedTextMapReverseMeta(analysis.program),decoded=readOrderedTextMapReverseMeta(meta,{input,path:'caller.mjs'});assert.equal(emitOrderedTextMapReverseProgram(decoded,'rust'),rust);
});

// Genuine source signatures supply the tuple layout; no owned tuple inference
// or raw dense-array reinterpretation is admitted by these forward cases.
test('forward pairs use original Vec tuple String signatures and strict representation bridge',limits,async()=>{
 const source=`pub fn pair_input(pairs: Vec<(String, String)>) -> crate::translation_ordered_text_map_core::OrderedTextMap { crate::translation_ordered_text_map_core::text_map_from_pairs(pairs) }
 pub fn pair_output(map: &crate::translation_ordered_text_map_core::OrderedTextMap) -> Vec<(String, String)> { crate::translation_ordered_text_map_core::text_map_pairs(map) }`;
 const result=forward(source);for(const name of ['pair_input','pair_output'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));
 assert.match(result.javascript,/ordered-text-map-callers-20261102-pair-runtime\.mjs/u);
 const raw=await import('../ordered-text-map-20261102-runtime.mjs');
 await targets(result.javascript,result.typescript,'src/lib',(javascript,typescript)=>{for(const module of [javascript,typescript]){
  const api=module.translated,input=[{$:'Tuple',field0:'x',field1:'before'},{$:'Tuple',field0:'',field1:''},{$:'Tuple',field0:'x',field1:'after'}],map=api.pair_input(input);
  assert.deepEqual(raw.router_text_map_pairs(map),[['',''],['x','after']]);assert.deepEqual(api.pair_output(map),[{$:'Tuple',field0:'',field1:''},{$:'Tuple',field0:'x',field1:'after'}]);
  assert.throws(()=>api.pair_input([['x','value']]));assert.throws(()=>raw.router_text_map_from_pairs(input));assert.deepEqual(input[0],{$:'Tuple',field0:'x',field1:'before'});
 }});
 const refusal=forward('pub fn pair_alias(pairs: Vec<(String, String)>) -> crate::translation_ordered_text_map_core::OrderedTextMap { let first = crate::translation_ordered_text_map_core::text_map_from_pairs(pairs); crate::translation_ordered_text_map_core::text_map_from_pairs(pairs) }');assert.equal(refusal.meta.executable.some(row=>row.name==='pair_alias'),false);
});

// Raw pair-vector reverse ABI remains separate from tagged forward Tuple data.
test('real reverse pair callers freshly reissue native source types meta and both targets',limits,async()=>{
 const typescript=`import {router_text_map_from_pairs as fromPairs,router_text_map_pairs as pairs} from './runtime/ordered-text-map-20261102-runtime.mjs';
 export function fromPairsCaller(value:Parameters<typeof fromPairs>[0]):ReturnType<typeof fromPairs>{return fromPairs(value);}
 export function pairsCaller(map:Parameters<typeof pairs>[0]):ReturnType<typeof pairs>{return pairs(map);}
 export function pairRoundTrip(map:Parameters<typeof pairs>[0]):ReturnType<typeof fromPairs>{return fromPairs(pairs(map));}`;
 const javascript=`import {router_text_map_from_pairs as fromPairs,router_text_map_pairs as pairs} from './runtime/ordered-text-map-20261102-runtime.mjs';
 export function fromPairsCaller(value){return fromPairs(value);}
 export function pairsCaller(map){return pairs(map);}
 export function pairRoundTrip(map){return fromPairs(pairs(map));}`;
 const input=reverseInput(javascript,typescript),analysis=analyzeOrderedTextMapReverseModule(input,'caller.mjs');assert.equal(analysis.program.length,3,JSON.stringify(analysis.diagnostics));
 const decoded=readOrderedTextMapReverseMeta(serializeOrderedTextMapReverseMeta(analysis.program),{input,path:'caller.mjs'}),rust=emitOrderedTextMapReverseProgram(decoded,'rust'),written=emitOrderedTextMapReverseProgram(decoded,'typescript',{outputPath:'caller.mts'}),token=await prepareOrderedTextMapReverseRuntime(decoded);
 assert.match(rust,/::std::vec::Vec<\(::std::string::String, ::std::string::String\)>/u);assert.match(rust,/ordered text map input entry bound/u);assert.equal(rust.includes("'a"),false);assert.match(rust,/checked_add/u);assert.ok(rust.indexOf('input entry bound')<rust.indexOf('.to_vec()'));
 const runtime=await import('../ordered-text-map-20261102-runtime.mjs'),source=[['x','before'],['',''],['x','after'],['\u{10000}','astral'],['\ue000','bmp']],expected=[['',''],['x','after'],['\ue000','bmp'],['\u{10000}','astral']],map=runtime.router_text_map_from_pairs(source),byName=name=>decoded.find(row=>row.javascript===name).name;
 assert.deepEqual(runtime.router_text_map_pairs(evaluateOrderedTextMapReverseProgram(decoded,byName('fromPairsCaller'),[source],token)),expected);assert.deepEqual(evaluateOrderedTextMapReverseProgram(decoded,byName('pairsCaller'),[map],token),expected);assert.deepEqual(runtime.router_text_map_pairs(evaluateOrderedTextMapReverseProgram(decoded,byName('pairRoundTrip'),[map],token)),expected);
 assert.throws(()=>evaluateOrderedTextMapReverseProgram(decoded,byName('fromPairsCaller'),[[{$:'Tuple',field0:'x',field1:'value'}]],token));assert.throws(()=>evaluateOrderedTextMapReverseProgram(decoded,byName('fromPairsCaller'),[Array.from({length:4097},()=>['x',''])],token));
 await targets(javascript,written,'caller',(js,ts)=>{for(const module of [js,ts]){assert.deepEqual(runtime.router_text_map_pairs(module.fromPairsCaller(source)),expected);assert.deepEqual(module.pairsCaller(map),expected);assert.deepEqual(runtime.router_text_map_pairs(module.pairRoundTrip(map)),expected);}});
 const reparsed=analyzeOrderedTextMapReverseModule(reverseInput('',written),'caller.mts');assert.equal(reparsed.program.length,3,JSON.stringify(reparsed.diagnostics));
 const alias=`import {router_text_map_pairs as pairs} from './runtime/ordered-text-map-20261102-runtime.mjs';export function alias(map:Parameters<typeof pairs>[0]):ReturnType<typeof pairs>{const values=pairs(map);return values;}`;assert.equal(analyzeOrderedTextMapReverseModule(reverseInput('',alias),'caller.mts').program.length,0);
 const structural=`import {router_text_map_from_pairs as fromPairs} from './runtime/ordered-text-map-20261102-runtime.mjs';export function structural(value:readonly (readonly [string,string])[]):ReturnType<typeof fromPairs>{return fromPairs(value);}`;assert.equal(analyzeOrderedTextMapReverseModule(reverseInput('',structural),'caller.mts').program.length,0);
});

test('original reverse const-owned-map locals retain genuine lexical roots and cannot return local loans',limits,async()=>{
 const imports=`import {router_text_map_new as empty,router_text_map_insert as insert,router_text_map_contains as contains,router_text_map_get as get} from './runtime/ordered-text-map-20261102-runtime.mjs';`;
 const typescript=imports+`
 export function localContains(key:string):boolean{const original=empty();const updated=insert(original,'stream','true');return contains(updated,key);}
 export function localTruth(key:string):boolean{const map=insert(empty(),'stream','true');const value=get(map,key);return value.$==='Some'&&(value.field0==='true'||value.field0==='1');}
 export function localOutput():ReturnType<typeof empty>{const map=empty();return map;}`;
 const javascript=imports+`
 export function localContains(key){const original=empty();const updated=insert(original,'stream','true');return contains(updated,key);}
 export function localTruth(key){const map=insert(empty(),'stream','true');const value=get(map,key);return value.$==='Some'&&(value.field0==='true'||value.field0==='1');}
 export function localOutput(){const map=empty();return map;}`;
 const input=reverseInput(javascript,typescript),analysis=analyzeOrderedTextMapReverseModule(input,'caller.mjs');assert.equal(analysis.program.length,3,JSON.stringify(analysis.diagnostics));
 const decoded=readOrderedTextMapReverseMeta(serializeOrderedTextMapReverseMeta(analysis.program),{input,path:'caller.mjs'}),token=await prepareOrderedTextMapReverseRuntime(decoded),written=emitOrderedTextMapReverseProgram(decoded,'typescript',{outputPath:'caller.mts'}),rust=emitOrderedTextMapReverseProgram(decoded,'rust'),name=javascript=>decoded.find(row=>row.javascript===javascript).name;
 assert.match(rust,/let __ro_arg_[0-9]+ = &map/u);assert.match(rust,/text_map_copy\(__ro_arg_/u);assert.match(rust,/text_map_get\(__ro_arg_/u);assert.equal(rust.includes("'ro_map"),false);
 for(const [key,expected]of [['stream',true],['missing',false]]){assert.equal(evaluateOrderedTextMapReverseProgram(decoded,name('localContains'),[key],token),expected);assert.equal(evaluateOrderedTextMapReverseProgram(decoded,name('localTruth'),[key],token),expected);}
 const runtime=await import('../ordered-text-map-20261102-runtime.mjs');assert.equal(runtime.router_text_map_len(evaluateOrderedTextMapReverseProgram(decoded,name('localOutput'),[],token)),0n);
 await targets(javascript,written,'caller',(js,ts)=>{for(const module of [js,ts]){assert.equal(module.localContains('stream'),true);assert.equal(module.localContains('missing'),false);assert.equal(module.localTruth('stream'),true);assert.equal(module.localTruth('missing'),false);assert.equal(runtime.router_text_map_len(module.localOutput()),0n);}});
 assert.equal(analyzeOrderedTextMapReverseModule(reverseInput('',written),'caller.mts').program.length,3);
 for(const body of [
  `export function alias():ReturnType<typeof empty>{const map=empty();const second=map;return second;}`,
  `export function escaping():ReturnType<typeof get>{const map=empty();return get(map,'stream');}`,
  `export function mutable():ReturnType<typeof empty>{let map=empty();return map;}`,
 ])assert.equal(analyzeOrderedTextMapReverseModule(reverseInput('',imports+body),'caller.mts').program.length,0);
});
