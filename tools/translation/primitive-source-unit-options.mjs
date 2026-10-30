// Explicit source-unit option DATA. Only private contexts can admit callers.
import {types} from 'node:util';
import {primitiveOperatorRuntimeSources} from './primitive-operator-runtime-sources.mjs';
const profiles=new Set(['owned-state','owned-outcome','owned-cancellation','owned-project']);
export function sourceUnitPrimitiveOperators(unit){
 if(!unit||typeof unit!=='object'||types.isProxy(unit))throw new TypeError('Ordinary source unit required');const field=Object.getOwnPropertyDescriptor(unit,'primitiveOperators');if(!field)return false;if(!Object.hasOwn(field,'value')||field.value!==true)throw new TypeError('Primitive source-unit option must be explicit true DATA');const profile=Object.getOwnPropertyDescriptor(unit,'profile');if(!profile||!Object.hasOwn(profile,'value')||!profiles.has(profile.value))throw new TypeError('Primitive source-unit option requires a supported state outcome cancellation or project profile');return true;
}
export function appendSourceUnitPrimitiveRuntimeSources(unit,original){
 const enabled=sourceUnitPrimitiveOperators(unit);if(!enabled)return original;const rows=[...original],sources=new Map(rows.map(row=>[row.path,row.source]));for(const row of primitiveOperatorRuntimeSources(unit.runtimes.JavaScript,unit.runtimes.TypeScript)){if(sources.has(row.path)){if(sources.get(row.path)!==row.source)throw new TypeError('Primitive source-unit runtime source conflicts');}else{sources.set(row.path,row.source);rows.push(row);}}return rows;
}
