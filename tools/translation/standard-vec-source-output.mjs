// A pinned standard-definition candidate and complete actual selected output.
// Import syntax is never sufficient to resolve the caller's macro namespace.
import {types} from 'node:util';
import {ownData} from './extensions/source-links.mjs';
import {originalNamespaceFunctionFacts,originalNamespacePositionFacts,captureOriginalNamespaceInvocationInput,originalNamespaceInvocationInputFacts} from './original-namespace-parser.mjs';
import {originalNamespaceSourceSupersetFacts} from './conditional-namespace-superset.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro,declarativeDefinitionHeader} from './declarative-token-macros.mjs';
import {observeOriginalCapturedOutput,originalCapturedOutputFacts} from './original-captured-output.mjs';
import {originalStandardBangOutputSourcePlan,requireOriginalStandardBangOutputSourcePlan} from './standard-bang-output-source.mjs';
const issued=new WeakMap(),fail=message=>{throw new TypeError('Original standard vec output: '+message);};
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function input(options){
 const keys=['dependencies','source','frame','position','superset'];
 if(!options||typeof options!=='object'||types.isProxy(options)||Reflect.ownKeys(options).length!==keys.length||!keys.every(key=>Object.hasOwn(options,key)))fail('exact own source/frame/position/superset/dependencies options required');
 const result={};for(const key of keys)result[key]=ownData(options,key);
 // These private joins also reject hostile source/module options before any
 // standard-source load or caller-provided object is traversed.
 result.positionFacts=originalNamespacePositionFacts(result.position,result.frame,result.source);
 result.frameFacts=originalNamespaceFunctionFacts(result.frame,result.source);
 result.supersetFacts=originalNamespaceSourceSupersetFacts(result.superset,{module:ownData(result.source,'module'),dependencies:result.dependencies});
 if(result.positionFacts.position!=='Expr')fail('only original expression-position invocation supported');
 return result;
}
const sameWords=(left,right)=>left.length===right.length&&left.every((word,index)=>word===right[index]);
function writtenGuardRelationship(frame,imports){
 const guards=frame.ast.fields.attributes.map(attribute=>attribute.fields.tree.tokens.slice(1,-1).map(token=>token.text)).filter(words=>words[0]==='cfg');
 return imports.map(import_=>({span:import_.declaration.span,original:import_.declaration.original,leaf:import_.leaf,
  writtenGuards:import_.declaration.attributes.map(span=>span),
  identicalWrittenGuardTokens:import_.guards.some(guard=>guards.some(other=>sameWords(guard,other))),
  configurationSelected:false,configurationRelationshipSemanticallyVerified:false}));
}
function importCandidates(selected){
 const path=selected.positionFacts.invocation.fields.path.fields;
 if(path.absolute||path.segments.length!==1)fail('bounded lane requires an original unqualified explicit import candidate');
 const name=path.segments[0],imports=[];
 for(const declaration of selected.supersetFacts.declarations)for(const leaf of declaration.imports){
  if(leaf.name!==name||leaf.glob||leaf.validateOnly||leaf.segments.length!==2||leaf.segments[0]!=='alloc'||leaf.segments[1]!=='vec')continue;
  const guards=declaration.attributes.map(span=>selected.supersetFacts.attributes.find(attribute=>attribute.span.start===span.start&&attribute.span.end===span.end)).filter(Boolean).map(attribute=>attribute.attribute.tokens.map(token=>token.text)).filter(words=>words[0]==='cfg');
  imports.push({declaration,leaf,guards});
 }
 if(imports.length!==1)fail('one exact written alloc vec import candidate required; owner remains pending');return writtenGuardRelationship(selected.frameFacts,imports);
}
export function captureOriginalStandardVecOutput(options){
 const selected=input(options),imports=importCandidates(selected),plan=requireOriginalStandardBangOutputSourcePlan(originalStandardBangOutputSourcePlan());
 const origin=plan.sources.find(source=>source.sourcePath===plan.vec.sourcePath),definition=compileDeclarativeMacro(origin.source,{name:plan.vec.name,owner:['alloc']}),header=declarativeDefinitionHeader(definition);
 if(header.sourceSha256!==origin.sha256||header.span.start!==plan.vec.span.start||header.span.end!==plan.vec.span.end||definition.rules.length!==3)fail('complete original standard definition/header differs');
 const rules=definition.rules.map((rule,index)=>({rule,index})).filter(({rule})=>rule.pattern.length===3&&rule.pattern[0].kind==='capture'&&rule.pattern[0].fragment==='expr'&&rule.pattern[1].kind==='literal'&&rule.pattern[1].tree.text===';'&&rule.pattern[2].kind==='capture'&&rule.pattern[2].fragment==='expr');
 if(rules.length!==1)fail('unique original expr-semicolon-expr rule required');
 const originalInput=captureOriginalNamespaceInvocationInput(selected.position,selected.frame,selected.source),original=originalNamespaceInvocationInputFacts(originalInput,selected.position,selected.frame,selected.source),expansion=expandDeclarativeMacro(definition,original.trees);
 if(expansion.rule!==rules[0].index)fail('only original semicolon rule output is supported');
 const output=observeOriginalCapturedOutput(expansion,originalInput,selected.position,selected.frame,selected.source),observed=originalCapturedOutputFacts(output,expansion,originalInput,selected.position,selected.frame,selected.source);
 const token=Object.freeze({schema:'private-original-standard-vec-output-v1'}),facts=freeze({schema:'original-standard-vec-output-v1',source:selected.frameFacts.source,position:selected.positionFacts,original,plan,definition,header,expansion,output:observed,imports,
  originalScopeAlternatives:selected.supersetFacts,selectedStandardDefinitionPinned:true,completeOriginalDefinitionParsed:true,completeSelectedOutputObserved:true,
  callerMacroOwnerResolved:false,standardAttributeOwnersResolved:false,configurationSelected:false,callerScopeComplete:false,globalBangComplete:false,namespaceAuthority:false,typeAuthority:false,runtimeAuthority:false,vecAllocationOrCloneVerified:false,
  pending:['explicit import is a candidate, not caller owner resolution','all original and generated competing bindings and conditional alternatives','standard macro attribute ownership and availability','definition-site owner path resolution','captured calls/types/evaluation/Clone/allocator effects']});
 input(options);issued.set(token,{selected,originalInput,expansion,output,plan,facts});return token;
}
export function originalStandardVecOutputFacts(token,options){
 const state=issued.get(token);if(!state)fail('copied or unissued standard output token');const selected=input(options),prior=state.selected;
 if(selected.frame!==prior.frame||selected.position!==prior.position||selected.superset!==prior.superset||selected.dependencies!==prior.dependencies)fail('foreign original caller association');
 requireOriginalStandardBangOutputSourcePlan(state.plan);originalCapturedOutputFacts(state.output,state.expansion,state.originalInput,selected.position,selected.frame,selected.source);return state.facts;
}
