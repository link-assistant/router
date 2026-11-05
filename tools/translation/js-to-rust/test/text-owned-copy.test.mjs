// Independent reverse owned text copy SOURCE. Every new case remains UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {textSha256ReceivingData} from './text-sha256-receiving-data.mjs';
import {createOwnedOutcomeContext,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),limits={timeout:60000},vectors=['','ASCII','π😀é','a\0b','line\r\nend'];
const source="import {router_text_to_owned as copy} from './runtime/text-runtime.mjs';\n/** @param {string} value */\nexport function copied(value){return copy(value);}\n";
function checked(text=source,path='caller.mjs'){const data=textSha256ReceivingData(text,path),context=createOwnedOutcomeContext(data),result=path.endsWith('.mts')?translateOwnedOutcomeTypeScript(text,{context,sourcePath:path}):translateOwnedOutcomeJavaScript(text,{context,sourcePath:path});return {data,context,result};}
test('checked reverse copies agree with original JS strict TS and independent value cases',limits,async t=>{
 const row=checked(),directory=mkdtempSync(join(tmpdir(),'router-owned-copy-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,text)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);};for(const file of row.data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of row.data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);for(const path of ['caller.mjs','out/typed.mjs']){const api=await import(pathToFileURL(join(directory,path)).href);for(const value of vectors)assert.equal(api.copied(value),value);}const runtime=await prepareOwnedOutcomeRuntime(row.result.program);for(const value of vectors)assert.equal(evaluateOwnedOutcome(row.result.program,'copied',[value],runtime),value);
});
test('typed Rust inverse and source refusal preserve the complete original checked copy contract',limits,async()=>{
 const row=checked(),typed=checked(row.result.typescript,'caller.mts');assert.ok(sameRustSourceSyntax(row.result.rust,typed.result.rust));const data={...row.data,files:[...row.data.files,{path:'caller.rs',source:row.result.rust}]},inverse=translateOwnedOutcomeRust(row.result.rust,{context:createOwnedOutcomeContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);assert.throws(()=>checked(source.replace('copy(value)','copy(4n)')));for(const path of ['src/translation_text_core.rs','runtime/text-runtime.mjs','runtime/text-runtime.d.mts']){const changed=textSha256ReceivingData(source);changed.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(changed),sourcePath:'caller.mjs'}));}await assert.rejects(()=>prepareOwnedOutcomeRuntime(JSON.parse(JSON.stringify(row.result.program))));
});
