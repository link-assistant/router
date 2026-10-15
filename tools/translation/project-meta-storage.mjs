// Physical storage only. The complete logical metadata is reconstructed before
// its existing source/IR checks; a matching storage hash grants no authority.
import {createHash} from 'node:crypto';
import {posix} from 'node:path';
const schema='bounded-project-meta-storage-v1';
export const PROJECT_META_STORAGE_LIMITS=Object.freeze({fileBytes:64*1024*1024,totalBytes:512*1024*1024});
const components=Object.freeze([
  Object.freeze({field:'checkedSemanticProgram',target:'checkedProgramMeta'}),
  Object.freeze({field:'targetSemanticProgram',target:'targetProgramMeta'}),
]);
const hash=text=>createHash('sha256').update(text).digest('hex');
const size=text=>Buffer.byteLength(text,'utf8');
const fail=message=>{throw new TypeError('Project metadata storage: '+message);};
const json=value=>JSON.stringify(value)+'\n';
function limits(input={}){
  if(!input||typeof input!=='object'||Object.keys(input).some(key=>!Object.hasOwn(PROJECT_META_STORAGE_LIMITS,key)))fail('unknown storage limit');
  const result={...PROJECT_META_STORAGE_LIMITS,...input};
  for(const key of Object.keys(result))if(!Number.isSafeInteger(result[key])||result[key]<1||result[key]>PROJECT_META_STORAGE_LIMITS[key])fail('limits may only be lowered');
  return result;
}
function path(name){
  if(typeof name!=='string'||!name||name.includes('\\')||/[\x00-\x1f]/u.test(name)||posix.isAbsolute(name)||name.split('/').some(part=>!part||part==='.'||part==='..'))fail('escaping or malformed component path');
  return name;
}
const componentPath=(meta,field)=>path(meta)+'.parts/'+field+'.json';
function text(input,bound){
  if(typeof input==='string'){budget(input,bound);return input;}
  if(Buffer.isBuffer(input)){if(input.length>bound)throw new RangeError('Project metadata storage file byte budget');return new TextDecoder('utf-8',{fatal:true}).decode(input);}
  fail('complete original JSON bytes required');
}
function keys(value,expected){return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===expected.length&&Object.keys(value).every((key,index)=>key===expected[index]);}
function budget(value,bound){if(size(value)>bound)throw new RangeError('Project metadata storage file byte budget');}
// Locate complete top-level values without reparsing the oversized document.
// Each independently bounded component is validated below. Source strings are
// opaque: their braces and escaped quotes never become structural separators.
function topFields(source){
  const white=()=>{while(/\s/u.test(source[at]??'')&&at<source.length)at++;};
  const string=()=>{const begin=at++;while(at<source.length){const ch=source[at++];if(ch==='\\'){at++;continue;}if(ch==='"')return source.slice(begin,at);}fail('unterminated JSON string');};
  let at=0;white();if(source[at++]!=='{')fail('complete project JSON object required');white();const fields=[],seen=new Set();
  while(source[at]!=='}'){
    if(source[at]!=='"')fail('original JSON field required');const name=JSON.parse(string());if(seen.has(name))fail('duplicate original JSON field');seen.add(name);white();if(source[at++]!==':')fail('original JSON colon required');white();const begin=at;
    if(source[at]==='"')string();
    else if(source[at]==='{'||source[at]==='['){
      let depth=0;
      do{const ch=source[at];if(ch==='"'){string();continue;}if(ch==='{'||ch==='[')depth++;else if(ch==='}'||ch===']')depth--;at++;if(at>source.length)fail('unterminated original JSON');}while(depth);
    }else {while(at<source.length&&![',','}'].includes(source[at]))at++;}
    const raw=source.slice(begin,at).trimEnd();if(!raw)fail('empty original JSON value');fields.push({name,raw});white();if(source[at]===','){at++;white();}else if(source[at]!=='}')fail('original JSON separator required');
  }
  at++;white();if(at!==source.length)fail('trailing original JSON');return fields;
}
function canonicalValue(raw){const value=JSON.parse(raw);if(JSON.stringify(value)!==raw)fail('noncanonical component JSON');return value;}
/** Accept the already serialized json(meta), preserving its Map/BigInt/undefined
 * and property-order semantics rather than visiting the original object twice. */
