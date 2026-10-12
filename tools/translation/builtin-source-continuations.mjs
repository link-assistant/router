// Original control -> private continuation meta -> bounded projection machine.
// This machine never invokes compiler callbacks or authorizes source owners.
import {createHash} from 'node:crypto';
import {copyMetadata,metadataDigest} from './extensions/source-links.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
import {builtinSourceControlFacts} from './builtin-source-control.mjs';
const programs=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const open={compilerHandlerOwnerResolved:false,sourceSemanticClosureVerified:false,typedCompilerIRChecked:false,rustGrammarValidated:false,executable:false,traitSelectionVerified:false,allocatorEffectsVerified:false,ioEffectsVerified:false,namespaceAuthority:false,runtimeParity:false};
const word=token=>token?.text;
function simpleBinder(tokens) {
  const mutable=word(tokens[0])==='mut',at=mutable?1:0;
  if(tokens.length!==at+1||tokens[at]?.kind!=='token'||tokens[at].type!=='ident'||word(tokens[at])==='_')return null;
  return {name:word(tokens[at]),mutable};
}
function sourceParameters(control) {
  if(!control.function)return [];
  const tokens=control.function.signatureTokens,begin=tokens.findIndex(token=>token.text==='(');
  if(begin<0)throw new TypeError('Original compiler signature lacks its parameter group');
  const rows=[];let start=begin+1,round=1,square=0,angle=0,closed=false;
  for(let at=start;at<tokens.length;at++){
    const text=tokens[at].text;
    if(text===')'&&round===1){if(at>start)rows.push(tokens.slice(start,at));closed=true;break;}
    if(text===','&&round===1&&square===0&&angle===0){if(at===start)throw new TypeError('Original compiler signature has an empty parameter');rows.push(tokens.slice(start,at));start=at+1;continue;}
    if(text==='(')round++;else if(text===')')round--;else if(text==='[')square++;else if(text===']')square--;else if(text==='<')angle++;else if(text==='>')angle--;else if(text==='>>')angle-=2;
    if(round<1||square<0||angle<0)throw new TypeError('Original compiler parameter grouping is unsupported');
  }
  if(!closed||rows.length>64)throw new TypeError('Original compiler parameter grouping exceeds its supported bound');
  const seen=new Set();return rows.map(tokens=>{
    const colon=tokens.findIndex(token=>token.text===':'),head=colon<0?tokens:tokens.slice(0,colon);
    let mutable=false,name;
    if(colon<0&&['self','&self','&mutself'].includes(head.map(word).join(''))){name='self';mutable=head.some(token=>word(token)==='mut');}
    else {const at=word(head[0])==='mut'?1:0;mutable=at===1;if(head.length!==at+1||head[at]?.type!=='ident')throw new TypeError('Original compiler parameter requires its actual simple binding');name=word(head[at]);}
    if(name==='_'||seen.has(name))throw new TypeError('Original compiler parameter bindings are absent or ambiguous');seen.add(name);
    return {name,mutable,originalTokens:tokens,sourceTypeOwnerResolved:false};
  });
}
// Nodes retain all original source operands. Edges describe order, not Rust
// trait/owner proofs. Unknown syntax has an explicit frontier instruction.
export function compileBuiltinControlContinuations(control) {
  const original=builtinSourceControlFacts(control);
  if(!control.controlSyntaxProjected||!control.ir)throw new TypeError('Source continuation compilation requires a completely projected original control body');
  const nodes=[];let scopes=0;
  function node(source,scope,depth=0){
    if(depth>64||nodes.length>=32000)throw new RangeError('Source continuation graph exceeds its finite bound');
    const id=nodes.length,row={id,kind:source.kind,scope,sourceSpan:source.sourceSpan??null};nodes.push(row);
    const child=value=>node(value,scope,depth+1);
    switch(source.kind){
      case 'control-block':row.scope=scopes++;row.statements=source.statements.map(value=>node(value,row.scope,depth+1));row.tail=source.tail?node(source.tail,row.scope,depth+1):null;break;
      case 'let':row.pattern=source.pattern;row.binder=simpleBinder(source.pattern.tokens);row.initializer=child(source.initializer);row.otherwise=source.otherwise?child(source.otherwise):null;row.initializerBeforeBinding=true;break;
      case 'expression-statement':case 'parenthesized':case 'try':row.value=child(source.value);break;
      case 'return':case 'break':case 'continue':row.value=source.value?child(source.value):null;break;
      case 'literal':row.literalKind=source.sourceLiteralKind;row.raw=source.raw;row.originalLiteral=source.sourceLiteral;break;
      case 'written-path':row.path=source.path;break;
      case 'field':row.object=child(source.object);row.name=source.name;break;
      case 'call':row.callee=child(source.callee);row.arguments=source.arguments.map(child);row.argumentOrder='original-left-to-right';break;
      case 'unary':row.operation=source.operation;row.mutable=source.mutable;row.value=child(source.value);break;
      case 'binary':row.operation=source.operation;row.left=child(source.left);row.right=child(source.right);row.rightEvaluation=source.rightEvaluation??'after-left';break;
      case 'if':row.condition=child(source.condition);row.then=child(source.then);row.otherwise=source.otherwise?child(source.otherwise):null;break;
      case 'while':row.condition=child(source.condition);row.body=child(source.body);break;
      case 'loop':row.body=child(source.body);break;
      case 'assign':row.target=child(source.target);row.operation=source.operation;row.value=child(source.value);break;
      case 'tuple':case 'array':row.items=source.items.map(child);row.trailingComma=source.trailingComma??false;break;
      default:row.originalObligation=source;row.requiresOriginalRule=source.kind;
    }
    return id;
  }
  const entry=node(control.ir,scopes),parameters=sourceParameters(control),payload={schema:'original-source-continuation-graph-v1',sourcePath:control.sourcePath??null,sourceSha256:control.sourceSha256,function:control.function??null,parameters,entry,nodes,controlSourceProjected:true,pinnedCompilerFunctionVerified:original.inputKind==='pinned-source-function',callbackFreeProjectionMachine:true,...open};
  const text=JSON.stringify(copyMetadata(payload)),reparsed=JSON.parse(text);
  if(metadataDigest(payload)!==metadataDigest(reparsed))throw new TypeError('Source continuation metadata changed during checked reconstruction');
  const result=freezeMacroTree({...reparsed,privateMetaRoundtrip:true,metaSha256:hash(text)});programs.set(result,Object.freeze({control,original,digest:metadataDigest(result)}));return result;
}
export function builtinControlContinuationFacts(program) {
  const state=programs.get(program);if(!state)throw new TypeError('Source continuation graph is copied, unissued or caller fabricated');
  builtinSourceControlFacts(state.control);
  if(metadataDigest(program)!==state.digest)throw new TypeError('Source continuation graph differs from its private source reconstruction');return state;
}
const unit=()=>({kind:'projection-unit'});
const normal=value=>({status:'value',value});
// No resolver, callback registry, source scope flags or owner overrides are
// accepted. Inputs are inert metadata; a primitive projection is not a Rust
// compiler object or a certified argument to a generated formatting trait.
export function projectBuiltinControlContinuations(program,inputs=[]) {
  builtinControlContinuationFacts(program);const values=copyMetadata(inputs);
  if(!Array.isArray(values)||values.length!==program.parameters.length)throw new TypeError('Original source continuation input arity differs from its original signature');
  let serialized;try{serialized=JSON.stringify(values);}catch{throw new TypeError('Source continuation inputs require inert serializable metadata');}
  if(metadataDigest(values)!==metadataDigest(JSON.parse(serialized)))throw new TypeError('Source continuation input metadata changes under serialization');
  const env=new Map(program.parameters.map((param,index)=>[param.name,{value:values[index],mutable:param.mutable}])),trace=[];let remaining=32000;
  const frontier=(node,obligation,details={})=>({status:'frontier',obligation,node:node.id,sourceSpan:node.sourceSpan,...details});
  function boolean(value,node){if(typeof value!=='boolean')return frontier(node,'actual-boolean-domain',{value});return normal(value);}
  function value(id,env,loopDepth=0){
    if(--remaining<0)throw new RangeError('Original source continuation execution exhausted its finite step budget');
    const n=program.nodes[id];if(!n||n.id!==id)throw new TypeError('Source continuation graph contains an invalid private edge');trace.push({node:id,kind:n.kind,sourceSpan:n.sourceSpan});
    const child=edge=>value(edge,env,loopDepth),get=edge=>program.nodes[edge];
    switch(n.kind){
      case 'control-block':{
        const inner=new Map(env);for(const statement of n.statements){const result=value(statement,inner,loopDepth);if(result.status!=='value')return result;}
        return n.tail===null?normal(unit()):value(n.tail,inner,loopDepth);
      }
      case 'literal':return n.literalKind==='bool'?normal(n.raw==='true'):frontier(n,'original-literal-decoder',{literal:n.originalLiteral});
      case 'written-path':return n.path.length===1&&env.has(n.path[0])?normal(env.get(n.path[0]).value):frontier(n,'original-source-name-owner',{path:n.path});
      case 'parenthesized':return child(n.value);
      case 'expression-statement':{const result=child(n.value);return result.status==='value'?normal(unit()):result;}
      case 'let':{
        const initializer=child(n.initializer);if(initializer.status!=='value')return initializer;
        if(!n.binder||n.otherwise!==null)return frontier(n,'original-source-binding-pattern',{pattern:n.pattern,initializer:initializer.value});
        env.set(n.binder.name,{value:initializer.value,mutable:n.binder.mutable});return normal(unit());
      }
      case 'unary':{
        const result=child(n.value);if(result.status!=='value')return result;
        if(n.operation!=='!')return frontier(n,'original-unary-owner',{operation:n.operation,value:result.value});
        const checked=boolean(result.value,n);return checked.status==='value'?normal(!checked.value):checked;
      }
      case 'binary':{
        const left=child(n.left);if(left.status!=='value')return left;
        if(!['&&','||'].includes(n.operation)){
          const right=child(n.right);return right.status==='value'?frontier(n,'original-binary-owner',{operation:n.operation,left:left.value,right:right.value}):right;
        }
        const checked=boolean(left.value,n);if(checked.status!=='value')return checked;
        if(n.operation==='&&'&&!checked.value||n.operation==='||'&&checked.value)return normal(checked.value);
        const right=child(n.right);return right.status==='value'?boolean(right.value,n):right;
      }
      case 'if':{
        const condition=child(n.condition);if(condition.status!=='value')return condition;
        const checked=boolean(condition.value,n);if(checked.status!=='value')return checked;
        return checked.value?child(n.then):n.otherwise===null?normal(unit()):child(n.otherwise);
      }
      case 'return':case 'break':case 'continue':{
        if(n.kind!=='return'&&loopDepth===0)return frontier(n,'original-loop-exit-scope');
        const result=n.value===null?normal(unit()):child(n.value);return result.status==='value'?{status:n.kind,value:result.value}:result;
      }
      case 'while':case 'loop':for(;;){
        if(n.kind==='while'){
          const condition=child(n.condition);if(condition.status!=='value')return condition;
          const checked=boolean(condition.value,n);if(checked.status!=='value')return checked;if(!checked.value)return normal(unit());
        }
        const body=value(n.body,env,loopDepth+1);
        if(body.status==='break')return n.kind==='while'&&body.value?.kind!=='projection-unit'?frontier(n,'original-while-valued-break-rule'):normal(body.value);
        if(!['value','continue'].includes(body.status))return body;
      }
      case 'assign':{
        const target=get(n.target);
        if(n.operation!=='='||target.kind!=='written-path'||target.path.length!==1||!env.get(target.path[0])?.mutable)return frontier(n,'original-place-or-compound-owner',{targetSourceNode:n.target,operation:n.operation});
        const result=child(n.value);if(result.status!=='value')return result;
        if(typeof result.value!=='boolean'||typeof env.get(target.path[0]).value!=='boolean')return frontier(n,'actual-local-boolean-domain');
        env.get(target.path[0]).value=result.value;return normal(unit());
      }
      case 'call':{
        const callee=get(n.callee);let address;
        if(callee.kind==='written-path')address={kind:'written-source-callee',path:callee.path};
        else if(callee.kind==='field'){
          const receiver=value(callee.object,env,loopDepth);if(receiver.status!=='value')return receiver;
          address={kind:'source-member-callee',receiver:receiver.value,name:callee.name};
        }else return frontier(n,'original-callee-expression',{calleeSourceNode:n.callee});
        // Lexical values can hide module callees: never turn a bound name into
        // a same-spelled external call, even though no callbacks run here.
        if(callee.kind==='written-path'&&callee.path.length===1&&env.has(callee.path[0]))address={kind:'source-local-callee',name:callee.path[0],value:env.get(callee.path[0]).value};
        const args=[];for(const argument of n.arguments){const result=child(argument);if(result.status!=='value')return result;args.push(result.value);}
        return frontier(n,'original-callee-owner-and-effects',{callee:address,arguments:args});
      }
      case 'field':{const receiver=child(n.object);return receiver.status==='value'?frontier(n,'original-field-owner',{receiver:receiver.value,name:n.name}):receiver;}
      case 'try':{const result=child(n.value);return result.status==='value'?frontier(n,'original-try-residual-owner',{value:result.value}):result;}
      case 'tuple':return n.items.length===0?normal(unit()):frontier(n,'original-tuple-layout-and-ownership',{items:n.items});
      default:return frontier(n,'original-control-or-layout-rule',{kind:n.kind,source:n.originalObligation??null});
    }
  }
  const projected=value(program.entry,env),result=projected.status==='return'?normal(projected.value):projected;
  return freezeMacroTree({schema:'original-source-continuation-projection-v1',result,trace,steps:32000-remaining,sourceFunction:program.function,sourceSha256:program.sourceSha256,callbackInvocations:0,originalFunctionBodyRetained:true,projectionOnly:true,...open});
}
