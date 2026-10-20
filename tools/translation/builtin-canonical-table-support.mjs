// Explicit storage candidate only. No source, owner or executable authority.
import {Buffer as importedBuffer} from 'node:buffer';
import {types} from 'node:util';
import {originalPrivateParserIngressUnchanged,originalBatchedDataFreezeIntrinsicsUnchanged,originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
// Generated from the actual complete node:buffer wrapper source; no evaluation.
import {canonicalNodeBufferByteLengthSource} from './builtin-canonical-buffer-source.mjs';
const initial=originalPrivateParserIngressUnchanged()&&originalBatchedDataFreezeIntrinsicsUnchanged();
const root=initial?globalThis:null,get=initial?Object.getOwnPropertyDescriptor:null,has=initial?Object.hasOwn:null,apply=initial?Reflect.apply:null,typeOwner=types;
const value=field=>field&&has(field,'value')?field.value:null;
const globals=initial?['JSON','Number','Math','Buffer'].map(name=>({name,field:get(root,name)})):[];
const json=value(globals[0]?.field),number=value(globals[1]?.field),math=value(globals[2]?.field),buffer=value(globals[3]?.field);
const ordinary=!!(initial&&json&&number&&math&&buffer===importedBuffer&&!types.isProxy(json)&&!types.isProxy(number)&&!types.isProxy(math)&&!types.isProxy(buffer));
const pins=ordinary?[[json,'parse'],[number,'isFinite'],[number,'isInteger'],[number,'isSafeInteger'],[math,'max'],[buffer,'byteLength']].map(([owner,key])=>({owner,key,field:get(owner,key)})):[];
const native=(fn,name)=>typeof fn==='function'&&!types.isProxy(fn)&&originalCapturedFunctionSource(fn)==='function '+name+'() { [native code] }';
let qualified=!!(ordinary&&native(number,'Number'));
if(qualified)for(const pin of pins){const fn=value(pin.field);if(!fn||typeof fn!=='function'||types.isProxy(fn)||!(native(fn,pin.key)||pin.key==='byteLength'&&originalCapturedFunctionSource(fn)===canonicalNodeBufferByteLengthSource))qualified=false;}
// The JavaScript node:buffer lane assumes the same trusted common bootstrap as
// the existing intrinsic issuer. Full source/import identity plus these scalar
// probes reject ordinary cold replacements; this is not compiler bootstrap proof.
if(qualified)try{const parse=value(pins[0].field),bytes=value(pins[5].field),plain=apply(parse,json,['{"v":true}']);qualified=apply(parse,json,['null'])===null&&plain.v===true&&Object.getPrototypeOf(plain)===Object.prototype&&apply(bytes,buffer,[''])===0&&apply(bytes,buffer,['a'])===1&&apply(bytes,buffer,['λ😀\ud800'])===9;}catch{qualified=false;}
const same=(actual,expected)=>!!(actual&&expected&&has(actual,'value')&&has(expected,'value')&&actual.value===expected.value&&actual.writable===expected.writable&&actual.enumerable===expected.enumerable&&actual.configurable===expected.configurable);
export function builtinCanonicalTableReady(){
 if(!qualified||types!==typeOwner||!originalPrivateParserIngressUnchanged())return false;
 for(const pin of globals)if(!same(get(root,pin.name),pin.field))return false;
 for(const pin of pins)if(!same(get(pin.owner,pin.key),pin.field))return false;
 // This fresh complete guard covers Array map/some/includes/push/iterators,
 // Map/Set constructors and methods, Object keys/entries/fromEntries/freeze,
 // JSON.stringify, prototype domains, species and inherited toJSON/numerics.
 return originalBatchedDataFreezeIntrinsicsUnchanged();
}

// Positive-only canonical equation. The complete original decoder has already
// validated references and constructed/frozen the same values in the same order.
// Every uncertain/noncanonical table returns null to the full original encoder.
export function canonicalBuiltinSourceMetaText(data,decoded,text,bounds){
 if(!builtinCanonicalTableReady())return null;
 const table=data.table,names=data.fieldNames,states=new Array(table.length).fill(0),identities=new Map(),fields=new Map();let nextNode=0,nextField=0;
 function visit(part,depth){
  if(depth>bounds.depth)return false;
  if(part===null||typeof part==='boolean'||typeof part==='number'&&Number.isFinite(part)&&!(Number.isInteger(part)&&part<0))return true;
  if(typeof part==='string')return part.length<8;
  if(Array.isArray(part))return part.length===2&&part[0]==='n'&&Number.isInteger(part[1])&&part[1]<0;
  return false;
 }
 function reference(part,depth){
  if(depth>bounds.depth)return false;
  if(typeof part!=='number'||!Number.isSafeInteger(part)||part>=0)return visit(part,depth);
  const index=-part-1;if(index>=table.length)return false;
  if(states[index]===2)return true;if(states[index]===1)return false;states[index]=1;
  const node=table[index];
  if(node[0]==='s'){if(node[1].length<8)return false;}
  else if(node[0]==='a'){for(const child of node[1])if(!reference(child,depth+1))return false;}
  else{
   const keys=Object.keys(decoded[index]);if(keys.length!==node[1].length)return false;
   for(let at=0;at<node[1].length;at++){
    const pair=node[1][at],key=names[pair[0]];if(keys[at]!==key)return false;
    let field=fields.get(key);if(field===undefined){field=nextField++;fields.set(key,field);}if(field!==pair[0]||!reference(pair[1],depth+1))return false;
   }
  }
  const identity=JSON.stringify(node);if(identities.has(identity)||index!==nextNode)return false;identities.set(identity,index);nextNode++;states[index]=2;return true;
 }
 if(!reference(data.root,0)||nextNode!==table.length||nextField!==names.length)return null;
 const encoded=JSON.stringify(data);if(encoded!==text||!builtinCanonicalTableReady())return null;
 // Complete original encoder tail, including the live Buffer lookup, original
 // error constructor/metadata and every final byteLength call and argument.
 if(Buffer.byteLength(encoded)>bounds.bytes)throw Object.assign(new TypeError('Builtin source metadata byte budget exceeded'),{metadataBytes:Buffer.byteLength(encoded),metadataCells:table.length});
 return encoded;
}
