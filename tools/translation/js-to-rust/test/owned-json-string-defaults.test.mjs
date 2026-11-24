// Independent complete receiving regression SOURCE; no execution while drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {createOwnedStateContext,translateOwnedStateJavaScript,translateOwnedStateTypeScript,readOwnedStateMeta,emitOwnedStateRust,prepareOwnedStateRuntime,evaluateOwnedState,evaluateOwnedStateBatch} from '../owned-state.mjs';
import {translateOwnedStateRust} from '../owned-rust.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from '../../json-fields-native-source.mjs';
import {prepareJsonFieldSources} from '../../prepare-json-field-sources.mjs';
import {prepareJsonFieldsCore} from '../../prepare-json-fields-core.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_object as object,json_macro_array as array,json_macro_u64 as unsigned,json_macro_i64 as signed} from '../../json-macro-runtime.mjs';
const limits={timeout:60_000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const source=`import {router_field_json_str_field_or_empty as field} from './runtime/json-fields-runtime.mjs';
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value @param {string} key */
export function getOrEmpty(value,key){return field(value,key);}
`;

function data(files=[{path:'caller.mjs',source}]){const input=ownedStateReceivingData(files);input.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_json_fields_core;\n';input.files.push({path:'src/translation_json_fields_core.rs',source:JSON_FIELDS_NATIVE_SOURCE});return input;}
function draft(){const input=data(),context=createOwnedStateContext(input),result=translateOwnedStateJavaScript(source,{context,sourcePath:'caller.mjs'});return {input,context,result};}
async function targets(t,row){
 const directory=mkdtempSync(join(tmpdir(),'router-owned-json-fields-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};for(const file of row.input.files.filter(file=>/\.(mjs|mts|ts)$/u.test(file.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20_000});for(const file of row.input.files.filter(file=>file.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 return [await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href)];
}
test('the actual borrowed-empty field source carries live JSON roots through JS strict TS both interpreters and full native inverse',limits,async t=>{
 const row=draft(),modules=await targets(t,row),token=await prepareOwnedStateRuntime(row.result.program),cases=[[object([['name',text('é😀')]]),'name','é😀'],[object([['name',text('')]]),'name',''],[object([]),'missing',''],[object([['name',nil()]]),'name',''],[nil(),'name','']];for(const module of modules)for(const [value,key,wanted]of cases)assert.equal(module.getOrEmpty(value,key),wanted);assert.deepEqual(evaluateOwnedStateBatch(row.result.program,cases.map(([value,key])=>['getOrEmpty',[value,key]]),token),cases.map(([, ,wanted])=>wanted));const typed=translateOwnedStateTypeScript(row.result.typescript,{context:createOwnedStateContext(data([{path:'caller.mts',source:row.result.typescript}])),sourcePath:'caller.mts'});assert.equal(typed.rust,row.result.rust);const native={...row.input,files:row.input.files.concat([{path:'rust/src/caller.rs',source:row.result.rust}])},inverse=translateOwnedStateRust(row.result.rust,{context:createOwnedStateContext(native),sourcePath:'rust/src/caller.rs',javascriptPath:'caller.mjs'});assert.equal(inverse.rust,row.result.rust);assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);const inverseToken=await prepareOwnedStateRuntime(inverse.program);assert.deepEqual(evaluateOwnedStateBatch(inverse.program,cases.map(([value,key])=>['getOrEmpty',[value,key]]),inverseToken),cases.map(([, ,wanted])=>wanted));
});
test('borrowed defaults cannot return a root tied only to a local JSON copy or use counterfeit field source',limits,()=>{
 const local="import {router_field_json_str_field_or_empty as field} from './runtime/json-fields-runtime.mjs';\nimport {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';\n/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */ export function invalid(value){const owned=copy(value);return field(owned,'name');}";assert.throws(()=>translateOwnedStateJavaScript(local,{context:createOwnedStateContext(data([{path:'caller.mjs',source:local}])),sourcePath:'caller.mjs'}),/live actual input root/u);for(const path of ['src/translation_json_fields_core.rs','runtime/json-fields-runtime.mjs']){const changed=data();changed.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedStateJavaScript(source,{context:createOwnedStateContext(changed),sourcePath:'caller.mjs'}));}
});
