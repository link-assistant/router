// One shared source-domain check for ordered local values and tuple call headers.
import {acceptProgramIntegralMetadata} from '../program-numeric-metadata-rules.js';
import {acceptRustOwnedLocalValueType} from './rust-owned-local-state-rules.js';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function ownedLocalType(type){return Boolean(type&&(type.kind!=='fixed'||acceptProgramIntegralMetadata(type.kind,'bits',type.bits,Object.is(type.bits,-0)))&&acceptRustOwnedLocalValueType(type.kind,String(type.bits??''),type.signed===true)&&same(Object.keys(type).sort(),(type.kind==='fixed'?['kind','bits','signed']:['kind']).sort()));}
export function ownedLocalPair(type){return type?.kind==='tuple'&&same(Object.keys(type).sort(),['elements','kind'])&&type.elements?.length===2&&type.elements[0].kind==='string'&&ownedLocalType(type.elements[0])&&type.elements[1].kind==='fixed'&&ownedLocalType(type.elements[1]);}
export function ownedLocalPosition(position){return ownedLocalType(position.type)&&position.wrappers.length===0&&position.lifetimes.length===0&&position.owner.arguments.length===0&&(position.type.kind==='string'?position.owner.kind==='library'&&position.owner.path.join('::')==='std::string::String':position.owner.kind==='primitive'&&position.owner.path.join('::')===(position.type.kind==='fixed'?'i32':'bool'));}
