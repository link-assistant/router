// Callback control is a language boundary, never a source/type/owner permit.
// This leaf deliberately imports no parser/checker module in the owned13 graph.
import {types} from 'node:util';
import {sameType} from '../checked-types.mjs';
import {coerce} from '../checked-coercions.mjs';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {originalDataFreezeIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';

const initial=originalDataFreezeIntrinsicsUnchanged();
const descriptor=initial?Object.getOwnPropertyDescriptor:null,keys=initial?Reflect.ownKeys:null;
const own=initial?Object.hasOwn:null,isProxy=initial?types.isProxy:null;

function boundary(node){
  if(!initial||!originalDataFreezeIntrinsicsUnchanged())throw unsupported('callback control host','requires unchanged native descriptor operations',node?.span);
  const pending=[{value:node,depth:0}];let cells=0,returns=0,nested=0;
  while(pending.length){
    const {value,depth}=pending.pop();if(value===null||typeof value!=='object')continue;
    if(++cells>200000||depth>256)throw unsupported('callback control bound','requires a bounded complete callback body',node.span);
    if(isProxy(value))throw unsupported('callback control syntax','requires own source syntax',node.span);
    const names=keys(value);if(names.includes('stack'))throw unsupported('callback control syntax','lazy descriptor objects are not source syntax',node.span);
    const fields=[];let kind;
    for(let at=0;at<names.length;at++){
      const field=descriptor(value,names[at]);if(!field||!own(field,'value'))throw unsupported('callback control syntax','requires complete own-data source syntax',node.span);
      fields.push(field);if(names[at]==='k')kind=field.value;
    }
    // A nested callback is checked at its own actual lambda ingress. It must
    // neither donate return values to this result nor inherit this boundary.
    if(kind==='routerLambda'){nested++;continue;}
    if(kind==='routerReturn')returns++;
    if(kind==='routerTry')throw unsupported('callback Option propagation','requires a privately closed original Try/FromResidual owner before local continuation lowering',node.span);
    if(['routerBreak','routerContinue','routerAwait'].includes(kind))throw unsupported('callback control boundary','break, continue and await need separate callback contracts',node.span);
    for(let at=names.length-1;at>=0;at--)if(!['type','span'].includes(names[at])){
      const child=fields[at].value;
      if(child&&typeof child==='object')pending.push({value:child,depth:depth+1});
    }
  }
  if(!returns&&!nested)throw unsupported('callback control boundary','requires an explicit callback-local return',node.span);
  return {returns};
}

/** Check the new explicit-return lane only; ordinary tail callbacks stay exact. */
export function checkCallbackLocalReturn(checker,node,argumentTypes,env,path,expected,context){
  const {returns}=boundary(node.body);
  if(node.params.some(param=>param.pattern))throw unsupported('callback return pattern','patterned callbacks retain their existing separate ownership contract',node.span);
  let inner=new Map(env);
  for(let index=0;index<node.params.length;index++){
    const param=node.params[index],type=argumentTypes[index];
    if(checker.lookup([param.name],path,param.span)?.constant)throw unsupported('callback constant pattern','requires actual checked constant-pattern irrefutability; a source constant cannot become a fresh parameter',param.span);
    if(param.type){
      const declared=checker.resolveType(param.type,path,param.span);
      // Coercion uses the same original exact callback parameter check below;
      // a result context never changes the actual Iterator/Option input Item.
      if(!sameType(type,declared))throw typeError('callback parameter type differs from iterator element',param.span);
      checker.expectedOwnership?.(type,declared,path,param.span);checker.expectedPrimitiveIdentity?.(type,declared,path,param.span);
    }
    inner=checker.bindingEnvironment(inner,param.name,type,false);
  }
  if(!expected&&context?.source==='iterator')expected=checker.iteratorOptionExpected(node.body,inner,path);
  if(returns&&!expected)throw unsupported('callback return result','requires an independently known contextual callback result',node.span);
  inner=checker.callbackEnvironment(inner,expected);
  let body=checker.expr(node.body,inner,path,expected);if(expected)body=coerce(body,expected,checker.language,node.span);
  const result=body.type;
  for(let index=node.params.length-1;index>=0;index--)body={k:'let',name:node.params[index].name,value:{k:'routerLambdaInput',position:index,type:argumentTypes[index]},body,type:result};
  return {k:'routerLambda',binding:body,arity:argumentTypes.length,type:{kind:'routerCallback',result},span:node.span};
}
