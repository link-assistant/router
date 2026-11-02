// Strict TypeScript case source, UNRUN; dedicated strict-driver registration OPEN.
import {router_text_map_new as empty,router_text_map_get as get,router_text_map_insert as insert,router_text_map_len as len,type OrderedTextMap} from '../ordered-text-map-20261102-runtime.mjs';
const original: ReturnType<typeof empty> = empty();
const updated: OrderedTextMap = insert(original,'stream','true');
const borrowed: Parameters<typeof get>[0] = updated;
const option: ReturnType<typeof get> = get(borrowed,'stream');
const count: bigint = len(original);
if(option.$==='Some'){const text: string=option.field0;void text;}
// @ts-expect-error Opaque map cannot be forged from its structural carrier.
const forged: OrderedTextMap = {$:'OrderedTextMap',entries:[]};
// @ts-expect-error Map length preserves the native integer ABI.
const numberCount: number = count;
// @ts-expect-error A map cannot be silently substituted for a JSON object.
const json: Readonly<Record<string,string>> = original;
// @ts-expect-error Borrowed output payload is scalar text, not an owned map.
const wrong: OrderedTextMap = option.$==='Some'?option.field0:original;
void forged;void numberCount;void json;void wrong;
