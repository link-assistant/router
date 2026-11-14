// Finite engine-format observation. These body copies are never executed and
// issue no compiler proof; genuine project behavior is checked independently.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {translateProject} from '../../tools/translation/project.mjs';
const receipt=JSON.parse(gunzipSync(readFileSync('ci-logs/issue-784-restart-2/project-facade-source-producer.json.gz'),{maxOutputLength:8388608}));
const selection=receipt.files[0].selection;
const source='const lowerDeclaration=(entry,name)=>'+selection.lowerFunction+';export const lower=lowerDeclaration();export const facade={checkedSource:'+selection.checkedSourceFunction+'};';
const original=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const project=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=> 'pub fn root(x:u8)->u8{x+1}'});
const candidate=project.executableDeclarations.find(row=>row.name==='root');
const observe=fn=>({name:fn.name,length:fn.length,prototype:Object.hasOwn(fn,'prototype'),sourceSha256:createHash('sha256').update(Function.prototype.toString.call(fn)).digest('hex')});
for(const key of ['lower','checkedSource']){
 const before=observe(key==='lower'?original.lower:original.facade.checkedSource),after=observe(candidate[key]);
 console.log(JSON.stringify({engine:process.versions,before,after,key}));assert.deepEqual(after,before);
}
