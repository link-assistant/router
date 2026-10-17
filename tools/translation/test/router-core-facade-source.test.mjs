import {translateProject} from '../project.mjs';
import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {selectOriginalRouterCoreFacade} from '../router-core-facade-source.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../router-core-source-data.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {createOwnedCoreSourceContext,translateOwnedCoreJavaScript,parseOwnedCoreMeta,emitRust} from '../js-to-rust/translator.mjs';
import {ownedCoreRuntimeSources} from '../js-to-rust/owned-core-source.mjs';
import {buildOwnedCoreArtifacts} from '../js-to-rust/owned-core-corpus.mjs';
import {encodeWord} from '../js-to-rust/vendor/lino.mjs';
import {json_macro_object,json_macro_string,json_macro_bool} from '../json-macro-runtime.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),core='src/translation_core.rs',primitive='src/translation_core/primitives.rs';
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60000},async t=>{vectors=[];try{await run(t);}finally{if(process.env.ROUTER_CORE_FACADE_SOURCE_VECTOR_DIR){const directory=process.env.ROUTER_CORE_FACADE_SOURCE_VECTOR_DIR;mkdirSync(directory,{recursive:true});writeFileSync(join(directory,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n');}}});
function original(path){return existsSync(join(root,path))?readFileSync(join(root,path),'utf8'):execFileSync('git',['show','HEAD:'+path],{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:16777216});}
function selected(rootSource='pub mod translation_core;\n',options={}){
 const files={'src/lib.rs':rootSource,[core]:ROUTER_FORMATTING_FACADE_SOURCE,[primitive]:ROUTER_CORE_PRIMITIVES_SOURCE,...options.files},profile=Object.hasOwn(options,'profile')?options.profile:PRODUCTION_PROFILE,modules=[];
 for(const [file,prefix]of [['src/lib.rs',[]],[core,['translation_core']],[primitive,['translation_core','primitives']]]){
  const captured=captureSourceModuleViews({source:files[file],sourcePath:file,compilationProfile:profile});
  for(const sourceView of captured.views)modules.push({file,path:[...prefix,...sourceView.modulePath],source:files[file],sourceView,configurationCondition:sourceView.configurationCondition,compilationProfile:profile});
 }
 const binding=resolveModuleBindings({modules,compilationProfile:profile}),input={modules,sourceScopes:binding.scopes,compilationProfile:profile};
 return {files,modules,binding,input,select:()=>selectOriginalRouterCoreFacade(input)};
}
const js='import {router_core_json_copy as copy} from "./runtime/json-update-runtime.mjs";\n/** @param {import("./runtime/json-macro-runtime.mjs").JsonValue} value */\nexport function copied(value){return copy(value);}';
function receiving(rootSource,source=js){return {runtimeRoot:'runtime',declarationRoot:'runtime',files:[...ownedCoreRuntimeSources(),{path:'src/lib.rs',source:rootSource},{path:core,source:ROUTER_FORMATTING_FACADE_SOURCE},{path:primitive,source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'Cargo.toml',source:original('Cargo.toml')},{path:'Cargo.lock',source:original('Cargo.lock')},{path:'caller.mjs',source}]};}
async function reverseTargets(t,data){
 const context=createOwnedCoreSourceContext(data),source=data.files.find(row=>row.path==='caller.mjs').source,result=translateOwnedCoreJavaScript(source,{context,sourcePath:'caller.mjs'}),directory=mkdtempSync(join(tmpdir(),'owned-facade-edge-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 for(const row of data.files.filter(row=>row.path.startsWith('runtime/'))){mkdirSync(dirname(join(directory,row.path)),{recursive:true});writeFileSync(join(directory,row.path),row.source);}
 writeFileSync(join(directory,'caller.mjs'),source);writeFileSync(join(directory,'typed.mts'),result.typescript);
 try{execFileSync(process.execPath,[join(root,'packages/javascript/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,timeout:20000,stdio:'pipe'});}catch(error){retain('strict-child',{stdout:error.stdout?.toString('utf8'),stderr:error.stderr?.toString('utf8'),status:error.status});throw error;}
 mkdirSync(join(directory,'out/runtime'),{recursive:true});for(const row of data.files.filter(row=>row.path.startsWith('runtime/')))writeFileSync(join(directory,'out',row.path),row.source);
 const actual=await import(pathToFileURL(join(directory,'caller.mjs')).href),typed=await import(pathToFileURL(join(directory,'out/typed.mjs')).href);retain('complete-reverse',{data,result});return {actual,typed,result,context};
}

test('complete actual Rust root selects only its original owned edge and retains unrelated diagnostics',async t=>{
 const source=original('src/lib.rs'),value=selected(source);retain('complete-actual-root-and-resolver',{files:value.files,binding:value.binding});const selection=value.select();
 assert.equal(selection.source,ROUTER_FORMATTING_FACADE_SOURCE);assert.equal(source.slice(...selection.span).trim(),'pub mod translation_core;');assert.ok(value.binding.diagnostics.some(row=>row.message.includes('no unconditional tracked body')));
 const api=await reverseTargets(t,receiving(source)),input=json_macro_object([['name',json_macro_string('猫😀')],['flag',json_macro_bool(true)]]),golden=json_macro_object([['flag',json_macro_bool(true)],['name',json_macro_string('猫😀')]]);
 for(const result of [api.actual.copied(input),api.typed.copied(input)]){assert.deepEqual(result,golden);assert.notEqual(result,input);assert.ok(Object.isFrozen(result));}
});
test('canonical forward formatting and explicit self alias keep their source-bound behavior',async()=>{
 const source='extern crate self as link_assistant_router;\npub mod translation_core;\nmod nested {pub fn answer()->crate::translation_core::Text{crate::translation_core::format!("λ{}",true)}}';
 const value=selected(source);assert.equal(value.select().file,core);retain('complete-inline-self-alias',{files:value.files,binding:value.binding});
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(value.files),readSource:path=>value.files[path],compilationProfile:PRODUCTION_PROFILE});retain('complete-forward',result);assert.ok(result.meta.executable.some(row=>row.name.endsWith('answer')));
 await verifyTypedTargets(result,api=>assert.equal(api['nested.answer'](),'λtrue'),{childTimeoutMs:20000});
});
test('copied scopes and foreign source view path profile and current source cannot issue a selection',()=>{
 const value=selected();assert.throws(()=>selectOriginalRouterCoreFacade({...value.input,sourceScopes:structuredClone(value.input.sourceScopes)}));
 const modules=value.modules.map(row=>({...row}));modules[0].source+='\n';assert.throws(()=>selectOriginalRouterCoreFacade({...value.input,modules}));
 assert.throws(()=>selectOriginalRouterCoreFacade({...value.input,compilationProfile:{flags:{test:true}}}));
 const foreign=selected();modules[0]={...value.modules[0],sourceView:foreign.modules[0].sourceView};assert.throws(()=>selectOriginalRouterCoreFacade({...value.input,modules}));
 const wrong=value.modules.map(row=>({...row}));wrong[1].file='src/foreign.rs';assert.throws(()=>selectOriginalRouterCoreFacade({...value.input,modules:wrong}));retain('complete-foreign-controls',{original:value.binding,copied:structuredClone(value.binding.scopes),foreign:foreign.binding});
});
test('foreign attributed macro-only conditional and inline facade edges remain refused',()=>{
 for(const source of ['#[foreign]\npub mod translation_core;','foreign!{pub mod translation_core;}','#[cfg(test)]\npub mod translation_core;','#[cfg(alien)]\npub mod translation_core;','pub mod translation_core {}']){retain('complete-unproved-edge-source',source);assert.throws(()=>{const value=selected(source);retain('complete-unproved-edge-binding',value.binding);value.select();});}
});
test('competing declarations uses and reexports cannot replace the selected original module',()=>{
 for(const source of ['pub mod translation_core;pub mod translation_core;','pub mod translation_core;use external::translation_core;','pub mod translation_core;pub use translation_core as other;','pub mod translation_core;use external::*;']){
  // An unrelated glob is retained as an unresolved diagnostic, not asserted to
  // replace this explicit owned edge; only actual competing core uses refuse.
  const value=selected(source);retain('complete-binding-competition',{source,binding:value.binding});if(source.endsWith('external::*;')){assert.equal(value.select().file,core);assert.ok(value.binding.diagnostics.length);}else assert.throws(value.select);
 }
});
test('canonical full facade and original private views cannot be substituted by bytewise lookalikes',()=>{
 for(const source of [ROUTER_FORMATTING_FACADE_SOURCE+'\n',ROUTER_FORMATTING_FACADE_SOURCE.replace('::std::format!','::custom::format!')]){const value=selected(undefined,{files:{[core]:source}});assert.throws(value.select);retain('complete-altered-facade',value.files);}
 const value=selected(),modules=value.modules.map(row=>({...row,sourceView:structuredClone(row.sourceView)}));assert.throws(()=>selectOriginalRouterCoreFacade({...value.input,modules}));
 const data=receiving('pub mod translation_core;');data.files.find(row=>row.path===primitive).source+='\n';assert.throws(()=>createOwnedCoreSourceContext(data),/owned Rust sources differ/u);
});
test('checked source meta reconstructs exact owner routes and input-root borrowing',async t=>{
 const source='import {router_core_json_index_str as index} from "./runtime/json-update-runtime.mjs";\n/** @param {import("./runtime/json-macro-runtime.mjs").JsonValue} value */\nexport function copied(value){return index(value,"name");}',api=await reverseTargets(t,receiving(original('src/lib.rs'),source));
 const parsed=parseOwnedCoreMeta(api.result.meta,{context:api.context});assert.equal(parsed[0].resultRoot,'value');assert.equal(parsed[0].returns,'json-ref');assert.equal(emitRust(parsed),api.result.rust);
 const leaf=json_macro_string('é'),input=json_macro_object([['name',leaf]]),entries=input.field0.entries.filter(entry=>entry.key==='name');assert.equal(entries.length,1);const stored=entries[0].value;assert.notEqual(stored,leaf);assert.deepEqual(stored,leaf);assert.equal(api.actual.copied(input),stored);assert.equal(api.typed.copied(input),stored);const needle=encodeWord('"resultRoot":"value"');assert.ok(api.result.meta.includes(needle));assert.throws(()=>parseOwnedCoreMeta(api.result.meta.replace(needle,encodeWord('"resultRoot":"counterfeit"')),{context:api.context}));
});
test('actual application discovery keeps whole inputs and per-body refusals distinct from the native witness',()=>{
 const result=buildOwnedCoreArtifacts(root),inputs=JSON.parse(result.artifacts.get('tools/translation/js-to-rust/generated/owned-core/inputs.json'));retain('complete-current-application',{manifest:result.manifest,inputs});
 if(result.manifest.sourceAvailable)assert.equal(inputs.files.find(row=>row.path==='src/lib.rs').source,original('src/lib.rs'));
 assert.equal(result.manifest.totals.sourceItems,result.manifest.totals.translatedItems+result.manifest.totals.unsupportedItems);assert.equal(result.manifest.runtimeParity,false);assert.equal(result.manifest.wholeSourceSynchronization,false);
 for(const row of result.manifest.modules)assert.equal(inputs.files.find(input=>input.path===row.path).source,original(row.path));
 assert.equal(result.manifest.witness.applicationItems,0);assert.equal(result.manifest.witness.rustExecuted,false);
});
