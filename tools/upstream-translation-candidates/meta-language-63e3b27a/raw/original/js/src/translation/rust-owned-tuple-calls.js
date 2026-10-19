// Private JavaScript-first source interpretation; no native parity claim.
import {readRuntimeProjectData} from '../project-data-loader.js';
import {sameType} from './types.js';
import {acceptRustOwnedTupleCallInitializer} from './rust-owned-tuple-call-rules.js';
import {ownedLocalPair} from './rust-owned-local-domains.js';
export const RUST_OWNED_TUPLE_CALL_POLICY=readRuntimeProjectData(new URL('./data/rust-owned-tuple-calls.lino',import.meta.url));
const policy=RUST_OWNED_TUPLE_CALL_POLICY;
export function ownedTupleCallPairPosition(position){
 return ownedLocalPair(position.type)&&position.wrappers.length===0&&position.lifetimes.length===0&&position.owner.kind==='tuple'&&position.owner.path.length===0&&position.owner.arguments.length===2
  &&position.owner.arguments[0].kind==='library'&&position.owner.arguments[0].path.join('::')==='std::string::String'&&position.owner.arguments[0].arguments.length===0
  &&position.owner.arguments[1].kind==='primitive'&&position.owner.arguments[1].path.join('::')==='i32'&&position.owner.arguments[1].arguments.length===0;
}
export function ownedTupleCallParameters(parameters){return parameters.length===2&&parameters[0].type.kind==='string'&&parameters[1].type.kind==='fixed'&&parameters[1].type.bits===policy.helper.integerBits&&parameters[1].type.signed===policy.helper.integerSigned;}
export function checkOwnedTupleCallTarget(program,entry,node,fact,fail){
 const target=program.declarations.get(node.fn);
 const targetMatch=Boolean(target&&target!==entry&&target.k==='fn'&&!target.recursive&&target.sourceLocalState?.model===policy.model&&target.ret.kind==='tuple'&&target.body.k==='tuple'&&target.sourceLocalState.initializers.length===0&&ownedTupleCallParameters(target.params));
 const argumentsMatch=Boolean(targetMatch&&node.args.length===target.params.length&&node.args.every((arg,index)=>sameType(arg.type,target.params[index].type))&&sameType(node.type,target.ret));
 const fieldsMatch=Boolean(fact&&fact.target===node.fn&&JSON.stringify(fact.fieldModes)===JSON.stringify(policy.fieldModes));
 if(!acceptRustOwnedTupleCallInitializer(targetMatch,argumentsMatch,fieldsMatch))fail('the tuple call must retain its actual closed declaration target, argument domains and ordered field modes');
}
