// Ordinary helper call adapters only. Actual native import/function symbols,
// leading shared entry guards, complete source/private graph reissue and the
// caller's linear scope remain mandatory. No source/owner verdict is cached.
import {ownedPrimitiveVectorSharedElement} from './owned-text-vector-domains.mjs';
const fail=message=>{throw new TypeError('Primitive vector helper borrow: '+message);};
export function primitiveVectorLocalCallAccepts(actual,wanted){const shared=ownedPrimitiveVectorSharedElement(wanted);return !!shared&&(actual===wanted||actual==='vec:'+shared);}
export function checkPrimitiveVectorLocalCallArguments(node,callee,scope,depth,{expression,insideCallback}){
 if(node.arguments.length!==callee.params.length)fail('actual complete helper argument count differs');const borrowed=[],args=[];
 for(let index=0;index<node.arguments.length;index++){const parameter=callee.params[index].type,shared=ownedPrimitiveVectorSharedElement(parameter),value=expression(node.arguments[index],scope,depth+1,parameter==='json-option-input'||!!shared,parameter);
  if(shared&&value.type==='vec:'+shared){if(insideCallback||value.root!==null)fail('owned helper borrow requires an actual local or fresh owned temporary outside callbacks');if(value.kind==='variable'){const entry=scope.get(value.name);if(!entry||entry.type!==value.type||entry.moved)fail('actual live owned local needed for shared helper argument');borrowed.push({name:value.name,entry});}}
  args.push(value);
 }
 // Every earlier borrowed root must still be the same available binding after
 // all later arguments have run. Expressions cannot reassign caller locals.
 for(const row of borrowed)if(scope.get(row.name)!==row.entry||row.entry.moved)fail('later helper argument moved an earlier shared Vec root');return args;
}
export function emitPrimitiveVectorLocalCall(value,{rust,expr,rustName}){
 const arguments_=value.args.map((argument,index)=>{
  if(!rust)return expr(argument);const parameter=value.parameters[index],shared=ownedPrimitiveVectorSharedElement(parameter);if(shared&&argument.type==='vec:'+shared)return '&('+expr(argument)+')';const borrow=parameter==='json-ref'&&argument.type==='json'||parameter==='json-list-ref'&&argument.type==='json-list-owned'||parameter==='str'&&argument.type==='text-owned';return borrow?(argument.kind==='variable'?expr(argument,true):'&'+expr(argument)):expr(argument);
 });return (rust?rustName(value.name):value.javascript)+'('+arguments_.join(', ')+')';
}
