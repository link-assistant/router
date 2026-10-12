import { extractSerializationSchema, SERIALIZATION_LIMITS, SerializationRefusal } from './extract.mjs';
const checked = new WeakSet();
function ordered(value) {
  if(Array.isArray(value)) return value.map(ordered);
  if(value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])]));
  return value;
}
export const canonicalSerializationMeta = meta => JSON.stringify(ordered(meta));
export function serializeSerializationMeta(context, options) {
  const meta = extractSerializationSchema(context, options);
  const text = canonicalSerializationMeta(meta) + '\n';
  if(Buffer.byteLength(text) > SERIALIZATION_LIMITS.metaBytes) throw new SerializationRefusal('Serialization metadata exceeds its bounded byte grammar');
  return text;
}
// Source identity is re-extracted, including original owners/attrs/spans. A
// metadata caller cannot bless edited/forged scopes by adding a proof Boolean.
export function parseSerializationMeta(text, context) {
  if(typeof text !== 'string' || Buffer.byteLength(text) > SERIALIZATION_LIMITS.metaBytes) throw new SerializationRefusal('Serialization metadata requires bounded UTF-8 text');
  let supplied;try { supplied = JSON.parse(text); } catch { throw new SerializationRefusal('Invalid serialization metadata JSON'); }
  const pending = [[supplied,0]];let count=0;
  while(pending.length){const [node,depth]=pending.pop();if(++count>20000||depth>64)throw new SerializationRefusal('Serialization metadata structural budget exceeded');if(node&&typeof node==='object')for(const child of Object.values(node))pending.push([child,depth+1]);}
  if(text !== canonicalSerializationMeta(supplied)+'\n') throw new SerializationRefusal('Serialization metadata requires canonical keys/fields without duplicate entries');
  if(!supplied || supplied.schema !== 'original-serialization-meta-v1') throw new SerializationRefusal('Unknown serialization metadata schema');
  const original = extractSerializationSchema(context, { roots:supplied.roots, direction:supplied.direction??'both' });
  if(canonicalSerializationMeta(supplied) !== canonicalSerializationMeta(original)) throw new SerializationRefusal('Serialization metadata differs from its original source/namespace/dependency context');
  checked.add(original);return original;
}
export function requireCheckedSerializationMeta(meta) {
  if(!checked.has(meta)) throw new SerializationRefusal('Descriptor emission requires privately checked original serialization metadata');
  return meta;
}
