// Original Vec::remove source ordering, not a JS array mutation implementation.
// Pointer/allocator/Drop, receiver ownership and bounds remain obligations.
import {createHash} from 'node:crypto';
import {splitBuiltinCallerSyntax} from './builtin-ast-caller-environments.mjs';
import {builtinAstOriginal,originalAstFunction,originalAstDefinition,assertOriginalAstFunction} from './builtin-derive-ast-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const plans=new WeakMap(),source='library/alloc/src/vec/mod.rs';
const span=nodes=>({start:nodes[0].span.start,end:nodes.at(-1).span.end});
const reference=value=>({source:value.source,sourceSha256:value.sourceSha256,span:value.span,digest:value.digest,syntaxSha256:value.syntaxSha256});
export function originalBuiltinFunctionDataflow(profile,fragment){
  assertOriginalAstFunction(profile,fragment);if(fragment.schema!=='original-ast-function-meta-v1')throw new TypeError('Dataflow requires actual original function syntax');
  let cells=0;const origin=nodes=>({source:fragment.source,sourceSha256:fragment.sourceSha256,span:span(nodes),syntax:nodes});
  const ident=node=>node?.kind==='token'&&/^[_\p{L}][_\p{L}\p{N}]*$/u.test(node.text);
  function parameterFrame(nodes){
    const fn=nodes.findIndex(value=>value.text==='fn'),args=nodes.slice(fn+2).find(value=>value.delimiter==='('),frame=new Map();
    if(!args)throw new TypeError('Original dataflow source parameters missing');
    for(const row of splitBuiltinCallerSyntax(args.children)){
      const colon=row.findIndex(value=>value.text===':'),binding=colon<0?row:row.slice(0,colon),names=binding.filter(ident).filter(value=>!['mut','ref'].includes(value.text));
      if(names.length!==1)throw new TypeError('Original dataflow parameter pattern remains open');
      frame.set(names[0].text,{id:fragment.digest+':'+row[0].span.start,name:names[0].text,typeSyntax:colon<0?[]:row.slice(colon+1),...origin(row)});
    }
    return frame;
  }
  function expression(nodes,frame,depth=0){
    if(++cells>16000||depth>64)throw new TypeError('Original dataflow expression budget exceeded');
    if(!nodes.length)throw new TypeError('Original dataflow does not replace missing expressions');
    const source=origin(nodes);
    if(nodes.length===1&&ident(nodes[0]))return frame.has(nodes[0].text)?{tag:'source-dataflow-slot',binding:frame.get(nodes[0].text),...source}:{tag:'unresolved-source-dataflow-name',...source};
    if(nodes.length===1&&nodes[0].type==='number')return {tag:'source-dataflow-number',spelling:nodes[0].text,...source};
    for(const operators of [['>=','<=','==','!=','>','<'],['+','-']]){
      const at=nodes.findLastIndex(value=>operators.includes(value.text));
      if(at>0&&at<nodes.length-1)return {tag:'source-dataflow-binary',operator:nodes[at].text,left:expression(nodes.slice(0,at),frame,depth+1),right:expression(nodes.slice(at+1),frame,depth+1),...source,domainEstablished:false};
    }
    const tail=nodes.at(-1);
    if(tail.delimiter==='('){
      const head=nodes.slice(0,-1),args=splitBuiltinCallerSyntax(tail.children).map(value=>expression(value,frame,depth+1));
      if(head.length>=3&&head.at(-2).text==='.'&&ident(head.at(-1)))return {tag:'source-dataflow-method',receiver:expression(head.slice(0,-2),frame,depth+1),method:head.at(-1).text,args,...source,ownerEstablished:false};
      if(head.every((value,at)=>at%2===0?ident(value):value.text==='::'))return {tag:'source-dataflow-call',path:head.filter(value=>value.text!=='::').map(value=>value.text),args,...source,ownerEstablished:false};
    }
    return {tag:'unresolved-source-dataflow-expression',...source};
  }
  function block(nodes,depth=0,frame=new Map()){
    if(depth>64)throw new TypeError('Original dataflow depth budget exceeded');
    const statements=[];let at=0;
    while(at<nodes.length){
      if(++cells>16000)throw new TypeError('Original dataflow cell budget exceeded');
      const begin=at;
      while(nodes[at]?.text==='#'&&nodes[at+1]?.delimiter==='[')at+=2;
      if(nodes[at]?.text==='fn'){
        const name=nodes[at+1]?.text;let end=at+2;while(end<nodes.length&&nodes[end].delimiter!=='{'&&nodes[end].text!==';')end++;
        if(nodes[end]?.delimiter!=='{')throw new TypeError('Original local function body boundary remains open');
        statements.push({tag:'original-local-function-definition',name,...origin(nodes.slice(begin,end+1)),body:block(nodes[end].children,depth+1,parameterFrame(nodes.slice(at,end+1))),enclosingCaptureSlots:[],evaluationEstablished:false});at=end+1;continue;
      }
      if(nodes[at]?.text==='if'){
        let body=at+1;while(body<nodes.length&&nodes[body].delimiter!=='{')body++;
        if(!nodes[body])throw new TypeError('Original dataflow branch body missing');
        const condition=expression(nodes.slice(at+1,body),frame,depth+1),thenBody=block(nodes[body].children,depth+1,new Map(frame));let end=body+1,elseBody=null;
        if(nodes[end]?.text==='else'){
          if(nodes[end+1]?.delimiter!=='{')throw new TypeError('Original dataflow else-if selection remains open');elseBody=block(nodes[end+1].children,depth+1,new Map(frame));end+=2;
        }
        statements.push({tag:'original-source-branch',condition,thenBody,elseBody,...origin(nodes.slice(begin,end)),selectionEstablished:false});at=end;continue;
      }
      if(nodes[at]?.text==='unsafe'&&nodes[at+1]?.delimiter==='{'){
        statements.push({tag:'original-unsafe-source-block',body:block(nodes[at+1].children,depth+1,new Map(frame)),...origin(nodes.slice(begin,at+2)),pointerBehaviorEstablished:false});at+=2;continue;
      }
      if(nodes[at]?.delimiter==='{'){
        statements.push({tag:'original-lexical-source-block',body:block(nodes[at].children,depth+1,new Map(frame)),...origin(nodes.slice(begin,at+1))});at++;continue;
      }
      let end=at;while(end<nodes.length&&nodes[end].text!==';')end++;
      const row=nodes.slice(at,end);if(!row.length){at=end+1;continue;}
      const equal=row.findIndex(value=>value.text==='='),tag=row[0].text==='let'?'original-source-local':equal===1?'original-source-assignment':end===nodes.length?'original-source-tail':'original-source-expression';
      const value={tag,...origin(nodes.slice(begin,end)),syntaxOrder:statements.length,evaluationEstablished:false};
      if(tag==='original-source-local'){
        value.bindingSyntax=equal<0?row.slice(1):row.slice(1,equal);value.initializerSyntax=equal<0?null:row.slice(equal+1);value.uninitialized=equal<0;
        const names=value.bindingSyntax.filter(ident).filter(node=>!['mut','ref'].includes(node.text));
        if(names.length!==1)throw new TypeError('Original dataflow local pattern remains open');
        if(!value.uninitialized)value.initializer=expression(value.initializerSyntax,frame,depth+1);
        value.binding={id:fragment.digest+':'+row[0].span.start,name:names[0].text,...origin(value.bindingSyntax)};frame.set(names[0].text,value.binding);
      }else if(tag==='original-source-assignment'){
        value.target=expression(row.slice(0,equal),frame,depth+1);value.value=expression(row.slice(equal+1),frame,depth+1);
      }else value.value=expression(row,frame,depth+1);
      statements.push(value);at=end+1;
    }
    return {tag:'original-source-sequence',statements,evaluationEstablished:false};
  }
  const body=fragment.syntax.at(-1);if(body?.delimiter!=='{')throw new TypeError('Original dataflow function body missing');
  const tree=block(body.children,0,parameterFrame(fragment.syntax)),evidence={schema:'original-function-dataflow-source-v1',fragment:reference(fragment),tree,generatedImplBehavior:false,pointerBehaviorEstablished:false};
  const encoded=JSON.stringify(evidence);if(Buffer.byteLength(encoded)>524288)throw new TypeError('Original dataflow metadata byte budget exceeded');return freeze({...JSON.parse(encoded),digest:hash(encoded)});
}
export function createBuiltinVecRemoveSourcePlan(profile){
  const original=builtinAstOriginal(profile,source),remove=originalAstFunction(profile,source,'remove'),definition=originalAstDefinition(profile,source,'struct','Vec');
  const removal=originalBuiltinFunctionDataflow(profile,remove),calls=new Map();let visited=0;
  function methods(value,depth=0){
    if(++visited>16000||depth>64)throw new TypeError('Vec remove dependency traversal budget exceeded');if(!value||typeof value!=='object')return;
    if(value.tag==='source-dataflow-method'&&value.receiver.tag==='source-dataflow-slot'&&value.receiver.binding.name==='self'){
      const sites=calls.get(value.method)??[];sites.push({source:value.source,sourceSha256:value.sourceSha256,span:value.span});calls.set(value.method,sites);
    }
    for(const [key,child]of Object.entries(value))if(!['syntax','bindingSyntax','initializerSyntax','typeSyntax'].includes(key))if(Array.isArray(child))child.forEach(value=>methods(value,depth+1));else methods(child,depth+1);
  }
  methods(removal.tree);
  const dependencies=[...calls].map(([name,sites])=>{
    const fragment=originalAstFunction(profile,source,name);return {name,sites,source:reference(fragment),plan:originalBuiltinFunctionDataflow(profile,fragment)};
  });
  const evidence={schema:'original-standard-vec-remove-source-plan-v1',profileDigest:profile.digest,source,sourceSha256:original.sha256,receiverSchema:reference(definition),remove:removal,dependencies,
    sourceOrderEstablished:true,runtimeEvaluationEstablished:false,sourceMethodOwnershipEstablished:false,pointerBehaviorEstablished:false,allocationPhaseBehavior:false,dropBehaviorEstablished:false,selectedOwnerBangComplete:false,
    obligations:['caller receiver must independently resolve actual standard Vec<T,A>','argument evaluation, initialized length and index bounds require actual caller value evidence','ptr::read/copy/add and RawVec buffer identity remain transitive original source requirements','set_len and temporary duplicate memory do not become JS array effects','allocator/Clone/Drop and panic feature owners remain open']};
  const encoded=JSON.stringify(evidence);if(Buffer.byteLength(encoded)>524288)throw new TypeError('Vec remove source plan metadata byte budget exceeded');const copy=JSON.parse(encoded);if(JSON.stringify(copy)!==encoded)throw new TypeError('Vec remove source plan roundtrip changed');
  const plan=freeze({...copy,digest:hash(encoded)});plans.set(plan,{profile});return plan;
}
export function assertBuiltinVecRemoveSourcePlan(value,profile){if(plans.get(value)?.profile!==profile)throw new TypeError('Vec remove plan requires its original private source profile');return value;}
export const isBuiltinVecRemoveSourcePlan=value=>!!value&&plans.has(value);
