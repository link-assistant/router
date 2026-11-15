// Draft only: retain every original public function while keeping private
// regeneration allocation work. Installation still needs source equations.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';

const path='tools/translation/js-to-rust/native-typescript.mjs';
const raw=gunzipSync(readFileSync('tools/translation/source-profiles/native-regeneration-batch/original.mjs.gz'),{maxOutputLength:1048576});
const hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(hash(raw),'46ec636ff5c2ffa3ec3dfd8dfbc7b73f7a01b171286cf6d5c78b3320726d8208');
const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
const original=raw.toString(),before=readFileSync(path,'utf8');
const parse=source=>{
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.deepEqual(file.parseDiagnostics,[]);return file;
};
const functions=source=>{
 const file=parse(source),rows=new Map();
 for(const node of file.statements)if(ts.isFunctionDeclaration(node)){
  assert.ok(!rows.has(node.name.text));
  rows.set(node.name.text,{start:node.getStart(file),end:node.end,text:node.getText(file),
   exported:node.modifiers?.some(row=>row.kind===ts.SyntaxKind.ExportKeyword)??false});
 }
 return rows;
};
const old=functions(original),current=functions(before),edits=[];
const once=(source,from,to)=>{
 assert.ok(source.includes(from));assert.equal(source.indexOf(from),source.lastIndexOf(from));
 return source.replace(from,()=>to);
};
for(const name of ['emitNativeTypeScript','compileNativeTypeScript']){
 const row=current.get(name);assert.ok(row&&old.get(name));
 edits.push({...row,replacement:old.get(name).text});
}
const builder=current.get('buildNativeTypeScriptForRegeneration');assert.ok(builder);
let privateBuild=once(builder.text,'const ts = loadTypeScript(sourceRoot);',
 'const ts = ownershipCompilerRuntimeLoadDirect(sourceRoot);');
privateBuild=once(privateBuild,'const output = emitNativeTypeScript(ts, reparsed);',
 'const output = emitRegeneratedNativeTypeScript(ts, reparsed);');
edits.push({...builder,replacement:privateBuild});
let after=before;
for(const edit of edits.sort((a,b)=>b.start-a.start)){
 assert.equal(after.slice(edit.start,edit.end),edit.text);
 after=after.slice(0,edit.start)+edit.replacement+after.slice(edit.end);
}
after=once(after,"import {ownershipCompilerRuntimeLoad} from './vendor/module-syntax.mjs';",
 "import {ownershipCompilerRuntimeLoad as ownershipCompilerRuntimeLoadDirect} from './vendor/module-syntax.mjs';");
const emitter=once(current.get('emitNativeTypeScript').text,
 'export function emitNativeTypeScript(', 'function emitRegeneratedNativeTypeScript(');
after+='\n// Release the previous private inference phase before standalone public work.\n'+
 'function ownershipCompilerRuntimeLoad(sourceRoot) {\n'+
 '  regenerationInference.release();\n'+
 '  return ownershipCompilerRuntimeLoadDirect(sourceRoot);\n'+
 '}\n\n'+emitter+'\n';
const result=functions(after);
assert.deepEqual([...result].filter(([,r])=>r.exported).map(([name])=>name),
 [...old].filter(([,r])=>r.exported).map(([name])=>name));
for(const [name,row]of old)if(row.exported){
 const expected=name==='regenerateNativeTypeScript'
  ?once(row.text,'const artifacts = buildNativeTypeScript(sourceRoot);',
   'const artifacts = buildNativeTypeScriptForRegeneration(sourceRoot);'):row.text;
 assert.equal(result.get(name).text,expected,name);
}
assert.ok(after.split('\n').length<1000);
assert.equal(readFileSync(path,'utf8'),before);
const target='experiments/issue-784/native-typescript-public-contract.mjs.txt';
writeFileSync(target,after,{flag:'wx'});
writeFileSync(target+'.json',JSON.stringify({source:path,beforeSha256:hash(before),afterSha256:hash(after),
 compiler:ts.version,originalPublicFunctionsPreserved:true,installed:false,
 fullGatePassed:false,runtimeParity:false,rustExecuted:false})+'\n',{flag:'wx'});
console.log(JSON.stringify({target,bytes:Buffer.byteLength(after),publicFunctionsPreserved:true,
 installed:false,deadlineQualified:false,fullGatePassed:false}));
