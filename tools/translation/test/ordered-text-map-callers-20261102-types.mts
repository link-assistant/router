// Strict TypeScript case source, UNRUN; registered by the dedicated strict receiving driver.
import {router_text_map_new as empty,router_text_map_get as get,router_text_map_insert as insert,router_text_map_len as len,router_text_map_keys as keys,type OrderedTextMap} from '../ordered-text-map-20261102-runtime.mjs';
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

const names: readonly string[] = keys(original);
// @ts-expect-error Projection is an owned text-vector abstraction, not a map.
const projectedMap: OrderedTextMap = names;
// @ts-expect-error Public vector result stays immutable in the JS/TS ABI.
names.push('changed');
// @ts-expect-error Owned text projection elements are scalar strings.
const projectedNumber: bigint = names[0];
void projectedMap;void projectedNumber;
