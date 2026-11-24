// GENERATED: actual checked reverse owned-core receiving witness.
import {router_core_json_copy as copy,router_core_json_with_field as update,router_core_json_index_str as index} from './runtime/json-update-runtime.mjs';
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function copied(value){return copy(value);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function nested(value){const local=copy(value);const alias=local;return update(local,"nested",alias);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function named(value){return index(value,"name");}
