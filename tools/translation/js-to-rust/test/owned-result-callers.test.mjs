// Independent owned String caller SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {TEXT_NATIVE_SOURCE} from '../../text-native-source.mjs';
import {OWNED_RESULT_NATIVE_SOURCE} from '../../owned-result-native-source.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,evaluateOwnedOutcomeBatch} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {prepareOwnedResultCallerSources} from '../../prepare-owned-result-callers-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const source=`import {router_owned_result_text_ok as ok,router_owned_result_text_err as error,router_owned_result_text_unwrap as unwrap,router_owned_result_text_to_text_map as map,router_owned_result_str_to_text_map as copyMap,router_owned_result_text_to_text_and_then as bind,router_owned_result_text_to_str_map as captured,router_owned_result_text_map_err as mapError,router_owned_result_text_or_else as recover,router_owned_result_text_ok_option as optional} from './runtime/owned-result-runtime.mjs';
import {router_text_replace as replace} from './runtime/text-runtime.mjs';
/** @param {string} value */
export function wrapped(value){return ok(value);}
/** @param {Parameters<typeof ok>[0]} value */
export function ownedParameter(value){return ok(value);}
/** @param {Parameters<typeof unwrap>[0]} value */
export function unwrapped(value){return unwrap(value);}
/** @param {Parameters<typeof map>[0]} value */
export function mapped(value){return map(value,item=>replace(item,'old','😀'));}
/** @param {Parameters<typeof map>[0]} value */
export function literalMap(value){return map(value,item=>'');}
/** @param {Parameters<typeof copyMap>[0]} value */
export function copiedBorrow(value){return copyMap(value,item=>item);}
/** @param {Parameters<typeof bind>[0]} value */
export function bound(value){return bind(value,item=>ok(item));}
/** @param {Parameters<typeof captured>[0]} value @param {string} text */
export function capture(value,text){return captured(value,item=>text);}
/** @param {Parameters<typeof mapError>[0]} value */
export function literalError(value){return mapError(value,reason=>'changed');}
/** @param {Parameters<typeof recover>[0]} value */
export function recovered(value){return recover(value,reason=>ok(''));}
/** @param {Parameters<typeof optional>[0]} value */
export function asOptional(value){return optional(value);}
/** @returns {ReturnType<typeof ok>} */
export function constructed(){return {$:'Ok',field0:''};}
`;
function input(caller=source,path='caller.mjs'){
 const data=ownedStateReceivingData([{path,source:caller}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());for(const [name,source]of [['translation_text_core',TEXT_NATIVE_SOURCE],['translation_owned_results_core',OWNED_RESULT_NATIVE_SOURCE]]){data.files.find(row=>row.path==='src/lib.rs').source+='pub mod '+name+';\n';data.files.push({path:'src/'+name+'.rs',source});}return data;
}
const cases=[['wrapped',[''],{$:'Ok',field0:''}],['wrapped',['é😀'],{$:'Ok',field0:'é😀'}],['ownedParameter',['😀'],{$:'Ok',field0:'😀'}],['unwrapped',[{$:'Ok',field0:''}],''],['mapped',[{$:'Ok',field0:'oldold'}],{$:'Ok',field0:'😀😀'}],['mapped',[{$:'Err',field0:''}],{$:'Err',field0:''}],['literalMap',[{$:'Ok',field0:'old'}],{$:'Ok',field0:''}],['copiedBorrow',[{$:'Ok',field0:'é😀'}],{$:'Ok',field0:'é😀'}],['bound',[{$:'Ok',field0:''}],{$:'Ok',field0:''}],['capture',[{$:'Ok',field0:'consumed'},'captured'],{$:'Ok',field0:'captured'}],['capture',[{$:'Err',field0:''},'unselected'],{$:'Err',field0:''}],['literalError',[{$:'Err',field0:''}],{$:'Err',field0:'changed'}],['literalError',[{$:'Ok',field0:''}],{$:'Ok',field0:''}],['recovered',[{$:'Err',field0:'old'}],{$:'Ok',field0:''}],['asOptional',[{$:'Ok',field0:''}],{$:'Some',field0:''}],['asOptional',[{$:'Err',field0:''}],{$:'None'}],['constructed',[],{$:'Ok',field0:''}]];
test('actual JS independently strict TS and both interpreters retain owned String inputs copies and Results',limits,async t=>{
 const data=input(),result=translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}),directory=mkdtempSync(join(tmpdir(),'router-owned-result-callers-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),value);};for(const file of data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 for(const path of ['caller.mjs','out/typed.mjs']){const api=await import(pathToFileURL(join(directory,path)).href);for(const [name,args,expected]of cases)assert.deepEqual(api[name](...args),expected);assert.throws(()=>api.unwrapped({$:'Err',field0:'same'}),error=>error instanceof RangeError&&error.message==='same');}const token=await prepareOwnedOutcomeRuntime(result.program);for(const [name,args,expected]of cases)assert.deepEqual(evaluateOwnedOutcome(result.program,name,args,token),expected);assert.deepEqual(evaluateOwnedOutcomeBatch(result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));assert.match(result.rust,/fn owned_parameter\(value: (?:\:\:std\:\:string\:\:)?String\)/u);
});
test('actual typed source and canonical Rust inverse retain owned public parameters and complete copies',limits,()=>{
 const data=input(),result=translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}),typed=translateOwnedOutcomeTypeScript(result.typescript,{context:createOwnedOutcomeContext(input(result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(result.rust,typed.rust));const inverse=translateOwnedOutcomeRust(result.rust,{context:createOwnedOutcomeContext({...data,files:[...data.files,{path:'caller.rs',source:result.rust}]}),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,inverse.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,result.rust);
});
test('borrowed output cannot be invented from an owned success and complete runtime/native sources remain mandatory',limits,async()=>{
 for(const caller of [source.replace('item=>text','item=>item'),source.replace('return captured(value,item=>text);','let mutable=text;return captured(value,item=>mutable);'),source.replace("item=>replace(item,'old','😀')",'item=>0n')])assert.throws(()=>translateOwnedOutcomeJavaScript(caller,{context:createOwnedOutcomeContext(input(caller)),sourcePath:'caller.mjs'}));for(const path of ['src/translation_owned_results_core.rs','src/translation_text_core.rs','runtime/owned-result-runtime.mjs','runtime/owned-result-runtime.d.mts']){const data=input();data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));}const result=translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(input()),sourcePath:'caller.mjs'});await assert.rejects(()=>prepareOwnedOutcomeRuntime(JSON.parse(JSON.stringify(result.program))));
});
test('all twelve complete original source integrations retain exact inverses and ordered rule stages',limits,()=>{const plan=prepareOwnedResultCallerSources();assert.equal(plan.files.length,12);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
