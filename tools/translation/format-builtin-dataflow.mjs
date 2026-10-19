// Source-derived symbolic staging only. No ExtCtxt/AST or resolver is executed.
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
import {formatSourceStageInput} from './format-source-profiles.mjs';
import {compileFormatCompilerSourceMeta} from './format-source-meta.mjs';
const states=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const word=node=>node?.kind==='token'?node.text:null;
const identifier=node=>node?.kind==='token'&&node.type==='ident'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(node.text);
const span=nodes=>({start:nodes[0].span.start,end:nodes.at(-1).span.end});
function split(nodes,separator=',') {
  const result=[];let begin=0;
  for(let at=0;at<=nodes.length;at++)if(at===nodes.length||word(nodes[at])===separator){const part=nodes.slice(begin,at);if(part.length)result.push(part);else if(at<nodes.length)throw new TypeError('Empty source dataflow operand');begin=at+1;}
  return result;
}
function pathAt(nodes,at) {
  if(!identifier(nodes[at]))return null;const path=[word(nodes[at])];let end=at+1;
  while(['::','.'].includes(word(nodes[end]))&&identifier(nodes[end+1])){path.push(word(nodes[end]),word(nodes[end+1]));end+=2;}
  return {path,end};
}
function relocateTree(node,offset) {
  return {...node,span:{start:node.span.start+offset,end:node.span.end+offset},...(node.children?{children:node.children.map(child=>relocateTree(child,offset))}:{})};
}
function functionTrees(pin,fn) {
  const body=pin.source.slice(fn.bodySpan.start,fn.bodySpan.end),trees=originalMacroTrees(body).map(node=>relocateTree(node,fn.bodySpan.start));
  if(trees.length!==1||trees[0].delimiter!=='{')throw new TypeError('Original source function body group changed');return trees[0];
}
function issue(value,state) {
  const text=JSON.stringify(value),parsed=JSON.parse(text);
  if(hash(JSON.stringify(parsed))!==hash(text))throw new TypeError('Source dataflow metadata roundtrip changed');
  const result=freezeMacroTree({...parsed,privateMetaRoundtrip:true,checkedMetaSha256:hash(text)});states.set(result,state);return result;
}
const limits={sourceSemanticClosureVerified:false,builtinBuilderOwnerResolved:false,callerMacroOwnerResolved:false,traitSelectionVerified:false,allocatorEffectsVerified:false,ioEffectsVerified:false,namespaceAuthority:false,runtimeParity:false};
// Every node retains its original operands rather than a guessed compiler call.
function syntaxFlow(group) {
  let cells=0;
  function visit(nodes,scope=[]) {
    const calls=[],bindings=[],nested=[];
    for(let at=0;at<nodes.length;at++) {
      if(++cells>32000)throw new RangeError('Original compiler dataflow cell budget');
      const token=word(nodes[at]);
      if(token==='let') {let end=at+1;while(end<nodes.length&&!['=',';'].includes(word(nodes[end])))end++;
        if(word(nodes[end])==='='){let stop=end+1;while(stop<nodes.length&&word(nodes[stop])!==';')stop++;
          bindings.push({pattern:nodes.slice(at+1,end),initializer:nodes.slice(end+1,stop),span:span(nodes.slice(at,stop)),lexicalScope:scope,bindingSemanticsVerified:false});}
      }
      const path=pathAt(nodes,at);if(path) {
        const macro=word(nodes[path.end])==='!',arguments_=nodes[path.end+(macro?1:0)];
        if(arguments_?.delimiter==='('||macro&&arguments_?.kind==='group') {
          calls.push({writtenPath:path.path,macro,operands:split(arguments_.children),span:{start:nodes[at].span.start,end:arguments_.span.end},lexicalScope:scope,ownerResolved:false,effectsVerified:false,operandBoundariesVerified:false});
          at=path.end-1;
        }
      }
      if(nodes[at]?.kind==='group')nested.push({delimiter:nodes[at].delimiter,span:nodes[at].span,flow:visit(nodes[at].children,[...scope,nodes[at].span.start])});
    }
    return {calls,bindings,nested};
  }
  return visit(group.children,[group.span.start]);
}
export function compileFormatCallbackDataflow(proof,sourcePath,functionName) {
  const pin=formatSourceStageInput(proof,sourcePath),meta=compileFormatCompilerSourceMeta(proof,sourcePath),matches=meta.functions.filter(fn=>fn.name===functionName);
  if(matches.length!==1)throw new TypeError('Original builtin callback is absent or ambiguous');const fn=matches[0],bodyTree=functionTrees(pin,fn),items=sourceItems(pin.source).filter(item=>!item.comment&&item.start<=fn.span.start&&item.end>=fn.span.end);
  if(items.length!==1)throw new TypeError('Original callback enclosing declaration is ambiguous');const item=items[0],enclosingOriginalItem={term:item.term,name:item.name,span:{start:item.start,end:item.end},sha256:hash(pin.source.slice(item.start,item.end)),tokens:item.tokens};
  return issue({schema:'original-format-builtin-dataflow-v1',sourcePath,sourceSha256:pin.sourceSha256,function:fn,enclosingOriginalItem,bodyTree,flow:syntaxFlow(bodyTree),sourceSpanIntegrityVerified:true,semanticIRChecked:false,executable:false,...limits},{proof,pin,fn,bodyTree});
}
export const isFormatCallbackDataflow=value=>states.has(value)&&value.schema==='original-format-builtin-dataflow-v1';
export function compileFormatCallbackForwarder(dataflow) {
  const state=states.get(dataflow);if(!state||!isFormatCallbackDataflow(dataflow))throw new TypeError('Callback forwarding requires private original source dataflow');
  const {pin,fn,bodyTree}=state,signature=originalMacroTrees(pin.source.slice(fn.span.start,fn.bodySpan.start)),parameters=signature.find(node=>node.delimiter==='(');
  if(!parameters)throw new TypeError('Original callback parameter group is absent');
  const params=split(parameters.children).map(part=>{if(!identifier(part[0])||word(part[1])!==':')throw new TypeError('Callback binder is outside the simple source forwarding grammar');return word(part[0]);});
  if(new Set(params).size!==params.length)throw new TypeError('Original callback parameters are ambiguous');
  const nodes=bodyTree.children,path=pathAt(nodes,0);
  if(!path||nodes[path.end]?.delimiter!=='('||path.end+1!==nodes.length)throw new TypeError('Original callback is not a single tail forwarding call');
  const args=split(nodes[path.end].children).map(part=>{
    if(part.length===1&&params.includes(word(part[0])))return {kind:'parameter',index:params.indexOf(word(part[0])),span:span(part)};
    if(part.length===1&&['true','false'].includes(word(part[0])))return {kind:'boolean',value:word(part[0])==='true',span:span(part)};
    throw new TypeError('Original callback forwarding operand remains unproved');
  });
  return issue({schema:'original-format-callback-forwarder-v1',sourcePath:dataflow.sourcePath,sourceSha256:dataflow.sourceSha256,functionName:fn.name,functionSpan:fn.span,functionSha256:fn.sha256,bodySha256:fn.bodySha256,parameters:params,callPath:path.path,arguments:args,sourceTailForwardingVerified:true,calleeOwnerResolved:false,executable:false,...limits},{dataflow,params,path,args});
}
function opaqueOperand(value) {
  let cells=0;
  function copy(node,depth=0) {
    if(++cells>16000||depth>32)throw new RangeError('Symbolic source operand budget');
    if(node===null||typeof node==='string'||typeof node==='boolean')return node;
    if(typeof node==='number'&&Number.isFinite(node))return node;
    if(!node||typeof node!=='object'||!(Array.isArray(node)?Object.getPrototypeOf(node)===Array.prototype:[Object.prototype,null].includes(Object.getPrototypeOf(node))))throw new TypeError('Symbolic source operands require plain serializable data');
    const descriptors=Object.getOwnPropertyDescriptors(node);if(Object.getOwnPropertySymbols(node).length)throw new TypeError('Symbolic source operand symbols remain unsupported');
    const array=Array.isArray(node),result=array?[]:{},length=array?descriptors.length.value:0;let entries=0;
    for(const [key,descriptor] of Object.entries(descriptors)) {
      if(array&&key==='length')continue;
      if(!Object.hasOwn(descriptor,'value')||!descriptor.enumerable||key==='toJSON'||key==='__proto__'||array&&(!/^(?:0|[1-9][0-9]*)$/u.test(key)||!Number.isSafeInteger(Number(key))||Number(key)>=length))throw new TypeError('Symbolic source operands cannot contain accessors or serialization callbacks');
      Object.defineProperty(result,key,{value:copy(descriptor.value,depth+1),enumerable:true,writable:true,configurable:true});entries++;
    }
    if(array&&(entries!==length||result.length!==length))throw new TypeError('Sparse symbolic source operand arrays remain unsupported');return result;
  }
  return copy(value);
}
// This substitutes opaque source operands into actual source IR; it cannot run
// effects, interpret AST-builder objects or authorize a same-spelled callee.
export function applyFormatCallbackForwarder(forwarder,inputs) {
  const state=states.get(forwarder);if(!state||forwarder.schema!=='original-format-callback-forwarder-v1')throw new TypeError('Unsealed builtin callback source forwarder');
  if(!Array.isArray(inputs)||inputs.length!==state.params.length||inputs.some(input=>!input||typeof input!=='object'||Array.isArray(input)))throw new TypeError('Original source forwarding input arity/domain mismatch');
  const args=state.args.map(arg=>arg.kind==='parameter'?{kind:'opaque-input',parameterIndex:arg.index,value:opaqueOperand(inputs[arg.index])}:{kind:'boolean',value:arg.value});
  // Public operands have no authority even if they contain optimistic flags.
  return freezeMacroTree({schema:'symbolic-original-format-callback-call-v1',callPath:state.path.path,arguments:JSON.parse(JSON.stringify(args)),sourceSpan:forwarder.functionSpan,calleeOwnerResolved:false,executable:false,...limits});
}
export function compileBuiltinRegistrationDataflow(proof,sourcePath) {
  const pin=formatSourceStageInput(proof,sourcePath),meta=compileFormatCompilerSourceMeta(proof,sourcePath),rows=[],functions=[];
  for(const fn of meta.functions) {
    const body=functionTrees(pin,fn),definitions=new Map();
    for(let at=0;at<body.children.length;at++) {
      const nodes=body.children;
      if(word(nodes[at])!=='macro'||!identifier(nodes[at+1])||nodes[at+2]?.delimiter!=='('||nodes[at+3]?.delimiter!=='{')continue;
      const name=word(nodes[at+1]);if(definitions.has(name))throw new TypeError('Ambiguous original registration macro');
      definitions.set(name,{name,matcher:nodes[at+2],body:nodes[at+3],span:span(nodes.slice(at,at+4)),sourceExpansionVerified:false});at+=3;
    }
    const enclosingFunctionIndex=functions.length,definitionsList=[...definitions.values()];functions.push({function:fn,bodyTree:body,flow:syntaxFlow(body),definitions:definitionsList});
    for(let at=0;at<body.children.length;at++) {
      const nodes=body.children,name=word(nodes[at]),definition=definitions.get(name);
      if(!definition||word(nodes[at+1])!=='!'||nodes[at+2]?.kind!=='group')continue;
      for(const entry of split(nodes[at+2].children)) {
        if(!identifier(entry[0])||word(entry[1])!==':')throw new TypeError('Original registration entry remains outside literal-name/callback syntax');const callback=pathAt(entry,2);
        const simplePath=callback&&callback.end===entry.length;
        rows.push({name:word(entry[0]),callbackPath:simplePath?callback.path:null,callbackTokens:entry.slice(2),callbackSyntaxDiagnostic:simplePath?null:'Original callback expression requires additional source grammar',entrySpan:span(entry),definitionIndex:definitionsList.indexOf(definition),enclosingFunctionIndex,registryOwnerResolved:false});
      }at+=2;
    }
  }
  return issue({schema:'original-builtin-registration-dataflow-v1',sourcePath,sourceSha256:pin.sourceSha256,rows,functions,sourceSpanIntegrityVerified:true,registrationExpansionVerified:false,executable:false,...limits},{proof,pin});
}
export function selectBuiltinRegistrationDataflow(registration,name) {
  if(!states.has(registration)||registration.schema!=='original-builtin-registration-dataflow-v1')throw new TypeError('Unsealed original builtin registration dataflow');const rows=registration.rows.filter(row=>row.name===name);
  if(rows.length!==1)throw new TypeError('Original registered builtin name is absent or ambiguous');return rows[0];
}
