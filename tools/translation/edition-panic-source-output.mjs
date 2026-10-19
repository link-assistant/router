// Registered generator candidates plus original source flow, not a selected
// caller macro owner or an evaluated Rust compiler generator.
import {types} from 'node:util';
import {ownData} from './extensions/source-links.mjs';
import {builtinDeriveAstSourceProfile} from './builtin-derive-ast-meta.mjs';
import {originalNamespaceFunctionFacts,originalNamespacePositionFacts,captureOriginalNamespaceInvocationInput,originalNamespaceInvocationInputFacts} from './original-namespace-parser.mjs';
import {originalNamespaceSourceSupersetFacts} from './conditional-namespace-superset.mjs';
import {originalStandardBangOutputSourcePlan,requireOriginalStandardBangOutputSourcePlan} from './standard-bang-output-source.mjs';
import {createCompilerOutputAstCompiler,compileOriginalCompilerOutputFlow,originalCompilerOutputFlowFacts,COMPILER_OUTPUT_COLLECTION_WORKLIST} from './compiler-output-ast.mjs';
const issued=new WeakMap(),fail=message=>{throw new TypeError('Original edition panic flow: '+message);};
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function selected(options){
 const keys=['dependencies','source','frame','position','superset'];
 if(!options||typeof options!=='object'||types.isProxy(options)||Reflect.ownKeys(options).length!==keys.length||!keys.every(key=>Object.hasOwn(options,key)))fail('exact own original caller inputs required');
 const input={};for(const key of keys)input[key]=ownData(options,key);
 input.positionFacts=originalNamespacePositionFacts(input.position,input.frame,input.source);input.frameFacts=originalNamespaceFunctionFacts(input.frame,input.source);
 input.supersetFacts=originalNamespaceSourceSupersetFacts(input.superset,{module:ownData(input.source,'module'),dependencies:input.dependencies});
 if(!['Expr','Stmts'].includes(input.positionFacts.position))fail('original expression or statement invocation required');return input;
}
export function captureOriginalEditionPanicSourceFlow(options){
 const input=selected(options),plan=requireOriginalStandardBangOutputSourcePlan(originalStandardBangOutputSourcePlan()),profile=builtinDeriveAstSourceProfile(input.dependencies),compiler=createCompilerOutputAstCompiler(profile,plan);
 const slot=captureOriginalNamespaceInvocationInput(input.position,input.frame,input.source),original=originalNamespaceInvocationInputFacts(slot,input.position,input.frame,input.source),rows=[];
 for(const callback of Object.values(plan.callbacks)){
  const flow=compileOriginalCompilerOutputFlow(compiler,callback.sourcePath,callback.name),facts=originalCompilerOutputFlowFacts(flow,compiler);
  if(facts.fragment.span.end!==callback.span.end||facts.fragment.span.start<callback.span.start||!callback.original.endsWith(facts.original.source.slice(facts.fragment.span.start,facts.fragment.span.end)))fail('registered whole callback/source association differs');
  rows.push({role:callback.name,flow,facts});
 }
 for(const [path,name,selector]of [['compiler/rustc_expand/src/base.rs','std_path',null],['compiler/rustc_ast/src/ast.rs','from_ident','PathSegment { ident, id: DUMMY_NODE_ID, args: None }']]){
  const flow=compileOriginalCompilerOutputFlow(compiler,path,name,selector);rows.push({role:name,flow,facts:originalCompilerOutputFlowFacts(flow,compiler)});
 }
 const token=Object.freeze({schema:'private-original-edition-panic-source-flow-v1'}),facts=freeze({schema:'original-edition-panic-source-flow-v1',source:input.frameFacts.source,position:input.positionFacts,original,plan,flows:rows,
  // Every registered candidate is retained even for an unrelated invocation.
  // Path spellings and imports do not select any of these owners.
  registeredCandidates:plan.recipes.slice(0,3),originalScopeAlternatives:input.supersetFacts,worklist:COMPILER_OUTPUT_COLLECTION_WORKLIST,
  exactOriginalInputRetained:true,allRegisteredCallbackSourceRetained:true,callerMacroOwnerResolved:false,callsiteEditionResolved:false,configurationSelected:false,globalBangComplete:false,completeOutputProved:false,namespaceAuthority:false,typeAuthority:false,runtimeAuthority:false,
  pending:[...plan.pending,'all original source method/closure/collection contracts remain unexecuted','wildcard imports and constructor return-type ownership remain unresolved','no dimensional proof is issued to external-trait namespace consumers']});
 selected(options);issued.set(token,{input,plan,compiler,slot,facts});return token;
}
export function originalEditionPanicSourceFlowFacts(token,options){
 const state=issued.get(token);if(!state)fail('copied or unissued source-flow token');const input=selected(options),prior=state.input;
 if(input.frame!==prior.frame||input.position!==prior.position||input.superset!==prior.superset||input.dependencies!==prior.dependencies)fail('foreign original caller association');
 requireOriginalStandardBangOutputSourcePlan(state.plan);originalNamespaceInvocationInputFacts(state.slot,input.position,input.frame,input.source);
 for(const row of state.facts.flows)originalCompilerOutputFlowFacts(row.flow,state.compiler);return state.facts;
}
