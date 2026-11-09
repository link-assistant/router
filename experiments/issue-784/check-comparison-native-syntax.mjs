// Current-engine syntax only: no proposed module evaluation or import resolution.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
const label=process.argv[2];assert.match(label??'',/^[a-z0-9-]{1,70}$/u);
const output='ci-logs/issue-784-restart-2/'+label+'.json.gz';assert.ok(!existsSync(output));
function check(source){
 if(process.versions.bun){try{new Bun.Transpiler({loader:'js',target:'bun'}).scan(source);return {passed:true};}catch(error){return {passed:false,error:String(error)};}}
 const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8',maxBuffer:1048576});
 return {passed:result.status===0,status:result.status,signal:result.signal,stdout:result.stdout,stderr:result.stderr};
}
const invalid='let duplicate; let duplicate;',inert='import "./unavailable-never-resolved.mjs"; throw Error("must not execute");';
const controls=[{source:invalid,expected:false,result:check(invalid)},{source:inert,expected:true,result:check(inert)}];
for(const row of controls)assert.equal(row.result.passed,row.expected);
const paths=['tools/translation/js-to-rust/vendor/module-syntax.mjs','tools/translation/owned-runtime-node-current-source-data.mjs','tools/translation/prepare-owned-runtime-import-current.mjs','tools/translation/test/runtime-import-phased-data.test.mjs'];
const rows=paths.map(path=>{const source=readFileSync(path,'utf8'),result=check(source);assert.equal(result.passed,true,path);return {path,source,result};});
const raw=Buffer.from(JSON.stringify({engine:process.versions,controls,rows,modulesEvaluated:false,dependenciesResolved:false}));
writeFileSync(output,gzipSync(raw),{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(output)),raw);
console.log(JSON.stringify({output,paths,passed:true}));
