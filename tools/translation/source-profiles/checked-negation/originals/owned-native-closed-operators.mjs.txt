// Ordered finite primitive failure observations, DATA only. The actual whole
// source checker, current runtime, CST/meta and native body comparisons remain.
import {ownedNativeTotalOperator,requireOwnedNativeTotalCall} from './owned-native-total-operators.mjs';
import {ownedPrimitiveOperatorCallMetadata} from './owned-primitive-operator-emission.mjs';
import {primitiveFailureFlow} from '../extensions/primitive-failure-flow.mjs';
import {primitiveBitwiseType} from '../primitive-bitwise-types.mjs';
const fail=message=>{throw new TypeError('Ordered primitive source failure: '+message);};
export const ownedNativeClosedOperator=name=>ownedNativeTotalOperator(name)||name==='integerArithmetic';
export function requireOwnedNativeClosedCall(node){
 if(node.kind==='primitive-arithmetic-call'){const {operation}=ownedPrimitiveOperatorCallMetadata(node);if(!['add','sub','mul'].includes(operation.name))fail('division remainder and negation need their separate source failure rules');return node;}
 if(node.kind==='primitive-method-call'&&node.operation==='clamp'){ownedPrimitiveOperatorCallMetadata(node);return node;}
 return requireOwnedNativeTotalCall(node);
}
function eventName(kind,operation,domain){return 'primitive-failure:'+kind+':'+operation+':'+domain;}
export function requestedNativeFailureOperator(node,read,event){
 if(node.kind!=='primitive-arithmetic-call'&&!(node.kind==='primitive-method-call'&&node.operation==='clamp'))return null;
 requireOwnedNativeClosedCall(node);const metadata=ownedPrimitiveOperatorCallMetadata(node),kind=node.kind==='primitive-arithmetic-call'?'arithmetic':'method',operation=(metadata.operation??metadata.method).name;
 return event(eventName(kind,operation,metadata.target.name),node.args.map(read));
}
export function actualNativeFailureOperator(node,read,event){
 const flow=primitiveFailureFlow(node);return flow===null?null:event(eventName(flow.kind,flow.operation,flow.domain),flow.args.map(read));
}
export function nativeFailureEventOperation(name){
 if(typeof name!=='string'||!name.startsWith('primitive-failure:'))return null;
 const [prefix,kind,operation,domain,...extra]=name.split(':'),row=primitiveBitwiseType(domain);if(extra.length||!row||(kind==='arithmetic'?!['add','sub','mul'].includes(operation):kind!=='method'||operation!=='clamp'))fail('exact finite checked operation event required');
 if(prefix!=='primitive-failure')fail('exact failure event required');
 return {failure:true,kind,operation,domain,role:row.name,arity:kind==='arithmetic'?2:3};
}
export function projectNativeFailureCall(descriptor,args,{imported}){
 const current=nativeFailureEventOperation(eventName(descriptor.kind,descriptor.operation,descriptor.domain));if(!current||!Array.isArray(args)||args.length!==current.arity||args.some(value=>typeof value!=='string'))fail('exact complete ordered failure call source required');
 const row=primitiveBitwiseType(current.domain),name=current.kind==='arithmetic'?'integerArithmetic':'primitiveIntegerMethod';return imported(name,'primitive-operator')+'('+args.concat([String(row.bits),String(row.signed),JSON.stringify(current.operation)]).join(', ')+')';
}
