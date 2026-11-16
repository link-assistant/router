// Actual two original reverse compilers, complete native tree. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compactSparseGit} from '../compact-sparse-git-io-20261102.mjs';
import * as coreSource from '../js-to-rust/owned-core-source.mjs';
import * as core from '../js-to-rust/owned-core-operations.mjs';
import * as vectorSource from '../js-to-rust/owned-vector-candidate-source.mjs';
import * as vector from '../js-to-rust/owned-vector-candidate-operations.mjs';
import {borrowedJsonToolReverseRuntimeSources} from '../borrowed-json-tool-20261103-reverse-calls.mjs';
import {withBorrowedJsonToolReverseNativeSources} from '../borrowed-json-tool-20261103-reverse-native.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
function production(){
 const paths=compactSparseGit(ROOT,['ls-files','-z','--','rust/src'],{maxBytes:8388608}).split('\0').filter(Boolean);
 const files=new Map(paths.map(path=>[path.slice(5),readFileSync(join(ROOT,path),'utf8')]));
 assert.ok(files.size>500);assert.ok(files.has('src/openai_tools.rs'));assert.ok(files.has('src/borrowed_json_tool_predicate_20261103.rs'));
 files.set('Cargo.toml',readFileSync(join(ROOT,'rust/Cargo.toml'),'utf8'));files.set('Cargo.lock',readFileSync(join(ROOT,'Cargo.lock'),'utf8'));return files;
}
function caller(annotation='unknown',body='return predicate(tool);'){
 return "import {borrowedJsonToolIsTranslatable as predicate} from './runtime/borrowed-json-tool-predicate-20261103-runtime.mjs';\nexport function query(tool: "+annotation+'): boolean{'+body+'}\n';
}
function input(api,candidate,source=caller(),path='caller.mts'){
 const files=production();for(const row of [...api.ownedCoreRuntimeSources(),...borrowedJsonToolReverseRuntimeSources()])files.set(row.path,row.source);files.set(path,source);
 return {runtimeRoot:'runtime',declarationRoot:'runtime',...(candidate?{vectorBindings:[]}:{}),files:[...files].map(([path,source])=>({path,source}))};
}
const text=value=>({$:'String',field0:value}),nil={$:'Null'};
const object=fields=>({$:'Object',field0:{$:'Map',entries:Object.entries(fields).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,value])=>({$:'MapEntry',key,value}))}});
const examples=[
 [nil,false],[object({}),false],[object({name:text('λ')}),true],
 [object({name:text('')}),false],[object({type:{$:'Bool',field0:false},name:text('tool')}),true],
 [object({type:text('function'),name:text('fallback'),function:nil}),false],
 [object({type:text('function'),function:object({name:text('a'.repeat(1048577))})}),true],
 [object({type:text('web_search'),function:nil}),true],
 [object({type:text('web_fetch'),name:nil}),true],
 [object({type:text('unrecognized'),name:text('x')}),false],
];
for(const [api,operations,candidate]of [[coreSource,core,false],[vectorSource,vector,true]]){
 const lane=candidate?'vector':'core';
 test(lane+' receiving compiler accepts genuine unknown and imported Parameters witnesses',{timeout:60000},async()=>{
  for(const annotation of ['unknown','Parameters<typeof predicate>[0]']){
   const context=api.createOwnedCoreSourceContext(input(api,candidate,caller(annotation)));
   const analyzed=operations.analyzeOwnedCoreModule(context,'caller.mts');assert.equal(analyzed.program.length,1,JSON.stringify(analyzed.diagnostics));
   const checked=operations.checkOwnedCoreProgram(JSON.parse(JSON.stringify(analyzed.program)),context);
   assert.equal(checked[0].params[0].type,'borrowed-json-tool-input');assert.equal(checked[0].returns,'bool');
   const rust=operations.emitOwnedCoreProgram(checked,'rust'),typescript=operations.emitOwnedCoreProgram(checked,'typescript');
   assert.match(rust,/&(?:'a )?::serde_json::Value/u);assert.match(rust,/crate::borrowed_json_tool_predicate_20261103::borrowed_json_tool_is_translatable\(tool\)/u);
   assert.doesNotMatch(rust,/let __ro_arg_/u);assert.match(typescript,/Parameters<typeof __ro_borrowedJsonToolIsTranslatable>\[0\]/u);
   const runtime=await operations.prepareOwnedCoreRuntime(checked);
   for(const [value,expected]of examples){const before=JSON.stringify(value);assert.equal(operations.evaluateOwnedCoreProgram(checked,'query',[value],runtime),expected);assert.equal(JSON.stringify(value),before);}
   const target=api.createOwnedCoreSourceContext(input(api,candidate,typescript));
   const rebuilt=operations.analyzeOwnedCoreModule(target,'caller.mts');assert.equal(rebuilt.program.length,1,JSON.stringify(rebuilt.diagnostics));
   assert.equal(operations.emitOwnedCoreProgram(operations.checkOwnedCoreProgram(rebuilt.program,target),'rust'),rust);
   const forged=JSON.parse(JSON.stringify(checked));forged[0].body[0].value.name='forgedPredicate';assert.throws(()=>operations.checkOwnedCoreProgram(forged,context));
  }
 });
 test(lane+' full JavaScript JSDoc receiving path uses the original paired source checker',{timeout:60000},()=>{
  const source="import {borrowedJsonToolIsTranslatable as predicate} from './runtime/borrowed-json-tool-predicate-20261103-runtime.mjs';\n/** @param {Parameters<typeof predicate>[0]} tool @returns {boolean} */\nexport function query(tool){return predicate(tool);}\n";
  const context=api.createOwnedCoreSourceContext(input(api,candidate,source,'caller.mjs'));
  const analyzed=operations.analyzeOwnedCoreModule(context,'caller.mjs');assert.equal(analyzed.program.length,1,JSON.stringify(analyzed.diagnostics));
  assert.match(operations.emitOwnedCoreProgram(operations.checkOwnedCoreProgram(analyzed.program,context),'rust'),/&(?:'a )?::serde_json::Value/u);
 });
 test(lane+' complete body checker refuses aliases, escapes, JSON equality and shadowed callees',{timeout:60000},()=>{
  for(const body of ['const alias=tool;return predicate(alias);','return tool;','return tool===tool;','return predicate(tool.name);','return predicate(tool,tool);','const predicate=(value: unknown)=>true;return predicate(tool);']){
   const context=api.createOwnedCoreSourceContext(input(api,candidate,caller('unknown',body)));
   const analyzed=operations.analyzeOwnedCoreModule(context,'caller.mts');assert.equal(analyzed.program.length,0);assert.ok(analyzed.diagnostics.length>0);
  }
 });
 test(lane+' refuses changed runtime declaration or actual native owner source',{timeout:60000},()=>{
  for(const path of ['runtime/borrowed-json-tool-predicate-20261103-runtime.mjs','runtime/borrowed-json-tool-predicate-20261103-runtime.d.mts','src/borrowed_json_tool_predicate_20261103.rs']){
   const data=input(api,candidate),row=data.files.find(row=>row.path===path);assert.ok(row);row.source+='\n// changed complete source\n';
   const context=api.createOwnedCoreSourceContext(data);assert.throws(()=>operations.analyzeOwnedCoreModule(context,'caller.mts'));
  }
 });
}
test('native source scope rejoins nested operations and caught mutation poisons the whole invocation',{timeout:60000},()=>{
 const files=production(),before=files.get('src/lib.rs');
 assert.equal(withBorrowedJsonToolReverseNativeSources(files,()=>withBorrowedJsonToolReverseNativeSources(files,()=>19)),19);
 assert.throws(()=>withBorrowedJsonToolReverseNativeSources(files,()=>{
  files.set('src/lib.rs',before+'\n// changed\n');
  assert.throws(()=>withBorrowedJsonToolReverseNativeSources(files,()=>assert.fail('changed source admitted')));
  files.set('src/lib.rs',before);
 }));
 assert.equal(withBorrowedJsonToolReverseNativeSources(files,()=>29),29);
});
