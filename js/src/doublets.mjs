import { open } from 'node:fs/promises';
import { decodeTokenRecords, encodeLino } from './storage.mjs';

const schema = [['StorageFormat','router-token-doublets-v1'],['Type','TokenRecord'],['TokenRecord','SubType'],['SubType','Value']];
const utf8 = new TextDecoder('utf8',{fatal:true});
const stringCompare = (left,right) => Buffer.compare(Buffer.from(left),Buffer.from(right));
const base64 = value => Buffer.from(value).toString('base64').replace(/=+$/,'');
const valueNode = (parent,raw) => `${parent}/Value/${base64(raw)}`;
const decode64 = value => {
  if (!/^[A-Za-z0-9+/]*$/.test(value) || value.length%4 === 1) throw new Error('Invalid token doublets base64');
  const bytes = Buffer.from(value,'base64');
  if (base64(bytes) !== value) throw new Error('Noncanonical token doublets base64');
  return utf8.decode(bytes);
};
export function tokenSemanticLinks(records) {
  const links = schema.map(pair => pair.slice());
  for (const record of records) {
    const root = `Record/${base64(record.id)}`, subtype = `${root}/SubType`, value = `${root}/Value`;
    links.push([root,'Type'],[root,subtype],[subtype,valueNode(subtype,record.id)],[root,value]);
    for (const [field,raw] of Object.entries(record)) {
      if (raw == null) continue;
      const path = `${value}/Field/${field}`;
      const text = field === 'github_repos' ? raw.join(',') : field === 'model_policy' ? JSON.stringify(raw) : String(raw);
      links.push([value,path],[path,valueNode(path,text)]);
    }
  }
  const unique = new Map(links.map(pair => [JSON.stringify(pair),pair]));
  return [...unique.values()].sort((left,right) => stringCompare(left[0],right[0]) || stringCompare(left[1],right[1]));
}
export function semanticTokenRecords(links) {
  const pairs = new Set(links.map(pair => JSON.stringify(pair))), targets = new Map();
  for (const pair of schema) if (!pairs.has(JSON.stringify(pair))) throw new Error('Token doublets schema is incomplete');
  for (const [source,target] of links) { if (!targets.has(source)) targets.set(source,new Set()); targets.get(source).add(target); }
  const one = source => { const values = [...(targets.get(source) ?? [])]; if (values.length !== 1) throw new Error('Token doublets value is missing or ambiguous'); return values[0]; };
  const decodeValue = (parent,value) => { const prefix = `${parent}/Value/`; if (!value.startsWith(prefix)) throw new Error('Invalid doublets value relation'); return decode64(value.slice(prefix.length)); };
  const records = [];
  for (const [root,target] of links) if (target === 'Type' && root.startsWith('Record/')) {
    const id = decode64(root.slice(7)), subtype = `${root}/SubType`, value = `${root}/Value`;
    if (!pairs.has(JSON.stringify([root,subtype])) || !pairs.has(JSON.stringify([root,value])) || decodeValue(subtype,one(subtype)) !== id) throw new Error('Token doublets identity relations disagree');
    const fields = {};
    for (const fieldPath of targets.get(value) ?? []) if (fieldPath.startsWith(`${value}/Field/`)) fields[fieldPath.slice(value.length+7)] = decodeValue(fieldPath,one(fieldPath));
    if (fields.id !== id) throw new Error('Token doublets record id mismatch');
    for (const name of ['issued_at','expires_at']) { if (!/^-?\d+$/.test(fields[name] ?? '')) throw new Error('Invalid token timestamp'); fields[name] = Number(fields[name]); }
    for (const name of ['revoked','ephemeral']) {
      if (name === 'ephemeral' && fields[name] == null) { fields[name] = false; continue; }
      if (!['true','false'].includes(fields[name])) throw new Error('Invalid token boolean'); fields[name] = fields[name] === 'true';
    }
    fields.used_tokens ??= '0'; fields.reserved_tokens ??= '0'; fields.rate_window_started_at ??= '0'; fields.rate_window_requests ??= '0';
    fields.account ??= null; fields.client_kind ??= null; fields.principal_id ??= null; fields.run_lease_expires_at ??= null;
    fields.max_tokens ??= null; fields.max_requests ??= null; fields.rate_limit_per_minute ??= null; fields.sliding_window_seconds ??= null;
    // The text codec supplies the same field validation and defaults.
    records.push(fields);
  }
  const document = {type:'RouterState',subtype:'TokenStore',value:records.map(record => ({type:'TokenRecord',subtype:record.id,value:record}))};
  // Encode the framing only; these fields are already Rust's string scalars.
  return decodeTokenRecords(encodeLino(document));
}
/** doublets 0.5 #[repr(C)] LinksHeader/LinkPart, usize, native little endian. */
export function encodeDoublets(links,{wordBytes = 8,maxLinks = 1000000} = {}) {
  if (![4,8].includes(wordBytes)) throw new Error('Unsupported doublets word width');
  const parts = [Array(8).fill(0)], lookup = new Map();
  const pair = (source,target) => {
    const key = `${source},${target}`;
    if (lookup.has(key)) return lookup.get(key);
    if (parts.length > maxLinks) throw new Error('Token links network exceeds capacity');
    const index = parts.length; parts.push([source,target,0,0,1,0,0,1]); lookup.set(key,index); return index;
  };
  for (let point = 1; point <= 259; point++) if (pair(point,point) !== point) throw new Error('Doublets point initialization failed');
  const strings = new Map();
  const intern = value => {
    if (strings.has(value)) return strings.get(value);
    let tail = 3; const bytes = Buffer.from(value);
    for (let at = bytes.length-1; at >= 0; at--) tail = pair(4+bytes[at],tail);
    const node = pair(1,tail); strings.set(value,node); return node;
  };
  for (const [source,target] of links) pair(2,pair(intern(source),intern(target)));
  const count = parts.length-1;
  const build = (order,left,right,offset) => {
    if (left >= right) return 0;
    const middle = Math.floor((left+right)/2), index = order[middle];
    parts[index][offset] = build(order,left,middle,offset); parts[index][offset+1] = build(order,middle+1,right,offset); parts[index][offset+2] = right-left;
    return index;
  };
  const order = Array.from({length:count},(_,index) => index+1);
  const sources = order.slice().sort((left,right) => parts[left][0]-parts[right][0] || parts[left][1]-parts[right][1]);
  const targets = order.slice().sort((left,right) => parts[left][1]-parts[right][1] || parts[left][0]-parts[right][0]);
  parts[0] = [count,count,0,0,build(sources,0,count,2),build(targets,0,count,5),0,0];
  const result = Buffer.alloc(parts.length*wordBytes*8);
  for (let index = 0; index < parts.length; index++) for (let field = 0; field < 8; field++) {
    const offset = (index*8+field)*wordBytes;
    if (wordBytes === 8) result.writeBigUInt64LE(BigInt(parts[index][field]),offset); else result.writeUInt32LE(parts[index][field],offset);
  }
  return result;
}
export function decodeDoublets(bytes,{wordBytes = 8,maxLinks = 1000000} = {}) {
  const stride = wordBytes*8;
  const read = (index,field) => {
    const offset = index*stride+field*wordBytes;
    if (offset+wordBytes > bytes.length) throw new Error('Truncated token doublets store');
    const value = wordBytes === 8 ? Number(bytes.readBigUInt64LE(offset)) : bytes.readUInt32LE(offset);
    if (!Number.isSafeInteger(value)) throw new Error('Unsafe token doublets link reference'); return value;
  };
  const allocated = read(0,0);
  if (allocated < 259 || allocated > maxLinks || (allocated+1)*stride > bytes.length || read(0,1) < allocated || read(0,2) > allocated) throw new Error('Invalid token doublets header');
  const exists = index => index > 0 && index <= allocated && read(index,4) !== 0;
  for (let index = 1; index <= 259; index++) if (!exists(index) || read(index,0) !== index || read(index,1) !== index) throw new Error('Invalid token doublets schema point');
  const cache = new Map();
  const decode = node => {
    if (cache.has(node)) return cache.get(node);
    if (!exists(node) || read(node,0) !== 1) throw new Error('Invalid token doublets string');
    const data = [], visited = new Set(); let tail = read(node,1);
    while (tail !== 3) {
      if (!exists(tail) || visited.has(tail)) throw new Error('Incomplete or cyclic token doublets string');
      visited.add(tail); const byte = read(tail,0)-4;
      if (byte < 0 || byte > 255) throw new Error('Invalid token doublets byte');
      data.push(byte); tail = read(tail,1);
    }
    const text = utf8.decode(new Uint8Array(data)); cache.set(node,text); return text;
  };
  const links = new Map();
  for (let index = 260; index <= allocated; index++) if (exists(index) && read(index,0) === 2) {
    const pair = read(index,1); if (!exists(pair)) throw new Error('Token doublets edge refers to missing pair');
    const relation = [decode(read(pair,0)),decode(read(pair,1))]; links.set(JSON.stringify(relation),relation);
  }
  return [...links.values()].sort((left,right) => stringCompare(left[0],right[0]) || stringCompare(left[1],right[1]));
}
export function encodeBinaryTokenRecords(records) { return encodeDoublets(tokenSemanticLinks(records)); }
export function decodeBinaryTokenRecords(bytes) { return semanticTokenRecords(decodeDoublets(bytes)); }
export async function readBinaryTokenRecords(path) {
  let file;
  try { file = await open(path,'r'); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  try {
    const header = Buffer.alloc(64); const read = await file.read(header,0,64,0);
    if (read.bytesRead === 0) return [];
    if (header.subarray(0,8).equals(Buffer.from('LARTOK01'))) {
      const size = (await file.stat()).size;
      if (size > 64*1024*1024) throw new Error('Legacy token projection exceeds capacity');
      const bytes = Buffer.alloc(size); let offset = 0;
      while (offset < size) { const part = await file.read(bytes,offset,size-offset,offset); if (!part.bytesRead) throw new Error('Truncated legacy token store'); offset += part.bytesRead; }
      const records = [];
      for (let cursor = 8; cursor+4 <= bytes.length;) {
        const length = bytes.readUInt32LE(cursor); cursor += 4;
        if (cursor+length > bytes.length) throw new Error('Truncated legacy token record');
        records.push(JSON.parse(utf8.decode(bytes.subarray(cursor,cursor+length)))); cursor += length;
      }
      const {encodeTokenRecords} = await import('./storage.mjs');
      return decodeTokenRecords(encodeTokenRecords(records));
    }
    const allocated = Number(header.readBigUInt64LE(0));
    if (!Number.isSafeInteger(allocated) || allocated > 1000000 || allocated < 259) throw new Error('Invalid token doublets allocation');
    const bytes = Buffer.alloc((allocated+1)*64);
    let offset = 0;
    while (offset < bytes.length) { const part = await file.read(bytes,offset,bytes.length-offset,offset); if (!part.bytesRead) throw new Error('Truncated token doublets store'); offset += part.bytesRead; }
    return decodeBinaryTokenRecords(bytes);
  } finally { await file.close(); }
}
