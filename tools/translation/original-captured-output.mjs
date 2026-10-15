// Whole genuine expansion syntax with privately parsed original expr slots.
// No callee, type, allocation, macro owner or global namespace is inferred.
import {isPlainSourceIdentifier} from './module-paths.mjs';
import {declarativeExpansionLineage,declarativeExpansionOriginalInput} from './declarative-token-macros.mjs';
import {originalNamespaceInvocationInputFacts,captureOriginalNamespaceInvocationExpression,originalNamespaceInvocationExpressionFacts} from './original-namespace-parser.mjs';
const issued=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original captured output: '+message);};
const name=node=>node?.kind==='token'&&node.type==='ident'&&isPlainSourceIdentifier(node.text);
const captureKinds=new Set(['Literal','Path','Call','Field','Index','Tuple','Array','RepeatArray','Unary','Binary','Cast','If','Match','Arm','Closure','Jump','Loop','While','For','Pattern','PatternField','Empty','Block','Statement','Let','Parameter','Generics','GenericParameter','Where','Bound','ReferenceType','PointerType','TupleType','SliceType','ArrayType','PathType','NeverType','InferType','FunctionType','TypeArguments','AssociatedTypeArgument','Lifetime','BoundType']);
export function observeOriginalCapturedOutput(expansion,input,position,frame,options){
 const context=originalNamespaceInvocationInputFacts(input,position,frame,options),actualInput=declarativeExpansionOriginalInput(expansion,context.trees),lineage=declarativeExpansionLineage(expansion),captures=[];let cells=0;
 const count=depth=>{if(++cells>32000||depth>96)fail('complete output/capture syntax bound');};
 function sourceCapture(ast,depth=0){count(depth);if(ast===null||['string','number','boolean'].includes(typeof ast))return;if(typeof ast!=='object')fail('unknown original AST field');if(Object.hasOwn(ast,'kind')&&!captureKinds.has(ast.kind))fail('unclosed original capture syntax: '+ast.kind);for(const value of Object.values(ast))sourceCapture(value,depth+1);}
 function sequence(nodes,depth=0){
  let at=0;
  function expression(){count(depth);const tree=nodes[at++];let result;
   if(tree?.kind==='fragment'){
    if(tree.fragment!=='expr')fail('unsupported opaque fragment kind');
    const token=captureOriginalNamespaceInvocationExpression(input,position,frame,options,tree.trees),facts=originalNamespaceInvocationExpressionFacts(token,input,position,frame,options);if(facts.documentation.length||facts.opaqueInvocations.length)fail('original capture retains an attribute or macro obligation');sourceCapture(facts.ast,depth+1);captures.push({tree,token,facts});result={kind:'original-expression-slot',tree,capture:token,ast:facts.ast,span:facts.span};
   }else if(tree?.kind==='group'&&tree.delimiter==='('){result={kind:'parenthesized',tree,value:sequence(tree.children,depth+1)};}
   else if(tree?.kind==='owner'||name(tree)){
    const owner=tree.kind==='owner'?tree:null,segments=owner?[]:[tree],parts=[tree];
    while(nodes[at]?.kind==='token'&&nodes[at].text==='::'){parts.push(nodes[at++]);if(!name(nodes[at]))fail('complete source output path required');segments.push(nodes[at]);parts.push(nodes[at++]);}
    result={kind:'source-path',owner,segments,trees:parts,ownerResolved:false};
   }else fail('unsupported complete output prefix: '+String(tree?.kind==='token'?tree.text:tree?.kind));
   while(nodes[at]?.kind==='group'&&nodes[at].delimiter==='('){const group=nodes[at++],arguments_=[];let begin=0;for(let end=0;end<=group.children.length;end++){const child=group.children[end];if(end===group.children.length||child.kind==='token'&&child.text===','){const part=group.children.slice(begin,end);if(!part.length){if(end!==group.children.length||begin!==end)fail('empty output call argument');}else arguments_.push(sequence(part,depth+1));begin=end+1;}}result={kind:'call',callee:result,arguments:arguments_,tree:group,calleeOwnerResolved:false};}
   return result;
  }
  const result=expression();if(at!==nodes.length)fail('whole output leaves unsupported or hidden syntax');return result;
 }
 const ast=sequence(expansion.trees);freeze(ast);originalNamespaceInvocationInputFacts(input,position,frame,options);declarativeExpansionOriginalInput(expansion,actualInput);
 const token=Object.freeze({schema:'private-original-captured-output-v1'}),facts=freeze({schema:'original-captured-output-v1',expansion,lineage,ast,captures:captures.map(capture=>({token:capture.token,facts:capture.facts,originalFragment:capture.tree})),completeActualExpansionObserved:true,noWrittenAttributeOrMacroDefinitionInSelectedOutput:true,callerMacroOwnerResolved:false,callerScopeComplete:false,globalBangComplete:false,namespaceAuthority:false,typeAuthority:false,runtimeAuthority:false,allocatorEffectsVerified:false});
 issued.set(token,{expansion,input,position,frame,options,captures,facts});return token;
}
export function originalCapturedOutputFacts(token,expansion,input,position,frame,options){
 const state=issued.get(token);if(!state||state.expansion!==expansion||state.input!==input||state.position!==position||state.frame!==frame)fail('copied or foreign actual output token');
 const context=originalNamespaceInvocationInputFacts(input,position,frame,options);declarativeExpansionOriginalInput(expansion,context.trees);for(const capture of state.captures)originalNamespaceInvocationExpressionFacts(capture.token,input,position,frame,options);return state.facts;
}
