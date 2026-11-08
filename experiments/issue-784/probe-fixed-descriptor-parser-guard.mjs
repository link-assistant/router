// Finite full-module diagnostic. This installs no production source and does
// not qualify an original receiving test, a deadline, or executable parity.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';

const output=process.argv[2];
assert.equal(process.argv.length,3);
assert.match(output,/^ci-logs\/issue-784-restart-2\/[a-z0-9-]+\.json\.gz$/u);
const path='tools/translation/original-json-intrinsics.mjs';
const before=readFileSync(path,'utf8'),ts=ownershipCompiler();
assert.equal(ts.version,'5.9.3');
const file=ts.createSourceFile(path,before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
assert.equal(file.parseDiagnostics.length,0);
const select=name=>{
 const nodes=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
 assert.equal(nodes.length,1);return nodes[0];
};
const original=select('expectedSamePrototype'),kind=select('kindBatchedExpectedSamePrototype');
const legacyName='diagnosticOriginalExpectedSamePrototype';
const edits=[{span:[original.name.getStart(file),original.name.end],
 expected:original.name.text,replacement:legacyName}];
function visit(node){
 if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='expectedSamePrototype')
  edits.push({span:[node.expression.getStart(file),node.expression.end],
   expected:node.expression.text,replacement:legacyName});
 ts.forEachChild(node,visit);
}
visit(kind);assert.equal(edits.length,4);
let after=before;
for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){
 assert.equal(after.slice(...row.span),row.expected);
 after=after.slice(0,row.span[0])+row.replacement+after.slice(row.span[1]);
}
const append='\nfunction expectedSamePrototype(owner,entries,rows){return kindBatchedExpectedSamePrototype(owner,entries,rows);}\n';
after+=append;
const fresh=ts.createSourceFile(path,after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
assert.equal(fresh.parseDiagnostics.length,0);
let inverse=after.slice(0,-append.length),delta=0;
const inverseEdits=[...edits].sort((a,b)=>a.span[0]-b.span[0]).map(row=>{
 const start=row.span[0]+delta;delta+=row.replacement.length-row.expected.length;
 return {span:[start,start+row.replacement.length],expected:row.replacement,replacement:row.expected};
});
for(const row of [...inverseEdits].sort((a,b)=>b.span[0]-a.span[0])){
 assert.equal(inverse.slice(...row.span),row.expected);
 inverse=inverse.slice(0,row.span[0])+row.replacement+inverse.slice(row.span[1]);
}
assert.equal(inverse,before);
const modules={};
for(const [side,source] of Object.entries({before,after}))
 modules[side]=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const names=['originalPrivateParserNumericCommonIntrinsicsUnchanged',
 'originalBatchedJsonIntrinsicsUnchanged','originalBatchedNamespaceTraversalIntrinsicsUnchanged',
 'originalBatchedDataFreezeIntrinsicsUnchanged'];
const get=Object.getOwnPropertyDescriptor,define=Object.defineProperty;
const observations=[];
function compare(label,install=()=>()=>{}){
 const sides={};
 for(const side of ['before','after']){
  const rows=[];
  for(const name of names){
   const tape=[],undo=install(tape);let result;
   try{result={value:modules[side][name]()};}
   catch(error){result={error:{name:error.name,message:get(error,'message')?.value??null}};}
   finally{undo();}
   rows.push({name,result,tape});
  }
  sides[side]=rows;
 }
 assert.deepEqual(sides.after,sides.before,label);observations.push({label,...sides});
}
compare('cold complete modules');compare('warm complete modules');
for(const [label,owner,key,make] of [
 ['changed Map value',Map.prototype,'get',saved=>({...saved,value:undefined})],
 ['changed Map writable',Map.prototype,'get',saved=>({...saved,writable:!saved.writable})],
 ['undefined accessor',Map.prototype,'get',saved=>({get:undefined,set:undefined,configurable:saved.configurable,enumerable:saved.enumerable})],
 ['data replaces accessor',Map.prototype,'size',saved=>({value:undefined,writable:false,configurable:saved.configurable,enumerable:saved.enumerable})],
 ['inherited writable',Object.prototype,'writable',()=>({value:false,writable:true,configurable:true})],
 ['inherited undefined writable',Object.prototype,'writable',()=>({value:undefined,writable:false,configurable:true})],
 ['unknown symbol',Map.prototype,Symbol('diagnostic'),()=>({value:1,configurable:true})],
 ['changed array numeric',Array.prototype,'127',()=>({value:1,writable:true,configurable:true})],
]){
 const saved=get(owner,key),length=owner===Array.prototype?get(owner,'length'):null;
 compare(label,()=>{
  define(owner,key,make(saved));return ()=>{if(saved)define(owner,key,saved);else assert.equal(delete owner[key],true);if(length)define(owner,'length',length);};
 });
}
const inherited=get(Object.prototype,'writable');
compare('inherited writable getter callback tape',tape=>{
 const field=Object.create(null);field.configurable=true;
 field.get=function(){tape.push('unexpected inherited getter');throw Error('diagnostic inherited getter');};
 define(Object.prototype,'writable',field);
 return ()=>{if(inherited)define(Object.prototype,'writable',inherited);else assert.equal(delete Object.prototype.writable,true);};
});
compare('restored complete modules');
const iterations=250,timings=[];
for(const side of ['before','after','after','before']){
 const start=performance.now();let successes=0;
 for(let at=0;at<iterations;at++)if(modules[side][names[0]]())successes++;
 const milliseconds=performance.now()-start;assert.equal(successes,iterations);
 timings.push({side,iterations,successes,milliseconds});
}
assert.equal(readFileSync(path,'utf8'),before);
const hash=value=>createHash('sha256').update(value).digest('hex');
const record={schema:'fixed-descriptor-parser-guard-diagnostic-v1',versions:process.versions,
 typescript:ts.version,path,before,after,edits,inverseEdits,inverse,append,observations,timings,
 completeNativeGrammar:true,completeInverse:true,sourceInstalled:false,
 originalReceivingExecuted:false,performanceQualified:false,runtimeParity:false};
const raw=Buffer.from(JSON.stringify(record));assert.ok(raw.length<=1048576);
const packed=gzipSync(raw);writeFileSync(output,packed,{flag:'wx'});
assert.equal(gunzipSync(readFileSync(output),{maxOutputLength:1048576}).equals(raw),true);
console.log(JSON.stringify({schema:record.schema,timings,pairedObservations:observations.length,
 originalReceivingExecuted:false,sourceInstalled:false,performanceQualified:false,
 bytes:raw.length,packedBytes:packed.length,packedSha256:hash(packed)}));
