// Conditional effects of a complete pinned producer, never caller selection.
// The target expression is not executed while establishing this syntax lemma.
import {types} from 'node:util';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';
import {originalNamespaceFunctionFacts,originalNamespacePositionFacts,captureOriginalNamespaceInvocationInput,originalNamespaceInvocationInputFacts} from './original-namespace-parser.mjs';
import {originalNamespaceSourceSupersetFacts} from './conditional-namespace-superset.mjs';
import {captureOriginalStandardVecOutput,originalStandardVecOutputFacts} from './standard-vec-source-output.mjs';
import {originalStandardBangOutputSourcePlan} from './standard-bang-output-source.mjs';
import {COMPILER_OUTPUT_COLLECTION_WORKLIST} from './compiler-output-ast.mjs';

const initiallyQualified=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
const issued=initiallyQualified?new WeakMap():null;
// Reuse the trusted issuer's diagnostic ancestry, never a late TypeError global.
let diagnosticPrototype=null;
if(initiallyQualified){try{throwOriginalCapturedTypeError('Original standard bang diagnostic ancestry');}catch(value){diagnosticPrototype=Object.getPrototypeOf(value);}}
const fail=message=>throwOriginalCapturedTypeError('Original standard bang effects: '+message);
function guard(){if(!initiallyQualified||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original source operations changed');}
function own(object,key){if(!object||typeof object!=='object'||types.isProxy(object))fail('own non-proxy input required');const field=Object.getOwnPropertyDescriptor(object,key);if(!field||!Object.hasOwn(field,'value'))fail('own data input required');return field.value;}
function options(input){guard();const names=['dependencies','source','frame','position','superset'];if(!input||typeof input!=='object'||types.isProxy(input))fail('exact original options required');const keys=Reflect.ownKeys(input);if(keys.length!==names.length||keys.some(key=>!names.includes(key)))fail('exact original options required');const result={};for(const name of names)Object.defineProperty(result,name,{value:own(input,name),enumerable:true});return result;}
function frozen(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
function sameData(left,right,depth=0,budget={cells:200000}){
 if(--budget.cells<0||depth>160)fail('original source scope bound');
 if(right===null||typeof right!=='object')return left===right?(left!==0||1/left===1/right):(left!==left&&right!==right);
 if(!left||typeof left!=='object'||types.isProxy(left)||Array.isArray(left)!==Array.isArray(right))return false;
 const parent=Object.getPrototypeOf(left);if(parent!==null&&parent!==Object.prototype&&parent!==Array.prototype)return false;
 const keys=Reflect.ownKeys(left),expected=Reflect.ownKeys(right);if(keys.length!==expected.length||Array.isArray(right)&&keys.some((key,at)=>key!==expected[at]))return false;
 // The genuine issuer copyMetadata sorts object keys; array positions remain exact.
 for(const key of expected){if(!Object.hasOwn(left,key))return false;const a=Object.getOwnPropertyDescriptor(left,key),b=Object.getOwnPropertyDescriptor(right,key);if(!a||!Object.hasOwn(a,'value')||!Object.hasOwn(b,'value')||a.enumerable!==b.enumerable||!sameData(a.value,b.value,depth+1,budget))return false;}return true;
}
function sourceOptions(value){const source=value.source;const names=['module','item','memberIndex'];if(!source||typeof source!=='object'||types.isProxy(source)||Reflect.ownKeys(source).length!==names.length||names.some(key=>!Object.hasOwn(source,key)))fail('exact original function options required');return {module:own(source,'module'),item:own(source,'item'),memberIndex:own(source,'memberIndex')};}
function joined(input){
 const value=options(input),source=sourceOptions(value),module=source.module;
 const snapshot={module,item:source.item,memberIndex:source.memberIndex,source:own(module,'source'),file:own(module,'file'),sourceView:own(module,'sourceView')};
 const frame=originalNamespaceFunctionFacts(value.frame,value.source),position=originalNamespacePositionFacts(value.position,value.frame,value.source),superset=originalNamespaceSourceSupersetFacts(value.superset,{module,dependencies:value.dependencies});
 const originalInput=captureOriginalNamespaceInvocationInput(value.position,value.frame,value.source),original=originalNamespaceInvocationInputFacts(originalInput,value.position,value.frame,value.source);
 const state={input,value,snapshot,frame,position,superset,originalInput,original};current(state);return state;
}
function current(state){
 guard();const now=options(state.input);for(const key of Object.keys(now))if(now[key]!==state.value[key])fail('original invocation options changed');
 const source=sourceOptions(now),prior=state.snapshot,module=source.module;
 if(module!==prior.module||source.item!==prior.item||source.memberIndex!==prior.memberIndex||own(module,'source')!==prior.source||own(module,'file')!==prior.file||own(module,'sourceView')!==prior.sourceView||!sameData(own(module,'path'),state.frame.source.module)||!sameData(own(module,'compilationProfile'),state.frame.source.compilationProfile))fail('original source module/item/profile changed');
}
function unchangedPlan(prior,actual){if(prior.manifestSha256!==actual.manifestSha256||prior.sources.length!==actual.sources.length)fail('complete registered source plan changed');for(let at=0;at<prior.sources.length;at++){const a=prior.sources[at],b=actual.sources[at];for(const key of ['sourcePath','source','sha256','bytes','archive','archiveBytes','archiveSha256'])if(a[key]!==b[key])fail('complete registered original source changed');}}

// A positive grammar over the privately issued AST, including every child.
// Narrowing this grammar never substitutes a public "no effects" assertion.
const sourceKinds=initiallyQualified?new Set(['Literal','Path','Field','Call','Index','Tuple','Array','RepeatArray','Unary','Binary','Cast','PathType','TypeArguments','AssociatedTypeArgument','Lifetime','BoundType','ReferenceType','PointerType','TupleType','SliceType','ArrayType','NeverType','InferType','FunctionType']):null;
function completeOutputEffects(output){
 let cells=0,sourceNodes=0,outputNodes=0;
 const charge=depth=>{if(++cells>32000||depth>96)fail('complete output effect bound');};
 function source(value,depth){charge(depth);if(value===null||['string','number','boolean'].includes(typeof value))return;if(!value||typeof value!=='object')fail('unknown original expression scalar');if(Array.isArray(value)){for(const child of value)source(child,depth+1);return;}if(Object.hasOwn(value,'kind')){if(!sourceKinds.has(value.kind))fail('unclosed original expression effect: '+value.kind);sourceNodes++;}for(const child of Object.values(value))source(child,depth+1);}
 function expression(node,depth=0){charge(depth);outputNodes++;
  if(node.kind==='source-path')return;
  if(node.kind==='parenthesized'){expression(node.value,depth+1);return;}
  if(node.kind==='call'){expression(node.callee,depth+1);for(const child of node.arguments)expression(child,depth+1);return;}
  if(node.kind==='original-expression-slot'){source(node.ast,depth+1);return;}
  fail('unclosed complete output variant');
 }
 expression(output.ast);
 return frozen({schema:'complete-expression-output-effects-v1',wholeOutputAndEveryCaptureVisited:true,cells,sourceNodes,outputNodes,
  generatedMacroDefinitions:0,generatedMacroExports:0,generatedAttributeLikeProducers:0,unresolvedNestedBangInvocations:0,
  proof:'The entire genuine expansion is call/path/parenthesized/original-expression syntax. Every captured AST node belongs to the positive grammar; attributes, definitions, opaque macros, imports and item slots have no accepted production. Target calls are retained expression syntax, not executed compiler callbacks.',
  targetExpressionExecutionProved:false,allocatorOrCloneEffectsProved:false});
}
const authority={callerMacroOwnerResolved:false,callerScopeComplete:false,configurationSelected:false,standardAttributeOwnersResolved:false,namespaceAuthority:false,typeAuthority:false,runtimeAuthority:false,globalBangComplete:false};
function pending(plan,selected,error){return frozen({schema:'unresolved-original-standard-bang-effects-v1',source:selected.frame.source,position:selected.position,originalInput:selected.original,sourcePlan:plan,
 registeredProducerAlternatives:{registry:plan.registry,recipes:plan.recipes,callbacks:plan.callbacks,definitions:plan.panicDefinitions},
 missingContracts:[...COMPILER_OUTPUT_COLLECTION_WORKLIST,{id:'rust.compiler.return-wrapper-effects',requires:['actual Ready/MacEager accessor/Box/Default complete return and effect contracts','all eight fields and all nine override branches']},{id:'rust.compiler.nested-format-complete-effects',requires:['both std/core editions and both panic_immediate_abort alternatives','actual original format_args/const_format_args TT and generated AST','all original attributes/helper/owner/effect paths']}],
 candidateRefusal:error,completeProducerEffectSetProved:false,generatedMacroDefinitions:null,generatedMacroExports:null,generatedAttributeLikeProducers:null,...authority});}

export function captureOriginalStandardBangEffects(input){
 const selected=joined(input),plan=originalStandardBangOutputSourcePlan();guard();let vec=null,refusal=null;
 try{vec=captureOriginalStandardVecOutput(selected.value);}catch(error){guard();if(!error||typeof error!=='object'||types.isProxy(error)||Object.getPrototypeOf(error)!==diagnosticPrototype)throw error;const field=Object.getOwnPropertyDescriptor(error,'message');refusal={name:'TypeError',message:field&&Object.hasOwn(field,'value')&&typeof field.value==='string'?field.value:null,stackCaptured:false};}
 guard();let facts;
 if(vec){const original=originalStandardVecOutputFacts(vec,selected.value);guard();const effects=completeOutputEffects(original.output);unchangedPlan(plan,original.plan);facts=frozen({schema:'conditional-original-standard-bang-effects-v1',source:selected.frame.source,position:selected.position,originalInput:selected.original,producer:{kind:'pinned-original-declarative-definition',header:original.header,definition:original.definition,sourcePlan:original.plan},originalOutput:original,effects,
  conditionalOnExactOriginalProducerSelection:true,completeProducerEffectSetProved:true,generatedMacroDefinitions:0,generatedMacroExports:0,generatedAttributeLikeProducers:0,
  obligations:['actual caller macro owner/attribute ownership/availability and all competing alternatives are separate','the complete selected standard definition must be the actual producer','target expression execution, Vec/Clone/allocator behavior is not proved'],...authority});}
 else facts=pending(plan,selected,refusal);
 current(selected);const token=Object.freeze({schema:'private-original-standard-bang-effects-v1'});issued.set(token,{selected,plan,vec,facts});return token;
}
function rejoin(token,input){
 guard();const state=issued.get(token);if(!state)fail('copied or unissued effect token');const actual=options(input);for(const key of Object.keys(actual))if(actual[key]!==state.selected.value[key])fail('foreign original invocation');
 const fresh=joined(input);unchangedPlan(state.plan,originalStandardBangOutputSourcePlan());guard();
 if(state.vec){const output=originalStandardVecOutputFacts(state.vec,actual);guard();completeOutputEffects(output.output);}
 if(fresh.frame!==state.selected.frame||fresh.position!==state.selected.position||fresh.superset!==state.selected.superset)fail('private original source association changed');
 current(fresh);current(state.selected);return state;
}
// Inspection never promotes a pending token. Consumers must call require.
export function originalStandardBangEffectObligations(token,input){return rejoin(token,input).facts;}
export function requireOriginalStandardBangEffects(token,input){const state=rejoin(token,input);if(!state.vec)fail('complete producer effect branch set remains open');return state.facts;}
