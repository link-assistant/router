// Explicit receiving APIs for the complete proposed private reverse closure.
// Copied rows/meta never issue source, type, caller or executable permission.
import {createOwnedCoreSourceContext} from './js-to-rust/owned-vector-candidate-source.mjs';
import {analyzeOwnedCoreModule,checkOwnedCoreProgram,emitOwnedCoreProgram,prepareOwnedCoreRuntime,evaluateOwnedCoreProgram} from './js-to-rust/owned-vector-candidate-operations.mjs';
import {withOrderedTextMapCallerSources} from './ordered-text-map-callers-20261102-project.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
function rules(language,repository){return createRulePipeline([{phase:'language',rules:[{id:'ordered-map:complete-original-native-type-symbol-body-and-meta-check',apply:language}]},{phase:'repository',rules:[{id:'router:fixed-owned-map-source-ABI-and-output-shape',apply:repository}]}]).run(null).value;}
export function analyzeOrderedTextMapReverseModule(input,path){
 return withOrderedTextMapCallerSources(()=>rules(()=>{const context=createOwnedCoreSourceContext(input);return analyzeOwnedCoreModule(context,path);},value=>value));
}
export function emitOrderedTextMapReverseProgram(program,target,options={}){
 return withOrderedTextMapCallerSources(()=>rules(()=>checkOwnedCoreProgram(program),checked=>emitOwnedCoreProgram(checked,target,options)));
}
// Original asynchronous runtime preparation retains its private source checks.
// The complete profile is joined both before entry and after promise settlement.
export async function prepareOrderedTextMapReverseRuntime(program){
 const pending=withOrderedTextMapCallerSources(()=>({pending:prepareOwnedCoreRuntime(program)}));
 let failed=false;try{return await pending.pending;}catch(error){failed=true;throw error;}finally{
  try{withOrderedTextMapCallerSources(()=>null);}catch(error){if(!failed)throw error;}
 }
}
export function evaluateOrderedTextMapReverseProgram(program,name,args,token){
 return withOrderedTextMapCallerSources(()=>evaluateOwnedCoreProgram(program,name,args,token));
}
export function serializeOrderedTextMapReverseMeta(program){
 return withOrderedTextMapCallerSources(()=>rules(()=>checkOwnedCoreProgram(program),checked=>JSON.stringify({schema:'ordered-text-map-checked-reverse-meta-20261102-v1',program:checked})));
}
// Decoded DATA is replaced by a fresh complete original-source program from a
// newly issued native source context. There is no persisted checked verdict.
export function readOrderedTextMapReverseMeta(text,{input,path}){
 return withOrderedTextMapCallerSources(()=>rules(()=>{
  if(typeof text!=='string'||Buffer.byteLength(text)>16777216)throw TypeError('Bounded complete map reverse meta required');const document=JSON.parse(text);
  if(document?.schema!=='ordered-text-map-checked-reverse-meta-20261102-v1'||Object.keys(document).sort().join(',')!=='program,schema'||JSON.stringify(document)!==text)throw TypeError('Canonical complete map reverse meta required');
  const context=createOwnedCoreSourceContext(input),fresh=analyzeOwnedCoreModule(context,path);
  if(JSON.stringify(document.program)!==JSON.stringify(fresh.program))throw TypeError('Map reverse meta differs from its fresh complete original source qualification');return fresh.program;
 },value=>value));
}
