// Independent actual caller source; no translator or tests run while drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../../owned-outcome-native-source.mjs';
import {SSE_NATIVE_SOURCE,SSE_ORIGINAL_FRAMER_SOURCE} from '../../sse-native-source.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,evaluateOwnedOutcomeBatch} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareOwnedSseSources} from '../../prepare-owned-sse-sources.mjs';
import {prepareOwnedIntegerSources} from '../../prepare-owned-integer-sources.mjs';
import {prepareSseCore} from '../../prepare-sse-core.mjs';
import {prepareIntegerCore} from '../../prepare-integer-core.mjs';
import {json_macro_object as object,json_macro_string as text,json_macro_array as array} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url)),source="import {router_sse_push_base64 as push} from './runtime/sse-runtime.mjs';\n/** @param {string} pending @param {string} chunk */\nexport function framed(pending,chunk){return push(pending,chunk);}\n";
function input(caller=source,path='caller.mjs'){const data=ownedStateReceivingData([{path,source:caller}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());data.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_carriers_core;\nmod sse;\npub mod translation_stream_core;\n';data.files.push({path:'src/translation_carriers_core.rs',source:OWNED_OUTCOME_NATIVE_SOURCE},{path:'src/sse.rs',source:SSE_ORIGINAL_FRAMER_SOURCE},{path:'src/translation_stream_core.rs',source:SSE_NATIVE_SOURCE});return data;}
function draft(){const data=input(),context=createOwnedOutcomeContext(data),result=translateOwnedOutcomeJavaScript(source,{context,sourcePath:'caller.mjs'});return {data,context,result};}
test('actual SSE caller strict TS and both interpreters retain pending bytes and original errors',limits,async t=>{
 const row=draft(),directory=mkdtempSync(join(tmpdir(),'router-owned-sse-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),value);};for(const file of row.data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of row.data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 const modules=[await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href)],token=await prepareOwnedOutcomeRuntime(row.result.program),cases=[['','ZGF0YTogYQoK',{$:'Ok',field0:object([['pending',text('')],['blocks',array([text('data: a')])]])}],['5Lg=','lgoK',{$:'Ok',field0:object([['pending',text('')],['blocks',array([text('世')])]])}],['','bad',{$:'Err',field0:'invalid SSE chunk base64'}]];for(const module of modules)for(const [pending,chunk,expected]of cases)assert.deepEqual(module.framed(pending,chunk),expected);assert.deepEqual(cases.map(([pending,chunk])=>evaluateOwnedOutcome(row.result.program,'framed',[pending,chunk],token)),cases.map(row=>row[2]));assert.deepEqual(evaluateOwnedOutcomeBatch(row.result.program,cases.map(([pending,chunk])=>['framed',[pending,chunk]]),token),cases.map(row=>row[2]));
});
test('complete Rust and typed inverses freshly check the original wrapper framer and dependency source joins',limits,()=>{
 const row=draft(),typed=translateOwnedOutcomeTypeScript(row.result.typescript,{context:createOwnedOutcomeContext(input(row.result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(typed.rust,row.result.rust));const data={...row.data,files:[...row.data.files,{path:'caller.rs',source:row.result.rust}]},inverse=translateOwnedOutcomeRust(row.result.rust,{context:createOwnedOutcomeContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,row.result.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);
 for(const path of ['src/sse.rs','src/translation_stream_core.rs','runtime/sse-runtime.mjs','runtime/sse-runtime.d.mts']){const altered=input();altered.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(altered),sourcePath:'caller.mjs'}));}
});
test('all eight complete code and adjacent native root histories retain two full inverse sequences',limits,()=>{const current=prepareOwnedSseSources();assert.equal(current.files.length,8);for(const plan of [current,prepareOwnedIntegerSources(),prepareSseCore(),prepareIntegerCore()])for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}});
