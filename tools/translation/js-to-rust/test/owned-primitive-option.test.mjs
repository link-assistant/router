// Independent actual-caller regression SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../../owned-outcome-native-source.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../../primitive-option-native-source.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_u64 as uint,json_macro_i64 as sint} from '../../json-macro-runtime.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,evaluateOwnedOutcomeBatch} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {prepareOwnedPrimitiveOptionSources} from '../../prepare-owned-primitive-option-sources.mjs';
import {prepareTextMethodAdoption} from '../../prepare-text-method-adoption.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const source=`import {serde_json_value_as_u64 as number,serde_json_value_as_i64 as signed,serde_json_value_as_bool as boolean,serde_json_value_as_str as text} from './runtime/json-runtime.mjs';
import {router_option_u64_unwrap_or as numericOr,router_option_i64_unwrap as signedUnwrap,router_option_bool_unwrap_or as booleanOr,router_option_str_unwrap_or as textOr,router_option_u64_some as some,router_option_u64_is_some as present,router_option_str_some as someText,router_option_str_none as noText} from './runtime/primitive-option-runtime.mjs';
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function numeric(value){return numericOr(number(value),10n);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function signedValue(value){return signedUnwrap(signed(value));}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function boolValue(value){return booleanOr(boolean(value),true);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function title(value){return textOr(text(value),'fallback😀');}
export function guarded(){const value=some(0n);if(present(value)){return value.field0;}return 1n;}
export function constructed(){return numericOr({$:'Some',field0:0n},1n);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function early(value){const selected=number(value);if(!present(selected)){return 1n;}return selected.field0;}
/** @param {boolean} choice @param {string} value */
export function maybeText(choice,value){if(choice){const absent=noText();return absent;}return someText(value);}
`;
function input(caller=source,path='caller.mjs'){
 const data=ownedStateReceivingData([{path,source:caller}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());data.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_carriers_core;\npub mod translation_primitive_option_core;\n';data.files.push({path:'src/translation_carriers_core.rs',source:OWNED_OUTCOME_NATIVE_SOURCE},{path:'src/translation_primitive_option_core.rs',source:PRIMITIVE_OPTION_NATIVE_SOURCE});return data;
}
const checked=()=>{const data=input(),context=createOwnedOutcomeContext(data);return {data,context,result:translateOwnedOutcomeJavaScript(source,{context,sourcePath:'caller.mjs'})};};
const cases=[['numeric',[uint(0n)],0n],['numeric',[nil()],10n],['signedValue',[sint(-9223372036854775808n)],-9223372036854775808n],['boolValue',[bool(false)],false],['boolValue',[nil()],true],['title',[text('')],''],['title',[nil()],'fallback😀'],['guarded',[],0n],['constructed',[],0n],['early',[nil()],1n],['early',[uint(0n)],0n],['early',[uint(18446744073709551615n)],18446744073709551615n],['maybeText',[true,'é😀'],{$:'None'}],['maybeText',[false,'é😀'],{$:'Some',field0:'é😀'}]];
test('original JS independently strict TS and both interpreters preserve complete Option callers',limits,async t=>{
 const row=checked(),directory=mkdtempSync(join(tmpdir(),'router-owned-primitive-option-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),value);};for(const file of row.data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of row.data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 for(const path of ['caller.mjs','out/typed.mjs']){const api=await import(pathToFileURL(join(directory,path)).href);for(const [name,args,expected]of cases)assert.deepEqual(api[name](...args),expected);assert.throws(()=>api.signedValue(nil()),RangeError);}
 const token=await prepareOwnedOutcomeRuntime(row.result.program);for(const [name,args,expected]of cases)assert.deepEqual(evaluateOwnedOutcome(row.result.program,name,args,token),expected);assert.deepEqual(evaluateOwnedOutcomeBatch(row.result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));assert.throws(()=>evaluateOwnedOutcome(row.result.program,'signedValue',[nil()],token),RangeError);
});
test('typed callers canonical Rust inverse guards and absence joins reproduce the full native source',limits,()=>{
 const row=checked(),typed=translateOwnedOutcomeTypeScript(row.result.typescript,{context:createOwnedOutcomeContext(input(row.result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(typed.rust,row.result.rust));const data={...row.data,files:[...row.data.files,{path:'caller.rs',source:row.result.rust}]},inverse=translateOwnedOutcomeRust(row.result.rust,{context:createOwnedOutcomeContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,row.result.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);
});
test('changed actual sources width/sign mismatches unguarded projections and detached programs refuse',limits,async()=>{
 for(const path of ['src/translation_primitive_option_core.rs','runtime/primitive-option-runtime.mjs','runtime/primitive-option-runtime.d.mts']){const data=input();data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));}
 for(const caller of [source.replace('numericOr(number(value),10n)','numericOr(signed(value),10n)'),source.replace('some(0n)','some(-1n)'),source.replace('if(present(value))','if(true)'),source.replace('numericOr({$', 'numericOr({extra:true,$')])assert.throws(()=>translateOwnedOutcomeJavaScript(caller,{context:createOwnedOutcomeContext(input(caller)),sourcePath:'caller.mjs'}));const row=checked();await assert.rejects(()=>prepareOwnedOutcomeRuntime(JSON.parse(JSON.stringify(row.result.program))));
});
test('all twelve complete original integrations and preceding copied runtime assets retain full inverses',limits,()=>{const current=prepareOwnedPrimitiveOptionSources();assert.equal(current.files.length,12);for(const family of [current,prepareTextMethodAdoption()])for(const row of family.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(current.receivingExecuted,false);});
