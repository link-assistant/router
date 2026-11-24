// Strict declaration case source; not compiled during bulk drafting.
import {router_text_map_new,router_text_map_from_pairs,router_text_map_insert,router_text_map_get,router_text_map_len,router_text_map_pairs,type OrderedTextMap} from '../ordered-text-map-20261102-runtime.mjs';
const map: OrderedTextMap=router_text_map_insert(router_text_map_new(),'x','value');
const from: OrderedTextMap=router_text_map_from_pairs([['a','b']] as const);
const length: bigint=router_text_map_len(from);
const pairs: readonly (readonly [string,string])[]=router_text_map_pairs(map);
const value=router_text_map_get(map,'x');
if(value.$==='Some'){const text: string=value.field0;void text;}
// @ts-expect-error Number must not silently replace the fixed integer ABI.
const number: number=length;
// @ts-expect-error Opaque maps cannot be fabricated by public shape alone.
const forged: OrderedTextMap={$:'OrderedTextMap',entries:[]};
// @ts-expect-error Keys retain scalar string identity.
router_text_map_insert(map,1,'x');
// @ts-expect-error Returned storage is immutable.
pairs.push(['x','y']);
void [number,forged];
