// Independent complete receiving and refusal case source. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import * as outcome from '../owned-outcome.mjs';
import * as cancellation from '../owned-cancellation.mjs';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {ownedCancellationReceivingData} from './owned-cancellation-receiving-data.mjs';
import {proposePrimitiveSequenceRootSource} from '../../primitive-sequence-root-source.mjs';
import {primitiveSequenceRuntimeSources} from '../../primitive-sequence-runtime-sources.mjs';
import {prepareOwnedPrimitiveSequenceCallSources} from '../../prepare-owned-primitive-sequence-call-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
// Explicit oracles, independent of catalog/domain/translation rule tables.
const domains=[['bool',false,true],['u8',0n,255n],['i8',-128n,127n],['u16',0n,65535n],['i16',-32768n,32767n],['u32',0n,4294967295n],['i32',-2147483648n,2147483647n],['u64',0n,18446744073709551615n],['i64',-9223372036854775808n,9223372036854775807n],['u128',0n,340282366920938463463374607431768211455n],['i128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n]];
const families={outcome:{api:outcome,data:ownedStateReceivingData},cancellation:{api:cancellation,data:ownedCancellationReceivingData}};
function source(domain){const alias='Rust'+domain[0].toUpperCase()+domain.slice(1),wide=!['bool','u64','i64'].includes(domain),inputType=domain==='bool'?'boolean':`import('./runtime/primitive-operator-runtime.mjs').${alias}`,guard=wide?`values=input(values,"${domain}");`:'';return `import {router_slice_${domain}_len as length,router_slice_${domain}_is_empty as empty,router_slice_${domain}_get as at} from './runtime/primitive-sequence-runtime.mjs';
${wide?"import {primitiveSliceInput as input} from './runtime/primitive-operator-runtime.mjs';":''}
/** @param {readonly (${inputType})[]} values */
export function count(values){${guard}return length(values);}
/** @param {readonly (${inputType})[]} values */
export function vacant(values){${guard}return empty(values);}
/** @param {readonly (${inputType})[]} values
 * @param {Parameters<typeof at>[1]} index */
export function element(values,index){${guard}return at(values,index);}
`;}
export function primitiveSequenceReceivingData(family,text,path='caller.mjs'){
 const {api,data}=families[family],result=data([{path,source:text}]);result.primitiveOperators=true;result.files=result.files.filter(row=>!row.path.startsWith('runtime/')).concat(api.ownedOutcomeRuntimeSources());const root=result.files.find(row=>row.path==='src/lib.rs'),proposal=proposePrimitiveSequenceRootSource(root.source),files=new Map(result.files.map(row=>[row.path,row]));for(const row of proposal.files){const next={path:row.path,source:row.after??row.source},previous=files.get(row.path);if(previous&&row.path!=='src/lib.rs'&&previous.source!==next.source)throw new TypeError('Independent receiving source conflict');files.set(row.path,next);}result.files=[...files.values()];return result;
}
async function targets(t,data,result){const directory=mkdtempSync(join(tmpdir(),'router-primitive-call-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,text)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);};for(const row of data.files.filter(row=>/\.(?:mjs|mts|ts)$/u.test(row.path)))write(row.path,row.source);write('typed.mts',result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const row of data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+row.path,row.source);return [await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href)];}
for(const family of Object.keys(families))for(const [domain,minimum,maximum]of domains)test(family+' '+domain+' complete three-operation callers retain scalar domains, copied options and receiving JS/TS/meta',limits,async t=>{
 const api=families[family].api,text=source(domain),data=primitiveSequenceReceivingData(family,text),context=api.createOwnedOutcomeContext(data),result=api.translateOwnedOutcomeJavaScript(text,{context,sourcePath:'caller.mjs'}),token=await api.prepareOwnedOutcomeRuntime(result.program),modules=await targets(t,data,result);
 const inputs=[Object.freeze([]),Object.freeze([minimum]),Object.freeze([maximum,minimum]),Object.freeze(Array(5001).fill(minimum))],none={$:'None'};
 for(const input of inputs){const calls=[['count',[input]],['vacant',[input]],['element',[input,0n]],['element',[input,BigInt(input.length)]],['element',[input,18446744073709551615n]]],expected=[BigInt(input.length),input.length===0,input.length?{$:'Some',field0:input[0]}:none,none,none];for(const module of modules)for(let index=0;index<calls.length;index++)assert.deepEqual(module[calls[index][0]](...calls[index][1]),expected[index]);for(let index=0;index<calls.length;index++)assert.deepEqual(api.evaluateOwnedOutcome(result.program,...calls[index],token),expected[index]);assert.deepEqual(api.evaluateOwnedOutcomeBatch(result.program,calls,token),expected);}
 for(const module of modules){assert.throws(()=>module.count([minimum]));for(const index of [-1n,18446744073709551616n,0,NaN])assert.throws(()=>module.element(Object.freeze([minimum]),index));}
 const reissued=api.readOwnedOutcomeMeta(result.meta,{context});assert.equal(api.emitOwnedOutcomeRust(reissued),result.rust);const concrete=api.translateOwnedOutcomeConcreteSyntaxMeta(result.concreteSyntax.meta,{context,sourcePath:'caller.mjs'});assert.equal(concrete.rust,result.rust);
 const typed=api.translateOwnedOutcomeTypeScript(result.typescript,{context:api.createOwnedOutcomeContext(primitiveSequenceReceivingData(family,result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(typed.rust,result.rust));assert.match(result.rust,/crate::translation_primitive_sequences_core::/u);assert.equal(result.runtimeParity,false);
});
for(const family of Object.keys(families))test(family+' original source joins refuse missing root/runtime/declarations, changed wrappers, false profile, wrong domains and unrooted receivers',limits,()=>{
 const api=families[family].api,text=source('u8'),translate=data=>api.translateOwnedOutcomeJavaScript(data.files.find(row=>row.path==='caller.mjs').source,{context:api.createOwnedOutcomeContext(data),sourcePath:'caller.mjs'});
 for(const path of ['src/translation_primitive_sequences_core.rs','runtime/primitive-sequence-runtime.mjs','runtime/primitive-sequence-runtime.d.mts']){const data=primitiveSequenceReceivingData(family,text);data.files=data.files.filter(row=>row.path!==path);assert.throws(()=>translate(data));}
 for(const path of ['src/translation_primitive_sequences_core.rs','runtime/primitive-sequence-runtime.mjs','runtime/primitive-sequence-runtime.d.mts']){const data=primitiveSequenceReceivingData(family,text);data.files.find(row=>row.path===path).source+='\n// independently changed actual source\n';assert.throws(()=>translate(data));}
 const inactive=primitiveSequenceReceivingData(family,text);inactive.primitiveOperators=false;assert.throws(()=>translate(inactive));const root=primitiveSequenceReceivingData(family,text);root.files.find(row=>row.path==='src/lib.rs').source=root.files.find(row=>row.path==='src/lib.rs').source.replace('pub mod translation_primitive_sequences_core;','mod translation_primitive_sequences_core;');assert.throws(()=>translate(root));
 for(const changed of [text.replace('at(values,index)','at(values,true)'),text.replace('at(values,index)','at([],index)'),text.replace('length(values)','length(...values)'),text.replace('length(values)','length?.(values)'),text.replace('values=input(values,"u8");','')])assert.throws(()=>translate(primitiveSequenceReceivingData(family,changed)));
});
test('mirrored and nested source roots retain every current runtime/declaration dependency once',limits,()=>{
 for(const [runtimeRoot,declarationRoot]of [['runtime','runtime'],['runtime','runtime/types'],['app/runtime','typed/runtime']]){const rows=primitiveSequenceRuntimeSources(runtimeRoot,declarationRoot);assert.equal(new Set(rows.map(row=>row.path)).size,rows.length);for(const prefix of new Set([runtimeRoot,declarationRoot]))for(const name of ['primitive-sequence-runtime.mjs','primitive-sequence-runtime.d.mts','primitive-operator-runtime.mjs','primitive-operator-runtime.d.mts'])assert.ok(rows.some(row=>row.path===prefix+'/'+name));}
});
test('seventeen full source substitutions retain every original/inverse and both rule sequences',limits,()=>{const plan=prepareOwnedPrimitiveSequenceCallSources();assert.equal(plan.files.length,17);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
