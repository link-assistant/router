// Lossless bounded sharing for source-generator metadata. This changes storage,
// never source ownership or generator/runtime authority. References point only
// to previously encoded immutable nodes; no cycles or caller table claims.
import {createHash} from 'node:crypto';
const hash=text=>createHash('sha256').update(text).digest('hex');
const bounds=Object.freeze({cells:16000,depth:64,bytes:524288});
export function encodeBuiltinSourceMeta(value){
  const table=[],fieldNames=[],fields=new Map(),interned=new Map(),seen=new WeakMap(),active=new WeakSet();
  function field(key){if(!fields.has(key)){fields.set(key,fieldNames.length);fieldNames.push(key);}return fields.get(key);}
  function visit(value,depth){
    if(depth>bounds.depth)throw new TypeError('Builtin source metadata depth budget exceeded');
    if(typeof value==='string'&&value.length>=32){
      const identity=JSON.stringify(['s',value]);let index=interned.get(identity);
      if(index===undefined){index=table.length;if(index>=bounds.cells)throw new TypeError('Builtin source metadata cell budget exceeded');table.push(['s',value]);interned.set(identity,index);}
      return {r:index};
    }
    if(value===null||['string','boolean'].includes(typeof value))return value;
    if(typeof value==='number'&&Number.isFinite(value))return value;
    if(!value||typeof value!=='object')throw new TypeError('Builtin source metadata must be JSON values');
    if(active.has(value))throw new TypeError('Builtin source metadata cycle');
    if(seen.has(value))return {r:seen.get(value)};
    active.add(value);
    const node=Array.isArray(value)?['a',value.map(child=>visit(child,depth+1))]:['o',Object.entries(value).filter(([,child])=>child!==undefined).map(([key,child])=>[field(key),visit(child,depth+1)])];
    active.delete(value);
    const identity=JSON.stringify(node);let index=interned.get(identity);
    if(index===undefined){index=table.length;if(index>=bounds.cells)throw new TypeError('Builtin source metadata cell budget exceeded');table.push(node);interned.set(identity,index);}
    seen.set(value,index);return {r:index};
  }
  const root=visit(value,0),text=JSON.stringify({schema:'builtin-source-meta-sharing-v1',fieldNames,table,root});
  if(Buffer.byteLength(text)>bounds.bytes)throw Object.assign(new TypeError('Builtin source metadata byte budget exceeded'),{metadataBytes:Buffer.byteLength(text),metadataCells:table.length});
  return text;
}
export function decodeBuiltinSourceMeta(text){
  if(typeof text!=='string'||Buffer.byteLength(text)>bounds.bytes)throw new TypeError('Builtin source metadata byte budget exceeded');
  const data=JSON.parse(text);
  if(data?.schema!=='builtin-source-meta-sharing-v1'||!Array.isArray(data.table)||data.table.length>bounds.cells||Object.keys(data).join(',')!=='schema,fieldNames,table,root'||!Array.isArray(data.fieldNames)||data.fieldNames.length>bounds.cells||data.fieldNames.some(key=>typeof key!=='string')||new Set(data.fieldNames).size!==data.fieldNames.length)throw new TypeError('Invalid builtin source metadata table');
  const table=[],depths=[];
  function read(value,limit){
    if(value===null||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value))return {value,depth:0};
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).join(',')!=='r'||!Number.isSafeInteger(value.r)||value.r<0||value.r>=limit)throw new TypeError('Dangling or cyclic builtin source metadata reference');
    return {value:table[value.r],depth:depths[value.r]};
  }
  for(const node of data.table){
    if(Array.isArray(node)&&node.length===2&&node[0]==='s'&&typeof node[1]==='string'){table.push(node[1]);depths.push(0);continue;}
    if(!Array.isArray(node)||node.length!==2||!['a','o'].includes(node[0])||!Array.isArray(node[1]))throw new TypeError('Invalid builtin source metadata node');
    let depth=1;
    const values=node[1].map(child=>{
      if(node[0]==='o'&&(!Array.isArray(child)||child.length!==2||!Number.isSafeInteger(child[0])||child[0]<0||child[0]>=data.fieldNames.length))throw new TypeError('Invalid builtin source metadata field');
      const part=read(node[0]==='o'?child[1]:child,table.length);depth=Math.max(depth,part.depth+1);return node[0]==='o'?[data.fieldNames[child[0]],part.value]:part.value;
    });
    if(depth>bounds.depth+1)throw new TypeError('Builtin source metadata depth budget exceeded');
    if(node[0]==='o'&&new Set(values.map(([key])=>key)).size!==values.length)throw new TypeError('Repeated builtin source metadata field');
    table.push(Object.freeze(node[0]==='o'?Object.fromEntries(values):values));depths.push(depth);
  }
  const result=read(data.root,table.length).value;
  if(encodeBuiltinSourceMeta(result)!==text)throw new TypeError('Builtin source metadata canonical roundtrip changed');
  return result;
}
export function sealBuiltinSourceMeta(value){
  const encoded=encodeBuiltinSourceMeta(value),copy=decodeBuiltinSourceMeta(encoded);
  return Object.freeze({...copy,digest:hash(encoded)});
}
