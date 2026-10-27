// Finite additional integer carrier ABI DATA; actual source checks stay separate.
import {PRIMITIVE_BITWISE_TYPES,primitiveBitwiseType} from '../primitive-bitwise-types.mjs';
const rows=PRIMITIVE_BITWISE_TYPES.filter(row=>row.bits!==64);
export const ownedIntegerOptionalPayload=type=>typeof type==='string'&&type.endsWith('-option')?rows.find(row=>type===row.name+'-option')?.name??null:null;
export const ownedIntegerOptionalRustTypes=Object.freeze(Object.fromEntries(rows.map(row=>[row.name+'-option','::std::option::Option<'+row.rust+'>'])));
export const ownedIntegerOptionalTypeScriptTypes=Object.freeze(Object.fromEntries(rows.map(row=>[row.name+'-option',"Readonly<{$:'None'}>|Readonly<{$:'Some';field0:bigint}>" ])));
export const ownedIntegerOptionalWitness=type=>{const payload=ownedIntegerOptionalPayload(type);return payload?'router_integer_'+payload+'_checked_add':null;};
export function ownedRustIntegerOptionalType(text){const match=typeof text==='string'&&/^::std::option::Option<(::core::primitive::[iu](?:8|16|32|128))>$/u.exec(text),row=match&&primitiveBitwiseType(match[1].slice('::core::primitive::'.length));return row&&row.bits!==64?row.name+'-option':null;}
