// INSTALL WITH BOTH READER SUCCESSORS, NOT BEFORE. Native source cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
const timeout={timeout:60000};
const doc='/** @param {boolean} a @param {boolean} b @returns {boolean} */\n';
const variants=['owned-core','owned-vector-candidate'];
function input(syntax,variant,files){
 const original=ownedStateReceivingData(files);
 return {...original,files:original.files.filter(row=>!row.path.startsWith('runtime/')).concat(syntax.ownedCoreRuntimeSources()),...(variant==='owned-vector-candidate'?{vectorBindings:[]}: {})};
}
function value(row,env){
 if(row.kind==='bool')return row.value;
 if(row.kind==='variable')return env[row.name];
 if(row.kind==='not')return !value(row.value,env);
 if(row.kind==='choose')return value(row.cond,env)?value(row.then,env):value(row.else,env);
 assert.equal(row.kind,'binary');const a=value(row.left,env),b=value(row.right,env);
 return row.op==='&&'?a&&b:row.op==='||'?a||b:row.op==='==='?a===b:a!==b;
}
function rejected(syntax,context,path){
 let result;try{result=syntax.analyzeOriginalOwnedCoreSource(context,path);}catch(error){assert.ok(error instanceof TypeError);return;}
 assert.equal(result.program.length,0);assert.ok(result.diagnostics.length);
}
for(const variant of variants)for(const typed of [false,true])test(variant+' native imported Boolean helpers '+(typed?'TypeScript':'JavaScript'),timeout,async()=>{
 const syntax=await import('../'+variant+'-source.mjs'),ext=typed?'mts':'mjs';
 const helper=(typed?'':doc)+'export function predicate(a'+(typed?':boolean':'')+',b'+(typed?':boolean':'')+')'+(typed?':boolean':'')+'{return a ? !b : b;}';
 const caller=(typed?'':doc)+'export function caller(a'+(typed?':boolean':'')+',b'+(typed?':boolean':'')+')'+(typed?':boolean':'')+'{return chosen(a,b);}';
 for(const barrel of [false,true]){
  const entry='caller.'+ext,helperPath='helper.'+ext;
  const files=[{path:entry,source:'import { predicate as chosen } from "./'+(barrel?'barrel.': 'helper.')+ext+'";\n'+caller},{path:helperPath,source:helper},...(barrel?[{path:'barrel.'+ext,source:'export {predicate} from "./helper.'+ext+'";'}]:[])];
  const data=input(syntax,variant,files);rejected(syntax,syntax.createOwnedCoreSourceContext(data),entry);
  const result=syntax.analyzeOriginalOwnedCoreSource(syntax.createOwnedCoreBooleanHelperSourceContext(data),entry);
  assert.equal(result.program.length,1,JSON.stringify(result.diagnostics));const fn=result.program[0];
  assert.deepEqual(fn.hostCalls,[]);assert.equal(fn.body.length,1);assert.equal(fn.body[0].kind,'return');
  for(const a of [false,true])for(const b of [false,true])assert.equal(value(fn.body[0].value,{a,b}),a?!b:b);
  assert.equal(fn.source.source,files[0].source);
 }
});
for(const variant of variants)test(variant+' helper body and imported module refusals use genuine originals',timeout,async()=>{
 const syntax=await import('../'+variant+'-source.mjs');
 const ordinary=doc+'export function predicate(a,b){return a && b;}';
 const caller='import {predicate as chosen} from "./helper.mjs";\n'+doc+'export function caller(a,b){return chosen(a,b);}';
 const changes=[
  ['helper.mjs','console.log("side effect");\n'+ordinary],
  ['helper.mjs','import "./effect.mjs";\n'+ordinary],
  ['helper.mjs',doc+'export function predicate(a,b){return missing && a;}'],
  ['helper.mjs',doc+'export function predicate(a,b){const local=a;return local;}'],
  ['helper.mjs',doc+'export async function predicate(a,b){return a && b;}'],
  ['helper.mjs',doc+'export function predicate(a,b=false){return a && b;}'],
  ['helper.mjs','export {predicate} from "./helper.mjs";'],
  ['caller.mjs',caller.replace('chosen(a,b)','chosen(!a,b)')],
  ['caller.mjs',caller.replace('chosen(a,b)','chosen(a)')],
  ['caller.mjs',caller.replace('chosen(a,b)','chosen(a,b, true)')],
  ['caller.mjs',caller.replace('chosen(a,b)','chosen(...[a,b])')],
  ['caller.mjs',caller.replace('import {predicate','import type {predicate')],
 ];
 for(const [path,source] of changes){
  const files=[{path:'caller.mjs',source:caller},{path:'helper.mjs',source:ordinary},{path:'effect.mjs',source:'throw Error("never erase");'}];files.find(row=>row.path===path).source=source;
  rejected(syntax,syntax.createOwnedCoreBooleanHelperSourceContext(input(syntax,variant,files)),'caller.mjs');
 }
 const data=input(syntax,variant,[{path:'caller.mjs',source:caller},{path:'helper.mjs',source:ordinary}]);
 assert.throws(()=>syntax.createOwnedCoreSourceContext({...data,booleanHelperSyntax:true}),TypeError);
 const first=syntax.createOwnedCoreBooleanHelperSourceContext(data);data.files.find(row=>row.path==='helper.mjs').source='invalid replacement';
 assert.equal(syntax.analyzeOriginalOwnedCoreSource(first,'caller.mjs').program.length,1);
 rejected(syntax,syntax.createOwnedCoreBooleanHelperSourceContext(data),'caller.mjs');
});
