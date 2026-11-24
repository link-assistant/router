// Bounded original callback syntax and pure-expression DATA only. The caller
// rechecks every whole flow and complete actual library/source dependency.
import {httpResourceCallerRustType,httpResourceResultOwnsDisposal} from './http-resource-caller-contracts.mjs';
const fail=message=>{throw new TypeError('Resource pure deadline callback: '+message);};
const captureDomains=new Set(['bool','u64','i64','str','json-ref','json-list-ref','bytes-ref']);
const pureFamilies=new Set(['text','owned-result','json-carrier','integer','primitive-option','json-state','json-macro','json-copy','json-view','json-update','json-parse','json-collection','result-callback','option-callback']);
function settledOwned(type,depth=0){
 if(depth>8||typeof type!=='string')return false;for(const prefix of ['optional:','result:','http-result:','io-result:'])if(type.startsWith(prefix))return settledOwned(type.slice(prefix.length),depth+1);
 return ['unit','bool','u64','i64','text-owned','json','json-list-owned','bytes-owned','option-text'].includes(type);
}
export function observeHttpResourcePureDeadlineArrow(ts,node,{name,moduleNames,tick}){
 tick();if(!ts.isArrowFunction(node)||node.typeParameters?.length||node.modifiers?.length!==1||node.modifiers[0].kind!==ts.SyntaxKind.AsyncKeyword||node.parameters.length!==1)fail('one complete actual async child-cancellation arrow required');const parameter=node.parameters[0];if(!ts.isIdentifier(parameter.name)||parameter.questionToken||parameter.dotDotDotToken||parameter.initializer||parameter.modifiers?.length)fail('one actual required contextual cancellation input required');const id=name(parameter.name.text);if(moduleNames.has(id))fail('child cancellation cannot shadow an actual module binding');
 return {parameters:[{name:id,type:'cancel-owned'}],block:ts.isBlock(node.body),sourceAuthority:false,semanticAuthority:false};
}
export function requireHttpResourcePureDeadlineFlow(flow,{environment,contract,localFunctions,tick,child,cancellable=false}){
 if(!flow||Boolean(flow.lazy)!==Boolean(cancellable)||flow.steps.length||!['value','operation'].includes(flow.tail?.kind)||flow.returnRoots.length||!settledOwned(flow.type)||httpResourceResultOwnsDisposal(flow.type))fail('one complete checked expression and owned non-resource settled result required');httpResourceCallerRustType('result:'+flow.type);const tail=flow.tail.value;let cancellableRow=null;if(cancellable){cancellableRow=tail?.kind==='http-resource-call'&&!tail.local?contract(tail.operation):null;const index=cancellableRow?.args.indexOf('cancel-ref')??-1;if(!cancellableRow||!['router_async_sleep','router_async_send'].includes(cancellableRow.javascriptName)||!cancellableRow.async||!tail.awaited||tail.implicitAwait||index<0||tail.args[index]?.kind!=='borrow'||tail.args[index].name!==child||tail.args[index].sourceType!=='cancel-owned'||tail.type!==cancellableRow.ret)fail('one actual cancellable sleep/send tail must borrow this exact child cancellation');}
 for(const capture of flow.captures){tick();const original=environment.get(capture.name);if(!original||original.mutable||original.moved||original.disposed||!captureDomains.has(original.type)&&!(cancellable&&original.type==='sender-ref')||capture.type!==original.type)fail('every used capture must be a current immutable Copy value or shared immutable input');}
 const skip=new Set(['resourceExits','loopExits','scopeFallthroughs','functionReturns','propagatedErrors','captures']);
 function visit(node,depth=0){
  if(!node||typeof node!=='object')return;tick();if(depth>160)fail('complete pure callback expression depth bound');
  if(node.kind==='http-resource-call'){
   const row=node.local?localFunctions?.get(node.operation):contract(node.operation),originalTail=cancellable&&node===tail&&row?.javascriptName===cancellableRow.javascriptName&&row.rustPath===cancellableRow.rustPath&&row.ret===cancellableRow.ret;if(!originalTail&&(!row||node.awaited||node.implicitAwait||row.async||row.release||row.releasedArguments?.length||!(row.genericIdentity||!row.local&&pureFamilies.has(row.family)||!row.local&&row.javascriptName==='router_cancel_is_set'&&node.args.length===1&&node.args[0].kind==='borrow'&&node.args[0].name===child)))fail('every nested operation must independently satisfy a complete pure settled contract');
  }
  if(node.kind==='function-reference'&&!localFunctions?.get(node.name)?.genericIdentity)fail('named callback needs a complete pure body theorem');
  if(node.kind==='inline-deadline-callback')fail('nested deadline or continuation requires its separate source/effect rule');
  for(const [key,value]of Object.entries(node)){if(skip.has(key))continue;if(Array.isArray(value))for(const item of value)visit(item,depth+1);else if(value&&typeof value==='object')visit(value,depth+1);}
 }visit(flow.tail.value);
 return {type:flow.type,sourceAuthority:false,semanticAuthority:false};
}

// Syntax selects the original one-await lane; the whole checked flow below
// still establishes its actual owner, child input, effects and output domain.
export function httpResourceDeadlineHasAwaitedTail(ts,node,tick){
 let value=node.body;if(ts.isBlock(value)){if(value.statements.length>4096)fail('original complete callback statement bound');const rows=[];for(const statement of value.statements){tick();if(!ts.isEmptyStatement(statement))rows.push(statement);}if(rows.length!==1||!ts.isReturnStatement(rows[0])||!rows[0].expression)return false;value=rows[0].expression;}
 let depth=0;while(ts.isParenthesizedExpression(value)){tick();if(++depth>16)fail('original complete callback grouping bound');value=value.expression;}return ts.isAwaitExpression(value);
}
