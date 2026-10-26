// Independent complete inverse SOURCE; all cases are unrun.
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
const root=fileURLToPath(new URL('../../../../',import.meta.url)),limits={timeout:60000};
const source="import {router_text_sha256_base64_url_no_pad as hash} from './runtime/text-runtime.mjs';\n/** @param {string} value */\nexport function challenge(value){return hash(value);}\n";
const vectors=JSON.parse(readFileSync(new URL('../../test/fixtures/text-sha256-vectors.json',import.meta.url),'utf8')).vectors;
function checked(text=source,path='caller.mjs'){const data=textSha256ReceivingData(text,path),context=createOwnedOutcomeContext(data),result=path.endsWith('.mts')?translateOwnedOutcomeTypeScript(text,{context,sourcePath:path}):translateOwnedOutcomeJavaScript(text,{context,sourcePath:path});return {data,context,result};}
test('actual JavaScript strict TypeScript checked meta and the independent interpreter agree on fixed vectors',limits,async t=>{
 const row=checked(),directory=mkdtempSync(join(tmpdir(),'router-text-sha256-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const write=(path,text)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);};for(const file of row.data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of row.data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 for(const path of ['caller.mjs','out/typed.mjs']){const api=await import(pathToFileURL(join(directory,path)).href);for(const vector of vectors)assert.equal(api.challenge(vector.input),vector.expected);}
 const runtime=await prepareOwnedOutcomeRuntime(row.result.program);for(const vector of vectors)assert.equal(evaluateOwnedOutcome(row.result.program,'challenge',[vector.input],runtime),vector.expected);assert.equal(readOwnedOutcomeMeta(row.result.meta,{context:row.context}).length,1);
});
test('both typed inverse and native inverse recheck complete sources without manual generated bodies',limits,()=>{
 const row=checked(),typed=checked(row.result.typescript,'caller.mts');assert.ok(sameRustSourceSyntax(typed.result.rust,row.result.rust));
 const data={...row.data,files:[...row.data.files,{path:'caller.rs',source:row.result.rust}]},inverse=translateOwnedOutcomeRust(row.result.rust,{context:createOwnedOutcomeContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,row.result.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);
});
test('changed native runtime declaration wrong domains shadows and detached checked programs cannot bypass original issuers',limits,async()=>{
 for(const path of ['src/translation_text_core.rs','runtime/text-runtime.mjs','runtime/text-runtime.d.mts']){const data=textSha256ReceivingData(source);data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));}
 for(const text of [source.replace('hash(value)','hash(4n)'),source.replace('return hash(value);','const hash=()=>"fake";return hash(value);'),source.replace('hash(value)','hash({})')])assert.throws(()=>checked(text));
 await assert.rejects(()=>prepareOwnedOutcomeRuntime(JSON.parse(JSON.stringify(checked().result.program))));
});
