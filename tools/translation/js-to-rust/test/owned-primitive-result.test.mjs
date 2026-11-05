// Independent Result callers/refusals SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {TEXT_NATIVE_SOURCE} from '../../text-native-source.mjs';
import {PRIMITIVE_RESULT_NATIVE_SOURCE} from '../../primitive-result-native-source.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,evaluateOwnedOutcomeBatch} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {prepareOwnedPrimitiveResultSources} from '../../prepare-owned-primitive-result-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const source=`import {router_result_u64_ok as ok,router_result_u64_err as error,router_result_u64_unwrap as unwrap,router_result_u64_unwrap_or as eager,router_result_u64_unwrap_or_else as lazy,router_result_u64_to_bool_map as map,router_result_u64_to_u64_and_then as bind,router_result_u64_map_err as mapError,router_result_u64_or_else as recover,router_result_u64_to_str_map as captured,router_result_str_ok as okText,router_result_str_err as errorText,router_result_str_ok_option as optionalText,router_result_u64_err_option as optionalError} from './runtime/primitive-result-runtime.mjs';
import {router_text_replace as replace} from './runtime/text-runtime.mjs';
/** @param {Parameters<typeof eager>[0]} value */
export function fallback(value){return eager(value,18446744073709551615n);}
/** @param {Parameters<typeof map>[0]} value */
export function mapped(value){return map(value,item=>item===0n);}
/** @param {Parameters<typeof bind>[0]} value */
export function bound(value){return bind(value,item=>{if(item===0n){return ok(0n);}return error('next');});}
/** @param {Parameters<typeof lazy>[0]} value */
export function shortCircuit(value){return lazy(value,reason=>unwrap(error('selected')));}
/** @param {Parameters<typeof mapError>[0]} value */
export function changedError(value){return mapError(value,reason=>replace(reason,'old','😀'));}
/** @param {Parameters<typeof recover>[0]} value */
export function recovered(value){return recover(value,reason=>ok(0n));}
/** @param {Parameters<typeof captured>[0]} value @param {string} text */
export function capture(value,text){return captured(value,item=>text);}
/** @param {Parameters<typeof optionalText>[0]} value */
export function textOption(value){return optionalText(value);}
/** @param {Parameters<typeof optionalError>[0]} value */
export function errorOption(value){return optionalError(value);}
/** @param {Parameters<typeof ok>[0]} value @returns {ReturnType<typeof ok>} */
export function constructed(value){return {$:'Ok',field0:value};}
/** @param {boolean} select @param {string} value */
export function maybeText(select,value){if(select){return errorText('');}return okText(value);}
/** @param {Parameters<typeof eager>[0]} value @returns {Parameters<typeof ok>[0]} */
export function guarded(value){if(value.$==='Ok'){return value.field0;}return 1n;}
`;
function input(caller=source,path='caller.mjs'){
 const data=ownedStateReceivingData([{path,source:caller}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());for(const [name,source]of [['translation_text_core',TEXT_NATIVE_SOURCE],['translation_primitive_results_core',PRIMITIVE_RESULT_NATIVE_SOURCE]]){data.files.find(row=>row.path==='src/lib.rs').source+='pub mod '+name+';\n';data.files.push({path:'src/'+name+'.rs',source});}return data;
}
const cases=[['fallback',[{$:'Ok',field0:0n}],0n],['fallback',[{$:'Err',field0:''}],18446744073709551615n],['mapped',[{$:'Ok',field0:0n}],{$:'Ok',field0:true}],['mapped',[{$:'Ok',field0:1n}],{$:'Ok',field0:false}],['mapped',[{$:'Err',field0:''}],{$:'Err',field0:''}],['bound',[{$:'Ok',field0:0n}],{$:'Ok',field0:0n}],['bound',[{$:'Ok',field0:1n}],{$:'Err',field0:'next'}],['bound',[{$:'Err',field0:'old'}],{$:'Err',field0:'old'}],['shortCircuit',[{$:'Ok',field0:0n}],0n],['changedError',[{$:'Err',field0:'oldold'}],{$:'Err',field0:'😀😀'}],['changedError',[{$:'Ok',field0:0n}],{$:'Ok',field0:0n}],['recovered',[{$:'Err',field0:''}],{$:'Ok',field0:0n}],['capture',[{$:'Ok',field0:0n},'é😀'],{$:'Ok',field0:'é😀'}],['capture',[{$:'Err',field0:''},'unselected'],{$:'Err',field0:''}],['textOption',[{$:'Ok',field0:''}],{$:'Some',field0:''}],['textOption',[{$:'Err',field0:''}],{$:'None'}],['errorOption',[{$:'Ok',field0:0n}],{$:'None'}],['errorOption',[{$:'Err',field0:''}],{$:'Some',field0:''}],['constructed',[18446744073709551615n],{$:'Ok',field0:18446744073709551615n}],['maybeText',[true,'unselected'],{$:'Err',field0:''}],['maybeText',[false,'😀'],{$:'Ok',field0:'😀'}],['guarded',[{$:'Ok',field0:0n}],0n],['guarded',[{$:'Err',field0:''}],1n]];
test('actual JS strict TS and both independent interpreters preserve Result constructors mapping recovery and ownership',limits,async t=>{
 const data=input(),result=translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}),directory=mkdtempSync(join(tmpdir(),'router-owned-result-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),value);};for(const file of data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 for(const path of ['caller.mjs','out/typed.mjs']){const api=await import(pathToFileURL(join(directory,path)).href);for(const [name,args,expected]of cases)assert.deepEqual(api[name](...args),expected);assert.throws(()=>api.shortCircuit({$:'Err',field0:'old'}),error=>error instanceof RangeError&&error.message==='selected');}
 const token=await prepareOwnedOutcomeRuntime(result.program);for(const [name,args,expected]of cases)assert.deepEqual(evaluateOwnedOutcome(result.program,name,args,token),expected);assert.deepEqual(evaluateOwnedOutcomeBatch(result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));assert.throws(()=>evaluateOwnedOutcome(result.program,'shortCircuit',[{$:'Err',field0:''}],token),RangeError);
});
test('actual TS and canonical Rust inverse reproduce complete Result bodies and source equations',limits,()=>{
 const data=input(),result=translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}),typed=translateOwnedOutcomeTypeScript(result.typescript,{context:createOwnedOutcomeContext(input(result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(result.rust,typed.rust));const inverse=translateOwnedOutcomeRust(result.rust,{context:createOwnedOutcomeContext({...data,files:[...data.files,{path:'caller.rs',source:result.rust}]}),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,inverse.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,result.rust);
});
test('changed complete dependencies wrong result bodies unguarded projections captures and detached IR refuse',limits,async()=>{
 for(const path of ['src/translation_text_core.rs','src/translation_primitive_results_core.rs','runtime/primitive-result-runtime.mjs','runtime/primitive-result-runtime.d.mts']){const data=input();data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));}
 for(const caller of [source.replace('item=>item===0n','item=>0n'),source.replace('return ok(0n);','return {$:\'Ok\',field0:false};'),source.replace('if(value.$===\'Ok\')','if(true)'),source.replace('return captured(value,item=>text);','let mutable=text;return captured(value,item=>mutable);'),source.replace('reason=>replace(reason,\'old\',\'😀\')','reason=>false')])assert.throws(()=>translateOwnedOutcomeJavaScript(caller,{context:createOwnedOutcomeContext(input(caller)),sourcePath:'caller.mjs'}));const result=translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(input()),sourcePath:'caller.mjs'});await assert.rejects(()=>prepareOwnedOutcomeRuntime(JSON.parse(JSON.stringify(result.program))));
});
test('sixteen complete original source integrations retain both phases and complete inverses',limits,()=>{const plan=prepareOwnedPrimitiveResultSources();assert.equal(plan.files.length,16);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
