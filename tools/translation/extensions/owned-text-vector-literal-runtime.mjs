// Fresh variadic String carriers compose the existing bounded cloned slice core.
import {router_owned_text_vec_from_slice as copied_text} from './owned-text-vector-runtime.mjs';
const freeze=Object.freeze;
export function router_owned_text_vec_literal(...values){return copied_text(freeze(values));}
