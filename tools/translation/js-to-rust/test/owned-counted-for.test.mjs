// Independent counted-loop oracle SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,evaluateOwnedOutcomeBatch} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {prepareOwnedCountedForSources} from '../../prepare-owned-counted-for-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const source=`import {router_state_json_append as append} from './runtime/json-state-runtime.mjs';
import {json_macro_array as array,json_macro_null as nil,json_macro_u64 as unsigned,json_macro_i64 as signed} from './runtime/json-macro-runtime.mjs';
/** @param {Parameters<typeof unsigned>[0]} count */
export function counted(count){let result=array([]);for(let index=0n;index<count;index++){if(index===1n){continue;}result=append(result,nil());if(index>=3n){break;}}return result;}
/** @param {Parameters<typeof unsigned>[0]} lower @param {Parameters<typeof unsigned>[0]} upper */
export function bounded(lower,upper){let result=array([]);for(let index=lower;index<upper;index+=1n){result=append(result,nil());}return result;}
/** @param {Parameters<typeof signed>[0]} lower @param {Parameters<typeof signed>[0]} upper */
export function signedBounds(lower,upper){let result=array([]);for(let index=lower;index<upper;++index){result=append(result,nil());}return result;}
/** @param {Parameters<typeof unsigned>[0]} count */
export function assignment(count){let result=array([]);for(let index=0n;index<count;index=index+1n){result=append(result,nil());}return result;}
/** @param {Parameters<typeof signed>[0]} upper */
export function negativeStart(upper){let result=array([]);for(let index=-2n;index<upper;index++){result=append(result,nil());}return result;}
/** @param {Parameters<typeof unsigned>[0]} count */
export function nested(count){let result=array([]);for(let outer=0n;outer<count;outer++){for(let inner=0n;inner<count;inner++){if(inner===0n){continue;}result=append(result,nil());break;}if(outer===0n){continue;}break;}return result;}
/** @param {Parameters<typeof unsigned>[0]} count */
export function early(count){for(let index=0n;index<count;index++){return nil();}return array([]);}
`;
function input(caller=source,path='caller.mjs'){const data=ownedStateReceivingData([{path,source:caller}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());return data;}
const array=count=>({$:'Array',field0:Array.from({length:count},()=>({$:'Null'}))});
const cases=[['counted',[0n],array(0)],['counted',[1n],array(1)],['counted',[2n],array(1)],['counted',[3n],array(2)],['counted',[5n],array(3)],['bounded',[2n,2n],array(0)],['bounded',[3n,2n],array(0)],['bounded',[18446744073709551614n,18446744073709551615n],array(1)],['signedBounds',[-9223372036854775808n,-9223372036854775807n],array(1)],['signedBounds',[9223372036854775806n,9223372036854775807n],array(1)],['signedBounds',[1n,-1n],array(0)],['negativeStart',[1n],array(3)],['assignment',[3n],array(3)],['nested',[0n],array(0)],['nested',[3n],array(2)],['early',[0n],array(0)],['early',[1n],{$:'Null'}]];
test('actual JS strict TS and both interpreters preserve signed unsigned empty maximum and loop exit boundaries',limits,async t=>{const data=input(),result=translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}),directory=mkdtempSync(join(tmpdir(),'router-counted-for-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),value);};for(const file of data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);for(const path of ['caller.mjs','out/typed.mjs']){const api=await import(pathToFileURL(join(directory,path)).href);for(const [name,args,expected]of cases)assert.deepEqual(api[name](...args),expected);}const token=await prepareOwnedOutcomeRuntime(result.program);for(const [name,args,expected]of cases)assert.deepEqual(evaluateOwnedOutcome(result.program,name,args,token),expected);assert.deepEqual(evaluateOwnedOutcomeBatch(result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));assert.match(result.rust,/for index in 0_u64\.\.count/u);});
test('typed source and the complete canonical Rust inverse retain actual range bodies',limits,()=>{const data=input(),result=translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}),typed=translateOwnedOutcomeTypeScript(result.typescript,{context:createOwnedOutcomeContext(input(result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(result.rust,typed.rust));const inverse=translateOwnedOutcomeRust(result.rust,{context:createOwnedOutcomeContext({...data,files:[...data.files,{path:'caller.rs',source:result.rust}]}),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,inverse.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,result.rust);});
test('changing bounds step type symbols mutable state or body induction cannot acquire a range substitution',limits,()=>{for(const caller of [source.replace('index<count;index++','index<=count;index++'),source.replace('index<count;index++','index<count;index--'),source.replace('index<count;index++','index<count;index+=2n'),source.replace('index<count;index++','index<count;index+=1'),source.replace('for(let index=0n;index<count;index++)','let changing=count;for(let index=0n;index<changing;index++)'),source.replace('if(index===1n){continue;}','index=0n;if(index===1n){continue;}'),source.replace('index<count;index++','index<unsigned(count);index++'),source.replace('index<upper;++index','index<upper;upper++')])assert.throws(()=>translateOwnedOutcomeJavaScript(caller,{context:createOwnedOutcomeContext(input(caller)),sourcePath:'caller.mjs'}));});
test('complete counted-loop source integration keeps both rule stages and every source inverse',limits,()=>{const plan=prepareOwnedCountedForSources();for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
