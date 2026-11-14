// Finite private-helper diagnostic only. Execute after the current receiving
// cohort has finished. This does not qualify the complete parser or deadlines.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';

const base='ci-logs/issue-784-restart-2/';
const packed=readFileSync(base+'private-native-descriptor-kind-draft.json.gz');
const plan=JSON.parse(gunzipSync(packed,{maxOutputLength:1048576}));
const sha=source=>createHash('sha256').update(source).digest('hex');
assert.equal(readFileSync(plan.path,'utf8'),plan.before);
assert.equal(sha(plan.before),plan.beforeSha256);
assert.equal(sha(plan.after),plan.afterSha256);
const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
const sources={},functions={};
for(const side of ['before','after']){
 const file=ts.createSourceFile(plan.path,plan[side],ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(file.parseDiagnostics.length,0);
 const nodes=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='same');
 assert.equal(nodes.length,1);
 const source=plan[side].slice(nodes[0].getStart(file),nodes[0].end);
 sources[side]=source;
 // The only supplied operation is the actual native own-field predicate.
 functions[side]=Function('own','return ('+source+');')(Object.hasOwn);
}
assert.equal(plan.after.replace(sources.after,sources.before),plan.before);
const get=Object.getOwnPropertyDescriptor,define=Object.defineProperty;
const values=[undefined,null,false,true,0,-0,NaN,1,'',Symbol('fixed'),{},function fixed(){}];
const descriptors=[undefined];
for(const value of values)for(const writable of [false,true])
 for(const enumerable of [false,true])for(const configurable of [false,true]){
  const owner={};define(owner,'field',{value,writable,enumerable,configurable});
  descriptors.push(get(owner,'field'));
 }
const getters=[undefined,function first(){},function second(){}];
for(const getter of getters)for(const setter of getters)
 for(const enumerable of [false,true])for(const configurable of [false,true]){
  const owner={};define(owner,'field',{get:getter,set:setter,enumerable,configurable});
  descriptors.push(get(owner,'field'));
 }
const comparisons=[];
function compare(label){
 let equal=0,unequal=0;
 for(let left=0;left<descriptors.length;left++)for(let right=0;right<descriptors.length;right++){
  const before=functions.before(descriptors[left],descriptors[right]);
  const after=functions.after(descriptors[left],descriptors[right]);
  assert.equal(after,before,label+':'+left+':'+right);
  if(before)equal++;else unequal++;
 }
 comparisons.push({label,pairs:descriptors.length**2,equal,unequal});
}
compare('complete native data and accessor descriptors');
const saved=get(Object.prototype,'value'),tape=[];
try{
 const field=Object.create(null);field.configurable=true;
 field.get=function(){tape.push('inherited value getter');throw Error('unexpected inherited value');};
 define(Object.prototype,'value',field);
 compare('inherited value accessor is never invoked');
}finally{if(saved)define(Object.prototype,'value',saved);else delete Object.prototype.value;}
assert.deepEqual(tape,[]);
const output={schema:'private-native-descriptor-kind-finite-diagnostic-v1',
 node:process.versions.node,typescript:ts.version,draftSha256:sha(packed),
 plan,sources,descriptors:descriptors.length,comparisons,tape,
 completeNativeGrammar:true,completeRawInverse:true,
 sourceInstalled:false,completeCstChecked:false,receivingQualified:false,
 performanceQualified:false,productionExecutableGain:0,runtimeParity:false};
const raw=Buffer.from(JSON.stringify(output));
const bytes=gzipSync(raw,{mtime:0});assert.deepEqual(gunzipSync(bytes),raw);
const path=base+'private-native-descriptor-kind-finite.json.gz';
writeFileSync(path,bytes,{flag:'wx'});
console.log(JSON.stringify({path,sha256:sha(bytes),comparisons,
 sourceInstalled:false,receivingQualified:false,performanceQualified:false}));
