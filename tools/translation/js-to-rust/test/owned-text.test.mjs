// Independent whole-caller regression SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../../owned-outcome-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../../text-native-source.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,evaluateOwnedOutcomeBatch,readOwnedOutcomeMeta} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {prepareOwnedTextSources} from '../../prepare-owned-text-sources.mjs';
import {prepareOwnedTypeAliasSources} from '../../prepare-owned-type-alias-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const source=`import {router_text_trim as trim,router_text_find as find,router_text_replace as replace,router_text_take_chars as take,router_text_slice_bytes as slice,router_text_strip_suffix as suffix,router_text_contains as contains,router_text_repeat as repeat} from './runtime/text-runtime.mjs';
/** @param {string} value */
export function trimmed(value){return trim(value);}
/** @param {string} value */
export function located(value){return find(value,'é');}
/** @param {string} value */
export function replaced(value){return replace(value,'😀','$&');}
/** @param {string} value */
export function initial(value){return take(value,2n);}
/** @param {string} value */
export function selected(value){return slice(value,1n,5n);}
/** @param {string} value */
export function removed(value){return suffix(value,'終');}
/** @param {string} value */
export function present(value){return contains(value,'😀');}
/** @param {string} value */
export function doubled(value){return repeat(value,2n);}
`;
function input(caller=source,path='caller.mjs'){
 const data=ownedStateReceivingData([{path,source:caller}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());data.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_carriers_core;\npub mod translation_text_core;\n';data.files.push({path:'src/translation_carriers_core.rs',source:OWNED_OUTCOME_NATIVE_SOURCE},{path:'src/translation_text_core.rs',source:TEXT_NATIVE_SOURCE});return data;
}
const checked=()=>{const data=input(),context=createOwnedOutcomeContext(data);return {data,context,result:translateOwnedOutcomeJavaScript(source,{context,sourcePath:'caller.mjs'})};};
const cases=[['trimmed',['\u0085😀 é\u3000'],'😀 é'],['located',['a😀é'],{$:'Some',field0:5n}],['located',['none'],{$:'None'}],['replaced',['😀😀'],'$&$&'],['initial',['a😀é'],'a😀'],['selected',['a😀é'],{$:'Some',field0:'😀'}],['selected',['aé'],{$:'None'}],['removed',['a😀終'],{$:'Some',field0:'a😀'}],['removed',['a😀'],{$:'None'}],['present',['a😀'],true],['present',['abc'],false],['doubled',['é😀'],'é😀é😀']];
test('actual original JS generated strict TS and independent interpreters preserve UTF-8 text behavior',limits,async t=>{
 const row=checked(),directory=mkdtempSync(join(tmpdir(),'router-owned-text-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),value);};for(const file of row.data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of row.data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 for(const path of ['caller.mjs','out/typed.mjs']){const api=await import(pathToFileURL(join(directory,path)).href);for(const [name,args,expected]of cases)assert.deepEqual(api[name](...args),expected);}
 const token=await prepareOwnedOutcomeRuntime(row.result.program);for(const [name,args,expected]of cases)assert.deepEqual(evaluateOwnedOutcome(row.result.program,name,args,token),expected);assert.deepEqual(evaluateOwnedOutcomeBatch(row.result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));assert.equal(readOwnedOutcomeMeta(row.result.meta,{context:row.context}).length,8);
});
test('complete typed and canonical native callers reproduce source with fresh loan and body checks',limits,()=>{
 const row=checked(),typed=translateOwnedOutcomeTypeScript(row.result.typescript,{context:createOwnedOutcomeContext(input(row.result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(typed.rust,row.result.rust));const data={...row.data,files:[...row.data.files,{path:'caller.rs',source:row.result.rust}]},inverse=translateOwnedOutcomeRust(row.result.rust,{context:createOwnedOutcomeContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,row.result.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);
});
test('changed actual sources wrong domains unsupported loans and forged detached IR remain refused',limits,async()=>{
 for(const path of ['src/translation_text_core.rs','runtime/text-runtime.mjs','runtime/text-runtime.d.mts']){const data=input();data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));}
 for(const caller of [source.replace('take(value,2n)','take(value,2)'),source.replace('take(value,2n)','take(value,-1n)'),source.replace('return trim(value);',"const owned=replace(value,'a','b');return trim(owned);"),source.replace('return contains(value,', 'return contains({},')])assert.throws(()=>translateOwnedOutcomeJavaScript(caller,{context:createOwnedOutcomeContext(input(caller)),sourcePath:'caller.mjs'}));const row=checked();await assert.rejects(()=>prepareOwnedOutcomeRuntime(JSON.parse(JSON.stringify(row.result.program))));
});
test('every complete text predecessor and composed alias history retains both ordered source sequences',limits,()=>{
 const plan=prepareOwnedTextSources();assert.equal(plan.files.length,7);for(const family of [plan,prepareOwnedTypeAliasSources()])for(const row of family.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
