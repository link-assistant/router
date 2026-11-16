// Independent complete reverse family SOURCE; all cases remain UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {textSha256ReceivingData} from './text-sha256-receiving-data.mjs';
import {createOwnedOutcomeContext,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,readOwnedOutcomeMeta} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),limits={timeout:60000},vectors=JSON.parse(readFileSync(new URL('../../test/fixtures/text-ascii-vectors.json',import.meta.url),'utf8')).vectors;
const unary=['to_ascii_lowercase','to_ascii_uppercase','is_ascii','trim_ascii','trim_ascii_start','trim_ascii_end'],binary=['eq_ignore_ascii_case','split_once_left','split_once_right','rsplit_once_left','rsplit_once_right'];
const source='import {'+[...unary,...binary].map(name=>'router_text_'+name+' as operation_'+name).join(',')+"} from './runtime/text-runtime.mjs';\n"+unary.map(name=>'/** @param {string} value */\nexport function '+name+'(value){return operation_'+name+'(value);}\n').join('')+binary.map(name=>'/** @param {string} value @param {string} pattern */\nexport function '+name+'(value,pattern){return operation_'+name+'(value,pattern);}\n').join('');
function checked(text=source,path='caller.mjs'){
 const data=textSha256ReceivingData(text,path),context=createOwnedOutcomeContext(data),result=path.endsWith('.mts')?translateOwnedOutcomeTypeScript(text,{context,sourcePath:path}):translateOwnedOutcomeJavaScript(text,{context,sourcePath:path});return {data,context,result};
}
test('all eleven JS and strict TypeScript functions agree with independent vectors and the checked interpreter',limits,async t=>{
 const row=checked(),directory=mkdtempSync(join(tmpdir(),'router-text-ascii-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,text)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);};for(const file of row.data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of row.data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);for(const path of ['caller.mjs','out/typed.mjs']){const api=await import(pathToFileURL(join(directory,path)).href);for(const vector of vectors)assert.deepEqual(api[vector.operation](...vector.arguments),vector.expected);}
 const runtime=await prepareOwnedOutcomeRuntime(row.result.program);for(const vector of vectors)assert.deepEqual(evaluateOwnedOutcome(row.result.program,vector.operation,vector.arguments,runtime),vector.expected);assert.equal(readOwnedOutcomeMeta(row.result.meta,{context:row.context}).length,11);
});
test('the typed and Rust inverses recheck the complete actual sources and preserve native syntax',limits,()=>{
 const row=checked(),typed=checked(row.result.typescript,'caller.mts');assert.ok(sameRustSourceSyntax(typed.result.rust,row.result.rust));const data={...row.data,files:[...row.data.files,{path:'caller.rs',source:row.result.rust}]},inverse=translateOwnedOutcomeRust(row.result.rust,{context:createOwnedOutcomeContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,row.result.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);
});
test('changed originals wrong domains shadowed callbacks and detached programs keep original refusals',limits,async()=>{
 for(const path of ['src/translation_text_core.rs','runtime/text-runtime.mjs','runtime/text-runtime.d.mts']){const data=textSha256ReceivingData(source);data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));}for(const text of [source.replace('operation_is_ascii(value)','operation_is_ascii(4n)'),source.replace('return operation_is_ascii(value);','const operation_is_ascii=()=>true;return operation_is_ascii(value);')])assert.throws(()=>checked(text));await assert.rejects(()=>prepareOwnedOutcomeRuntime(JSON.parse(JSON.stringify(checked().result.program))));
});
