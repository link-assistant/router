// Independent reverse total borrowed text SOURCE. Every new case remains UNRUN.
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
const root=fileURLToPath(new URL('../../../../',import.meta.url)),limits={timeout:60000},vectors=JSON.parse(readFileSync(new URL('../../test/fixtures/text-option-fallback-vectors.json',import.meta.url),'utf8')).vectors;
const names=['strip_prefix_or_self','strip_prefix_or_empty','strip_suffix_or_self','strip_suffix_or_empty','split_once_left_or_self','split_once_left_or_empty','split_once_right_or_self','split_once_right_or_empty','rsplit_once_left_or_self','rsplit_once_left_or_empty','rsplit_once_right_or_self','rsplit_once_right_or_empty'];
const source='import {'+names.map(name=>'router_text_'+name+' as operation_'+name).join(',')+"} from './runtime/text-runtime.mjs';\n"+names.map(name=>'/** @param {string} value @param {string} pattern */\nexport function '+name+'(value,pattern){return operation_'+name+'(value,pattern);}\n').join('');
function checked(text=source,path='caller.mjs'){
 const data=textSha256ReceivingData(text,path),context=createOwnedOutcomeContext(data),result=path.endsWith('.mts')?translateOwnedOutcomeTypeScript(text,{context,sourcePath:path}):translateOwnedOutcomeJavaScript(text,{context,sourcePath:path});return {data,context,result};
}
test('all twelve JS and strict TS borrowed fallbacks agree with independent vectors and checked interpretation',limits,async t=>{
 const row=checked(),directory=mkdtempSync(join(tmpdir(),'router-text-fallbacks-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,text)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);};for(const file of row.data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of row.data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);for(const path of ['caller.mjs','out/typed.mjs']){const api=await import(pathToFileURL(join(directory,path)).href);for(const vector of vectors)assert.equal(api[vector.operation](...vector.arguments),vector.expected);}
 const runtime=await prepareOwnedOutcomeRuntime(row.result.program);for(const vector of vectors)assert.equal(evaluateOwnedOutcome(row.result.program,vector.operation,vector.arguments,runtime),vector.expected);assert.equal(readOwnedOutcomeMeta(row.result.meta,{context:row.context}).length,12);
});
test('typed and Rust inverse projections recheck actual full sources and retain native syntax and source inverses',limits,()=>{
 const row=checked(),typed=checked(row.result.typescript,'caller.mts');assert.ok(sameRustSourceSyntax(typed.result.rust,row.result.rust));const data={...row.data,files:[...row.data.files,{path:'caller.rs',source:row.result.rust}]},inverse=translateOwnedOutcomeRust(row.result.rust,{context:createOwnedOutcomeContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,row.result.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);
});
test('changed native runtime declarations bad operand domains and detached meta remain refused',limits,async()=>{
 for(const path of ['src/translation_text_core.rs','runtime/text-runtime.mjs','runtime/text-runtime.d.mts']){const data=textSha256ReceivingData(source);data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));}assert.throws(()=>checked(source.replace('operation_strip_prefix_or_self(value,pattern)','operation_strip_prefix_or_self(value,4n)')));await assert.rejects(()=>prepareOwnedOutcomeRuntime(JSON.parse(JSON.stringify(checked().result.program))));
});
