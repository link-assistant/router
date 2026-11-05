// Independent caller and refusal SOURCE; unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {TEXT_NATIVE_SOURCE} from '../../text-native-source.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../../primitive-option-native-source.mjs';
import {PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE} from '../../primitive-option-callback-native-source.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,evaluateOwnedOutcomeBatch} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {prepareOwnedPrimitiveOptionCallbackSources} from '../../prepare-owned-primitive-option-callback-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const source=`import {router_option_callback_bool_to_u64_map as mapped,router_option_callback_u64_to_str_map as captured,router_option_callback_str_to_str_map as trimMap,router_option_callback_str_to_str_and_then as bound,router_option_callback_u64_unwrap_or_else as lazy,router_option_callback_str_unwrap_or_else as lazyText} from './runtime/primitive-option-callback-runtime.mjs';
import {router_option_u64_unwrap as unwrap,router_option_u64_none as none,router_option_str_some as some} from './runtime/primitive-option-runtime.mjs';
import {router_text_trim as trim} from './runtime/text-runtime.mjs';
/** @param {Parameters<typeof mapped>[0]} value */
export function numeric(value){return mapped(value,item=>{if(item){return 0n;}return 18446744073709551615n;});}
/** @param {Parameters<typeof captured>[0]} value @param {string} text */
export function capture(value,text){return captured(value,item=>text);}
/** @param {Parameters<typeof trimMap>[0]} value */
export function cleaned(value){return trimMap(value,item=>trim(item));}
/** @param {Parameters<typeof bound>[0]} value @param {string} text */
export function bindCapture(value,text){return bound(value,item=>{const result=some(text);return result;});}
/** @param {Parameters<typeof lazy>[0]} value */
export function shortCircuit(value){return lazy(value,()=>unwrap(none()));}
/** @param {Parameters<typeof lazyText>[0]} value @param {string} text */
export function fallback(value,text){return lazyText(value,()=>trim(text));}
export function staticOutput(){return trimMap(some('  😀  '),item=>trim(item));}
`;
function input(caller=source,path='caller.mjs'){
 const data=ownedStateReceivingData([{path,source:caller}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());const native=[['translation_text_core',TEXT_NATIVE_SOURCE],['translation_primitive_option_core',PRIMITIVE_OPTION_NATIVE_SOURCE],['translation_primitive_option_callbacks_core',PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE]];for(const [name,source]of native){data.files.find(row=>row.path==='src/lib.rs').source+='pub mod '+name+';\n';data.files.push({path:'src/'+name+'.rs',source});}return data;
}
const cases=[['numeric',[{$:'Some',field0:true}],{$:'Some',field0:0n}],['numeric',[{$:'Some',field0:false}],{$:'Some',field0:18446744073709551615n}],['numeric',[{$:'None'}],{$:'None'}],['capture',[{$:'Some',field0:0n},'é😀'],{$:'Some',field0:'é😀'}],['capture',[{$:'None'},'é😀'],{$:'None'}],['cleaned',[{$:'Some',field0:'\u0085😀\u3000'}],{$:'Some',field0:'😀'}],['cleaned',[{$:'None'}],{$:'None'}],['bindCapture',[{$:'Some',field0:''},'borrowed'],{$:'Some',field0:'borrowed'}],['shortCircuit',[{$:'Some',field0:0n}],0n],['fallback',[{$:'Some',field0:''},'unselected'],''],['fallback',[{$:'None'},'  é😀  '],'é😀'],['staticOutput',[],{$:'Some',field0:'😀'}]];
test('actual JS, strict TS and two independent interpreters preserve map bind captures and lazy failure',limits,async t=>{
 const data=input(),result=translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}),directory=mkdtempSync(join(tmpdir(),'router-option-callback-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),value);};for(const file of data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 for(const path of ['caller.mjs','out/typed.mjs']){const api=await import(pathToFileURL(join(directory,path)).href);for(const [name,args,expected]of cases)assert.deepEqual(api[name](...args),expected);assert.throws(()=>api.shortCircuit({$:'None'}),RangeError);}
 const token=await prepareOwnedOutcomeRuntime(result.program);for(const [name,args,expected]of cases)assert.deepEqual(evaluateOwnedOutcome(result.program,name,args,token),expected);assert.deepEqual(evaluateOwnedOutcomeBatch(result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));assert.throws(()=>evaluateOwnedOutcome(result.program,'shortCircuit',[{$:'None'}],token),RangeError);
});
test('complete typed and canonical native callback sources reproduce every original body and source inverse',limits,()=>{
 const data=input(),result=translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}),typed=translateOwnedOutcomeTypeScript(result.typescript,{context:createOwnedOutcomeContext(input(result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(result.rust,typed.rust));const reverse=translateOwnedOutcomeRust(result.rust,{context:createOwnedOutcomeContext({...data,files:[...data.files,{path:'caller.rs',source:result.rust}]}),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(reverse.rust,result.rust));assert.equal(reverse.ownedRustSourceHistory.equation.inverse,result.rust);
});
test('changed complete native sources wrong body domains mutable captures and detached checked IR stay refused',limits,async()=>{
 for(const path of ['src/translation_text_core.rs','src/translation_primitive_option_core.rs','src/translation_primitive_option_callbacks_core.rs','runtime/primitive-option-callback-runtime.mjs','runtime/primitive-option-callback-runtime.d.mts']){const data=input();data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));}
 for(const caller of [source.replace('return 0n;','return false;'),source.replace('item=>trim(item)','async item=>trim(item)'),source.replace('return captured(value,item=>text);','let mutable=text;return captured(value,item=>mutable);'),source.replace('item=>text','(item,extra)=>text')])assert.throws(()=>translateOwnedOutcomeJavaScript(caller,{context:createOwnedOutcomeContext(input(caller)),sourcePath:'caller.mjs'}));const result=translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(input()),sourcePath:'caller.mjs'});await assert.rejects(()=>prepareOwnedOutcomeRuntime(JSON.parse(JSON.stringify(result.program))));
});
test('all complete predecessor source histories retain two ordered phases and exact inverses',limits,()=>{const plan=prepareOwnedPrimitiveOptionCallbackSources();assert.equal(plan.files.length,12);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}});
