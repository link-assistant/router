// A separate opt-in engine/observer. Existing token/source engines and the
// repeat-vec observer keep their old brands, APIs and refusal domains.
import {types} from 'node:util';
import {createDeclarativeMacroEngine} from './declarative-macro-engine.mjs';
import {originalMacroLiteralGrammar,requireOriginalMacroLiteralGrammar,originalMacroLiteralEnd} from './macro-literal-source.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';
import {originalNamespaceInvocationInputFacts,captureOriginalNamespaceInvocationExpression,originalNamespaceInvocationExpressionFacts} from './original-namespace-parser.mjs';
const initial=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
const issued=initial?new WeakMap():null;let engine=null,grammar=null;
const fail=message=>throwOriginalCapturedTypeError('Original block captured output: '+message);
function guard(){if(!initial||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original source operations changed');}
function instance(){guard();if(!engine){const selected=originalMacroLiteralGrammar();guard();const value=createDeclarativeMacroEngine(null,selected);grammar=selected;engine=value;}requireOriginalMacroLiteralGrammar(grammar);guard();return engine;}
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function own(object,key){if(!object||typeof object!=='object'||types.isProxy(object))fail('own non-proxy options required');const field=Object.getOwnPropertyDescriptor(object,key);if(!field||!Object.hasOwn(field,'value'))fail('own data options required');return field.value;}
export function compileOriginalLiteralMacro(source,options){
 guard();if(typeof source!=='string'||!options||typeof options!=='object'||types.isProxy(options))fail('original source and options required');const keys=Reflect.ownKeys(options);if(keys.length!==2||!Object.hasOwn(options,'name')||!Object.hasOwn(options,'owner'))fail('exact name/owner options required');const name=own(options,'name'),owner=own(options,'owner');if(!Array.isArray(owner)||types.isProxy(owner)||Object.getPrototypeOf(owner)!==Array.prototype||Reflect.ownKeys(owner).length!==owner.length+1)fail('dense source owner candidate required');const values=[];for(let at=0;at<owner.length;at++){const value=own(owner,''+at);if(typeof value!=='string')fail('primitive owner candidate required');values.push(value);}return instance().compileDeclarativeMacro(source,{name,owner:values});
}
export function expandOriginalLiteralMacro(definition,input){return instance().expandDeclarativeMacro(definition,input);}
export function originalLiteralMacroHeader(definition){return instance().declarativeDefinitionHeader(definition);}
export function originalLiteralMacroLineage(expansion){return instance().declarativeExpansionLineage(expansion);}
export function originalLiteralMacroGrammar(){instance();return grammar;}
export function originalLiteralNestedMacroInvocations(expansion){return instance().declarativeNestedMacroInvocations(expansion);}
export function originalLiteralNestedMacroInput(expansion,invocation){return instance().declarativeNestedMacroInput(expansion,invocation);}

const sourceKinds=initial?new Set(['Literal','Path','Field','Call','Index','Tuple','Array','RepeatArray','Unary','Binary','Cast','PathType','TypeArguments','AssociatedTypeArgument','Lifetime','BoundType','ReferenceType','PointerType','TupleType','SliceType','ArrayType','NeverType','InferType','FunctionType']):null;
const name=tree=>tree?.kind==='token'&&tree.type==='ident'&&/^[_A-Za-z][_A-Za-z0-9]*$/u.test(tree.text);
export function observeOriginalBlockCapturedOutput(expansion,input,position,frame,source){
 const actual=instance(),context=originalNamespaceInvocationInputFacts(input,position,frame,source);actual.declarativeExpansionOriginalInput(expansion,context.trees);const lineage=actual.declarativeExpansionLineage(expansion),nestedCandidates=actual.declarativeNestedMacroInvocations(expansion),captures=[],nested=[];let cells=0;
 const charge=depth=>{if(++cells>32000||depth>96)fail('complete output syntax bound');};
 function sourceAst(value,depth){charge(depth);if(value===null||['string','number','boolean'].includes(typeof value))return;if(!value||typeof value!=='object')fail('unknown original capture scalar');if(Object.hasOwn(value,'kind')&&!sourceKinds.has(value.kind))fail('unclosed original capture node: '+value.kind);for(const child of Object.values(value))sourceAst(child,depth+1);}
 function tt(value,depth){charge(depth);if(value.kind==='token'){if(typeof value.text!=='string'||typeof value.type!=='string')fail('unknown nested token');return;}if(value.kind==='owner'){for(const part of value.target)if(typeof part!=='string')fail('unknown nested owner');return;}if(value.kind==='group'){if(!['(','[','{'].includes(value.delimiter))fail('unknown nested delimiter');for(const child of value.children)tt(child,depth+1);return;}if(value.kind==='fragment'&&['tt','expr','literal','ident','lifetime'].includes(value.fragment)){for(const child of value.trees)tt(child,depth+1);return;}fail('unknown nested input variant');}
 function originalSlot(tree,depth){
  if(!['expr','literal'].includes(tree.fragment))fail('unsupported original fragment');let trees=tree.trees,levels=0;
  while(trees.length===1&&trees[0].kind==='fragment'&&trees[0].fragment===tree.fragment){if(++levels>32)fail('opaque forwarding bound');trees=trees[0].trees;}
  const token=captureOriginalNamespaceInvocationExpression(input,position,frame,source,trees),facts=originalNamespaceInvocationExpressionFacts(token,input,position,frame,source);if(facts.documentation.length||facts.opaqueInvocations.length)fail('original capture retains macro/attribute obligations');sourceAst(facts.ast,depth+1);captures.push({token,facts,tree,originalTrees:trees});return {kind:'original-expression-slot',tree,token,ast:facts.ast,span:facts.span};
 }
 function sequence(nodes,depth=0,block=false){
  let at=0;
  function expression(level=depth){
   charge(level);const tree=nodes[at++];let result;
   if(tree?.kind==='fragment')result=originalSlot(tree,level);
   else if(tree?.kind==='group'&&tree.delimiter==='{')result={kind:'block',tree,body:sequence(tree.children,level+1,true)};
   else if(tree?.kind==='group'&&tree.delimiter==='(')result={kind:'parenthesized',tree,value:sequence(tree.children,level+1)};
   else if(tree?.kind==='token'&&tree.text==='&'){if(nodes[at]?.text==='mut'||nodes[at]?.text==='raw'||nodes[at]?.type==='char')fail('unsupported generated borrow modifier');result={kind:'shared-borrow',tree,value:expression(level+1),borrowSemanticsProved:false};}
   else if(tree?.kind==='token'&&['true','false'].includes(tree.text)){const literal=originalMacroLiteralEnd(grammar,nodes,at-1);result={kind:'written-literal',tree,literal};}
   else if(tree?.kind==='owner'||name(tree)){
    const parts=[tree],segments=tree.kind==='owner'?[]:[tree];while(nodes[at]?.kind==='token'&&nodes[at].text==='::'){parts.push(nodes[at++]);if(!name(nodes[at]))fail('complete original output path required');segments.push(nodes[at]);parts.push(nodes[at++]);}result={kind:'source-path',owner:tree.kind==='owner'?tree:null,segments,trees:parts,ownerResolved:false};
   }else if(tree?.kind==='token'&&(tree.type==='string'||tree.type==='number')){const literal=originalMacroLiteralEnd(grammar,nodes,at-1);if(!literal||literal.end!==at)fail('one written literal required');result={kind:'written-literal',tree,literal};}
   else fail('unsupported whole output prefix');
   if(result.kind==='source-path'&&nodes[at]?.text==='!'){
    const bang=nodes[at++],group=nodes[at++];if(group?.kind!=='group')fail('whole nested invocation delimiter required');const rows=nestedCandidates.filter(row=>actual.declarativeNestedMacroInput(expansion,row)===group.children);if(rows.length!==1)fail('nested invocation lacks unique private lineage');for(const child of group.children)tt(child,level+1);const invocation={kind:'nested-macro',path:result,bang,tree:group,invocation:rows[0],input:group.children,completeExpansionEffectsProved:false};nested.push(invocation);result=invocation;
   }
   while(nodes[at]?.kind==='group'&&nodes[at].delimiter==='('){const group=nodes[at++],arguments_=[];let begin=0;for(let end=0;end<=group.children.length;end++)if(end===group.children.length||group.children[end].kind==='token'&&group.children[end].text===','){if(begin!==end)arguments_.push(sequence(group.children.slice(begin,end),level+1));else if(end!==group.children.length)fail('empty generated call argument');begin=end+1;}result={kind:'call',callee:result,arguments:arguments_,tree:group,calleeOwnerResolved:false};}
   return result;
  }
  if(!block){const result=expression();if(at!==nodes.length)fail('whole output has hidden or unsupported syntax');return result;}
  const statements=[];while(at<nodes.length){const value=expression(),semicolon=nodes[at]?.text===';'?nodes[at++]:null;statements.push({value,semicolon});if(!semicolon&&at!==nodes.length)fail('unterminated or hidden generated statement');}return {kind:'statement-sequence',statements};
 }
 const ast=sequence(expansion.trees);if(nested.length!==nestedCandidates.length)fail('not every private nested invocation was visited');guard();originalNamespaceInvocationInputFacts(input,position,frame,source);actual.declarativeExpansionOriginalInput(expansion,context.trees);
 const token=Object.freeze({schema:'private-original-block-output-v1'}),facts=freeze({schema:'original-block-output-v1',expansion,lineage,ast,captures,nested,cells,completeActualOutputSyntaxObserved:true,allOriginalCapturesVisited:true,
  completeSelectedOutputEffectsProved:nested.length===0,generatedMacroDefinitions:nested.length?null:0,generatedMacroExports:nested.length?null:0,generatedAttributeLikeProducers:nested.length?null:0,
  conditionalOnExactOriginalProducerSelection:true,sourceAttributeOwnersResolved:false,callerMacroOwnerResolved:false,callerScopeComplete:false,configurationSelected:false,globalBangComplete:false,borrowOrAllocationExecutionProved:false,namespaceAuthority:false,typeAuthority:false,runtimeAuthority:false});issued.set(token,{expansion,input,position,frame,source,facts});return token;
}
export function originalBlockCapturedOutputFacts(token,expansion,input,position,frame,source){
 const actual=instance(),state=issued.get(token);if(!state||state.expansion!==expansion||state.input!==input||state.position!==position||state.frame!==frame||state.source!==source)fail('copied or foreign complete output token');const context=originalNamespaceInvocationInputFacts(input,position,frame,source);actual.declarativeExpansionOriginalInput(expansion,context.trees);for(const capture of state.facts.captures)originalNamespaceInvocationExpressionFacts(capture.token,input,position,frame,source);return state.facts;
}
