// Exact complete declaration comparison only; no compiler admission or code edits.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {gunzipSync,gzipSync} from 'node:zlib';

const [input,output]=process.argv.slice(2);
assert.match(input??'',/^ci-logs\/issue-784-restart-2\/[a-z0-9-]+\.json\.gz$/u);
assert.match(output??'',/^ci-logs\/issue-784-restart-2\/[a-z0-9-]+\.json\.gz$/u);
const census=JSON.parse(gunzipSync(readFileSync(input),{maxOutputLength:4194304}));
const ts=createRequire(resolve('js/package.json'))('typescript');
assert.equal(ts.version,'5.9.3');assert.ok(census.originalSources.length<=512);
const hash=text=>createHash('sha256').update(text).digest('hex');
const groups=new Map(),inputs=[];let total=0;
for(const row of census.originalSources){
 const source=readFileSync(row.path,'utf8');total+=Buffer.byteLength(source);
 assert.ok(total<=8388608);assert.equal(hash(source),row.sha256);
 const file=ts.createSourceFile(row.path,source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS);
 assert.equal(file.parseDiagnostics.length,0);
 function collect(node,name){
  if(!node.body)return;
  const parameters=node.parameters.map(value=>value.getText(file));
  const body=node.body.getText(file),signature=JSON.stringify({parameters,body,
   async:node.modifiers?.some(value=>value.kind===ts.SyntaxKind.AsyncKeyword)??false,
   generator:!!node.asteriskToken});
  if(Buffer.byteLength(signature)<128)return;
  const key=hash(signature),group=groups.get(key)??{signature,body,parameters,rows:[]};
  assert.equal(group.signature,signature);
  group.rows.push({path:row.path,name,start:node.getStart(file),end:node.end,
   declaration:node.getText(file),declarationBytes:Buffer.byteLength(node.getText(file))});
  groups.set(key,group);
 }
 for(const statement of file.statements){
  if(ts.isFunctionDeclaration(statement))collect(statement,statement.name?.text??null);
  if(ts.isVariableStatement(statement))for(const node of statement.declarationList.declarations){
   if(node.initializer&&(ts.isArrowFunction(node.initializer)||ts.isFunctionExpression(node.initializer)))
    collect(node.initializer,node.name.getText(file));
  }
 }
 inputs.push({path:row.path,sha256:row.sha256,bytes:Buffer.byteLength(source)});
}
const duplicates=[...groups].filter(([,value])=>new Set(value.rows.map(row=>row.path)).size>1)
 .map(([sha256,value])=>({sha256,...value,
  repeatedBodyBytes:Buffer.byteLength(value.body)*(value.rows.length-1)}))
 .sort((a,b)=>b.repeatedBodyBytes-a.repeatedBodyBytes);
for(const row of inputs)assert.equal(hash(readFileSync(row.path)),row.sha256);
const report={schema:'exact-current-compiler-function-duplicates-diagnostic-v1',
 compiler:ts.version,censusInput:input,inputs,duplicates,
 repeatedBodyBytes:duplicates.reduce((sum,row)=>sum+row.repeatedBodyBytes,0),
 closedOverBindingsVerified:false,factoringImplemented:false,
 productionExecutableGain:0,semanticAuthority:false,runtimeParity:false};
const raw=Buffer.from(JSON.stringify(report));assert.ok(raw.length<=16777216);
writeFileSync(output,gzipSync(raw),{flag:'wx'});
assert.deepEqual(gunzipSync(readFileSync(output)),raw);
console.log(JSON.stringify({inputs:inputs.length,groups:duplicates.length,
 repeatedBodyBytes:report.repeatedBodyBytes,output}));
