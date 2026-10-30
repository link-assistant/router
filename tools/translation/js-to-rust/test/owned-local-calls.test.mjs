// Independent module-call regression SOURCE; no execution during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../../owned-outcome-native-source.mjs';
import {INTEGER_NATIVE_SOURCE} from '../../integer-native-source.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,evaluateOwnedOutcomeBatch,readOwnedOutcomeMeta,emitOwnedOutcomeRust} from '../owned-outcome.mjs';
import {serializeOwnedCoreDocument} from '../owned-outcome-document.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareOwnedLocalCallSources} from '../../prepare-owned-local-call-sources.mjs';
import {prepareOwnedSseSources} from '../../prepare-owned-sse-sources.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_array as array,json_macro_object as object} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const imports=`import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';
import {router_core_json_map as map} from './runtime/json-collections-runtime.mjs';
import {router_state_json_values_copy as valuesCopy} from './runtime/json-state-runtime.mjs';
import {json_macro_null as nil} from './runtime/json-macro-runtime.mjs';
import {serde_json_value_as_str as asText} from './runtime/json-runtime.mjs';
import {router_integer_u64_saturating_add as add} from './runtime/integer-runtime.mjs';
`;
const source=imports+`
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function entry(value){return middle(value);}
/** @param {Parameters<typeof valuesCopy>[0]} values */
export function mapped(values){return map(values,value=>{return cloned(value);});}
/** @param {Parameters<typeof add>[0]} value */
export function counted(value){return incremented(incremented(value));}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
function middle(value){return cloned(value);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
function cloned(value){return copy(value);}
/** @param {Parameters<typeof add>[0]} value */
function incremented(value){return add(value,1n);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function borrowed(value){return viewed(value);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
function viewed(value){return asText(value);}
`;
function input(caller=source,path='caller.mjs'){const data=ownedStateReceivingData([{path,source:caller}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());data.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_carriers_core;\npub mod translation_integer_core;\n';data.files.push({path:'src/translation_carriers_core.rs',source:OWNED_OUTCOME_NATIVE_SOURCE},{path:'src/translation_integer_core.rs',source:INTEGER_NATIVE_SOURCE});return data;}
function draft(){const data=input(),context=createOwnedOutcomeContext(data),result=translateOwnedOutcomeJavaScript(source,{context,sourcePath:'caller.mjs'});return {data,context,result};}
test('hoisted helpers chained and callback calls signed interfaces and return loans agree in actual JS TS and both interpreters',limits,async t=>{
 const row=draft(),directory=mkdtempSync(join(tmpdir(),'router-owned-local-calls-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),value);};for(const file of row.data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of row.data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 const modules=[await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href)],token=await prepareOwnedOutcomeRuntime(row.result.program),document=object([['a',bool(false)],['text',text('λ😀')]]),cases=[['entry',[document],document],['entry',[nil()],nil()],['mapped',[[nil(),text('a')]],array([nil(),text('a')])],['counted',[0n],2n],['counted',[18446744073709551615n],18446744073709551615n],['borrowed',[text('λ😀')],{$:'Some',field0:'λ😀'}],['borrowed',[nil()],{$:'None'}]];for(const module of modules)for(const [name,args,expected]of cases)assert.deepEqual(module[name](...args),expected);assert.deepEqual(cases.map(([name,args])=>evaluateOwnedOutcome(row.result.program,name,args,token)),cases.map(row=>row[2]));assert.deepEqual(evaluateOwnedOutcomeBatch(row.result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));assert.equal(emitOwnedOutcomeRust(readOwnedOutcomeMeta(row.result.meta,{context:row.context})),row.result.rust);
});
test('actual typed and complete Rust source freshly reproduce all ordinary function calls',limits,()=>{
 const row=draft(),typed=translateOwnedOutcomeTypeScript(row.result.typescript,{context:createOwnedOutcomeContext(input(row.result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(typed.rust,row.result.rust));const data={...row.data,files:[...row.data.files,{path:'caller.rs',source:row.result.rust}]},inverse=translateOwnedOutcomeRust(row.result.rust,{context:createOwnedOutcomeContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,row.result.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);
});
test('a missing changed reordered or forged callee cannot become a checked executable module',limits,async()=>{
 const row=draft(),missing=row.result.program.filter(item=>item.javascript!=='cloned');assert.throws(()=>emitOwnedOutcomeRust(missing),/callee|closure/u);await assert.rejects(()=>prepareOwnedOutcomeRuntime(missing),/callee|closure/u);assert.throws(()=>serializeOwnedCoreDocument(missing,{context:row.context}),/callee|closure/u);
 const forged=structuredClone(row.result.program);forged.find(item=>item.javascript==='entry').body[0].value.calleeSpan[0]++;assert.throws(()=>emitOwnedOutcomeRust(forged));const altered=source.replace('return copy(value);','return nil();'),other=translateOwnedOutcomeJavaScript(altered,{context:createOwnedOutcomeContext(input(altered)),sourcePath:'caller.mjs'}),mixed=row.result.program.map(item=>item.javascript==='cloned'?other.program.find(target=>target.javascript==='cloned'):item);assert.throws(()=>emitOwnedOutcomeRust(mixed));await assert.rejects(()=>prepareOwnedOutcomeRuntime(mixed));
 // Reordering complete checked definitions is valid; source links still join
 // the actual declaration and do not depend on user-provided array positions.
 assert.match(emitOwnedOutcomeRust([...row.result.program].reverse()),/fn entry/);
});
test('recursive components unresolved helper bodies parameter shadows and escaping temporary loans refuse',limits,()=>{
 const cases=[imports+'/** @param {import(\'./runtime/json-macro-runtime.mjs\').JsonValue} value */ export function recur(value){return recur(value);}',imports+'/** @param {import(\'./runtime/json-macro-runtime.mjs\').JsonValue} value */ export function first(value){return second(value);}/** @param {import(\'./runtime/json-macro-runtime.mjs\').JsonValue} value */ function second(value){return first(value);}',source.replace('return copy(value);','return unknown(value);'),source.replace('return middle(value);','const middle=value;return middle(value);'),source.replace('return viewed(value);','return viewed(copy(value));')];for(const caller of cases)assert.throws(()=>translateOwnedOutcomeJavaScript(caller,{context:createOwnedOutcomeContext(input(caller)),sourcePath:'caller.mjs'}));
});
test('five complete original source copies compose prior histories and retain full CST inverses',limits,()=>{const current=prepareOwnedLocalCallSources();assert.equal(current.files.length,5);for(const plan of [current,prepareOwnedSseSources()])for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}});
