import {coerce as portableCoerce} from './vendor/meta-language/translation/check.js';
import {typeKey} from './checked-types.mjs';
import {typeError} from './vendor/meta-language/translation/diagnostics.js';

// The upstream portable array domain has no source length. It must not erase
// this refinement when an extension uses its exported coercion helper.
export function coerce(value,type,language,span) {
  if(value.type?.kind==='array'&&type?.kind==='array'&&typeKey(value.type)!==typeKey(type))throw typeError('Rust array length or element type differs at the boundary',span);
  return portableCoerce(value,type,language,span);
}
