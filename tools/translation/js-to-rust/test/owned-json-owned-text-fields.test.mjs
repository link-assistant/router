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
import {TEXT_NATIVE_SOURCE} from '../../text-native-source.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../../primitive-option-native-source.mjs';
import {INTEGER_NATIVE_SOURCE} from '../../integer-native-source.mjs';
import {prepareJsonFieldSources} from '../../prepare-json-field-sources.mjs';
import {prepareJsonFieldsCore} from '../../prepare-json-fields-core.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_object as object,json_macro_array as array,json_macro_u64 as unsigned,json_macro_i64 as signed} from '../../json-macro-runtime.mjs';
const limits={timeout:60_000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const keys=['0','a/b','~é😀','last'],some=field0=>({$:'Some',field0}),none={$:'None'},wrap=(depth,leaf)=>keys.slice(0,depth).reduceRight((value,key)=>object([[key,value]]),leaf);
const specs=[1,2,3,4].flatMap(depth=>[false,true].map(empty=>({depth,empty,name:'json_text_field'+(depth===1?'':depth)+(empty?'_or_empty':'')})));
const source="import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';\nimport {"+specs.map(row=>'router_field_'+row.name+' as '+row.name).join(',')+"} from './runtime/json-fields-runtime.mjs';\n"+specs.map(row=>'/** @param {import(\'./runtime/json-macro-runtime.mjs\').JsonValue} value */\nexport function '+row.name+'Value(value){const owner=copy(value);return '+row.name+'(owner,'+keys.slice(0,row.depth).map(key=>JSON.stringify(key)).join(',')+');}\n').join('');

function data(files=[{path:'caller.mjs',source}]){const input=ownedStateReceivingData(files);input.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_json_fields_core;\npub mod translation_text_core;\npub mod translation_primitive_option_core;\npub mod translation_integer_core;\n';input.files.push({path:'src/translation_json_fields_core.rs',source:JSON_FIELDS_NATIVE_SOURCE},{path:'src/translation_text_core.rs',source:TEXT_NATIVE_SOURCE},{path:'src/translation_primitive_option_core.rs',source:PRIMITIVE_OPTION_NATIVE_SOURCE},{path:'src/translation_integer_core.rs',source:INTEGER_NATIVE_SOURCE});return input;}
function draft(){const input=data(),context=createOwnedStateContext(input),result=translateOwnedStateJavaScript(source,{context,sourcePath:'caller.mjs'});return {input,context,result};}
async function targets(t,row){
 const directory=mkdtempSync(join(tmpdir(),'router-owned-json-fields-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};for(const file of row.input.files.filter(file=>/\.(mjs|mts|ts)$/u.test(file.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20_000});for(const file of row.input.files.filter(file=>file.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 return [await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href)];
}
test('all8 owned field outputs may outlive local JSON copies in JS strict TS both interpreters and whole Rust inverse',limits,async t=>{
 const row=draft(),modules=await targets(t,row),cases=specs.flatMap(spec=>[[spec.name+'Value',[wrap(spec.depth,text('é😀'))],spec.empty?'é😀':some('é😀')],[spec.name+'Value',[wrap(spec.depth,text(''))],spec.empty?'':some('')],[spec.name+'Value',[nil()],spec.empty?'':none]]);for(const module of modules)for(const [name,args,wanted]of cases)assert.deepEqual(module[name](...args),wanted);const token=await prepareOwnedStateRuntime(row.result.program);assert.deepEqual(evaluateOwnedStateBatch(row.result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));const typed=translateOwnedStateTypeScript(row.result.typescript,{context:createOwnedStateContext(data([{path:'caller.mts',source:row.result.typescript}])),sourcePath:'caller.mts'});assert.equal(typed.rust,row.result.rust);const native={...row.input,files:row.input.files.concat([{path:'rust/src/caller.rs',source:row.result.rust}])},inverse=translateOwnedStateRust(row.result.rust,{context:createOwnedStateContext(native),sourcePath:'rust/src/caller.rs',javascriptPath:'caller.mjs'});assert.equal(inverse.rust,row.result.rust);assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);const inverseToken=await prepareOwnedStateRuntime(inverse.program);assert.deepEqual(evaluateOwnedStateBatch(inverse.program,cases.map(([name,args])=>[name,args]),inverseToken),cases.map(row=>row[2]));
});
