// A whole checked identity-From function has no Rust arithmetic failure path.
// Its exported host boundary validates one complete Rust value domain. Other
// fixed argument/overflow guards keep the portable RangeError contract.
import {types} from 'node:util';
import {sameType} from '../checked-types.mjs';
import {metadataDigest} from './source-links.mjs';
import {renameFunction} from '../vendor/meta-language/translation/ir.js';
import {requirePrimitiveIdentityFromEvidence} from './primitive-identity-from-source.mjs';
import {requirePrimitiveBoolFromScope} from './primitive-bool-from-source.mjs';
const active=new WeakMap();
const fail=message=>{throw new TypeError('Original primitive identity boundary: '+message);};
export function prepareOriginalPrimitiveIdentityBoundary(emitter,entry){
 if(entry.body?.k!=='routerPrimitiveIdentityFrom'||entry.body.type?.kind!=='fixed'||entry.params?.length!==1||entry.body.value?.k!=='var'||entry.body.value.name!==entry.params[0].name)return null;
 if(!emitter||types.isProxy(emitter)||!emitter.state||typeof emitter.state.ident!=='function')fail('actual emission state required');
 const node=entry.body,param=entry.params[0];requirePrimitiveIdentityFromEvidence(node.sourcePrimitiveIdentityFromBody,node.value.type);requirePrimitiveBoolFromScope(node.sourceCallerTraitScope,node.type);
 if(node.constEligible!==false||!sameType(param.type,node.type)||!sameType(node.value.type,node.type)||param.type.rustPrimitiveName!==node.type.rustPrimitiveName||node.value.type.rustPrimitiveName!==node.type.rustPrimitiveName)fail('one exact checked by-value fixed identity required');
 const renamed=renameFunction(entry,emitter.state.ident,emitter.state.localReserved()),selected=renamed.params[0],prior=active.get(emitter);active.set(emitter,{name:selected.name,typeDigest:metadataDigest(selected.type),node});
 return ()=>{if(prior)active.set(emitter,prior);else active.delete(emitter);};
}
export function originalPrimitiveIdentityParameterGuard(emitter,param){
 const selected=active.get(emitter);if(!selected)return null;if(param.name!==selected.name||metadataDigest(param.type)!==selected.typeDigest)fail('actual renamed checked parameter differs');
 requirePrimitiveIdentityFromEvidence(selected.node.sourcePrimitiveIdentityFromBody,selected.node.value.type);requirePrimitiveBoolFromScope(selected.node.sourceCallerTraitScope,selected.node.type);
 return [emitter.valueGuard(param.name,param.type)+';'];
}
