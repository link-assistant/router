// Install only an explicitly selected, complete receiving source draft.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';

const [input,selection,output]=process.argv.slice(2);
assert.equal(process.argv.length,5);
assert.match(input,/^ci-logs\/issue-784-restart-2\/[a-z0-9-]+\.json(?:\.gz)?$/u);
assert.match(output,/^ci-logs\/issue-784-restart-2\/[a-z0-9-]+\.json\.gz$/u);
const bytes=readFileSync(input),draft=JSON.parse(input.endsWith('.gz')?gunzipSync(bytes):bytes);
const records=draft.records??[draft],indices=selection.split(',').map(Number);
assert.ok(indices.length&&indices.every(index=>Number.isSafeInteger(index)&&index>=0&&index<records.length));
assert.equal(new Set(indices).size,indices.length);
const selected=indices.map(index=>records[index]),require=createRequire(resolve('js/package.json')),ts=require('typescript');
assert.equal(ts.version,'5.9.3');
for(const row of selected){
 assert.equal(readFileSync(row.path,'utf8'),row.before);
 for(const source of [row.before,row.middle??row.after,row.after]){
  const file=ts.createSourceFile(row.path,source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS);
  assert.deepEqual(file.parseDiagnostics,[]);
 }
}
const equations=transportConcreteSourcePhases(selected.map(row=>({before:row.before,middle:row.middle??row.after,after:row.after,language:'JavaScript'})));
for(const [index,row]of selected.entries()){
 assert.equal(equations[index].inverse,row.before);assert.equal(equations[index].after,row.after);
 assert.equal(readFileSync(row.path,'utf8'),row.before);
}
const receipt={schema:'reviewed-receiving-source-installation-v1',input,indices,records:selected,equations,
 typescriptVersion:ts.version,completeNativeSyntaxAndConcreteInverse:true,sourceInstalled:true,
 receivingTestsExecuted:false,runtimeParity:false,rustExecuted:false};
const raw=Buffer.from(JSON.stringify(receipt)),packed=gzipSync(raw);
writeFileSync(output,packed,{flag:'wx'});assert.ok(gunzipSync(readFileSync(output)).equals(raw));
for(const row of selected)writeFileSync(row.path,row.after);
console.log(JSON.stringify({output,installed:selected.map(row=>row.path),bytes:packed.length,
 sha256:createHash('sha256').update(packed).digest('hex'),typescriptVersion:ts.version}));