export function planProjectMetaStorage(metaPath,serialized,{storageLimits}={}){
  path(metaPath);const bound=limits(storageLimits);serialized=text(serialized,bound.totalBytes);const bytes=size(serialized);
  if(bytes>bound.totalBytes)throw new RangeError('Project metadata storage aggregate byte budget');
  if(bytes<=bound.fileBytes)return {text:serialized,components:[],targets:{}};
  const fields=topFields(serialized),selected=new Map(fields.filter(row=>components.some(component=>component.field===row.name)).map(row=>[row.name,row.raw]));
  if('{'+fields.map(row=>JSON.stringify(row.name)+':'+row.raw).join(',')+'}\n'!==serialized)fail('complete canonical json(meta) required');
  if(selected.size!==2)fail('both complete semantic programs required');
  const rows=components.map(component=>{
    const content=selected.get(component.field)+'\n';budget(content,bound.fileBytes);canonicalValue(selected.get(component.field));
    return {...component,path:componentPath(metaPath,component.field),bytes:size(content),sha256:hash(content),text:content};
  });
  const rootRaw='{'+fields.filter(row=>!selected.has(row.name)).map(row=>JSON.stringify(row.name)+':'+row.raw).join(',')+'}';
  canonicalValue(rootRaw);
  const logical={bytes,sha256:hash(serialized),keys:fields.map(row=>row.name)};
  // Preserve each actual value as complete JSON, without string-escaping or
  // normalizing its evidence. The root never duplicates the program values.
  const descriptors=rows.map(({field,path,bytes,sha256})=>({field,path,bytes,sha256}));
  const stored='{"schema":'+JSON.stringify(schema)+',"logical":'+JSON.stringify(logical)+',"root":'+rootRaw+',"components":'+JSON.stringify(descriptors)+'}\n';
  budget(stored,bound.fileBytes);if(size(stored)+rows.reduce((sum,row)=>sum+row.bytes,0)>bound.totalBytes)throw new RangeError('Project metadata storage aggregate byte budget');
  return {text:stored,components:rows,targets:Object.fromEntries(rows.map(row=>[row.target,row.path]))};
}
/** read must use the caller's existing bounded, source-rooted input reader.
 * targets is the exact current/baseline inventory row, never another graph. */
export function loadProjectMetaStorage(serialized,{metaPath,targets,read,storageLimits}={}){
  path(metaPath);const bound=limits(storageLimits);serialized=text(serialized,bound.fileBytes);
  if(size(serialized)>bound.totalBytes)throw new RangeError('Project metadata storage aggregate byte budget');
  const document=JSON.parse(serialized),listed=components.filter(component=>Object.hasOwn(targets??{},component.target));
  if(document?.schema!==schema){if(listed.length)fail('unexpected inventory components for inline metadata');return {meta:document,text:serialized,components:[]};}
  if(!keys(document,['schema','logical','root','components'])||!keys(document.logical,['bytes','sha256','keys'])||!Array.isArray(document.components)||document.components.length!==2||listed.length!==2||targets.meta!==metaPath||Object.keys(targets).length!==5||!['meta','javascript','typescript','checkedProgramMeta','targetProgramMeta'].every(key=>typeof targets[key]==='string')||typeof read!=='function')fail('complete wrapper and inventory components required');
  const logical=document.logical;
  if(!Number.isSafeInteger(logical.bytes)||logical.bytes<1||logical.bytes>bound.totalBytes||!/^[a-f0-9]{64}$/u.test(logical.sha256)||!Array.isArray(logical.keys)||logical.keys.some(key=>typeof key!=='string')||new Set(logical.keys).size!==logical.keys.length||!document.root||typeof document.root!=='object'||Array.isArray(document.root))fail('invalid original logical metadata record');
  if(json(document)!==serialized)fail('noncanonical storage wrapper');
  const values=new Map(),loaded=[];let total=size(serialized);
  for(let index=0;index<components.length;index++){
    const expected=components[index],row=document.components[index],name=componentPath(metaPath,expected.field);
    if(!keys(row,['field','path','bytes','sha256'])||row.field!==expected.field||row.path!==name||targets[expected.target]!==name||!Number.isSafeInteger(row.bytes)||row.bytes<1||row.bytes>bound.fileBytes||!/^[a-f0-9]{64}$/u.test(row.sha256)||Object.hasOwn(document.root,row.field))fail('changed, escaping or incomplete component descriptor');
    total+=row.bytes;if(total>bound.totalBytes)throw new RangeError('Project metadata storage aggregate byte budget');
    const content=text(read(name),bound.fileBytes);
    if(size(content)!==row.bytes||hash(content)!==row.sha256)fail('complete component bytes/hash changed');
    const value=JSON.parse(content);if(json(value)!==content)fail('noncanonical complete component');values.set(row.field,value);loaded.push({...row});
  }
  const actualKeys=[...Object.keys(document.root),...values.keys()];if(actualKeys.length!==logical.keys.length||logical.keys.some(key=>!Object.hasOwn(document.root,key)&&!values.has(key)))fail('missing, extra or repeated logical field');
  const meta=Object.fromEntries(logical.keys.map(key=>[key,values.has(key)?values.get(key):document.root[key]])),complete=json(meta);
  if(size(complete)!==logical.bytes||hash(complete)!==logical.sha256)fail('original logical metadata bytes/hash changed');
  return {meta,text:complete,components:loaded};
}
