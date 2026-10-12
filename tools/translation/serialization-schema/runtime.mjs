import { SerializationRefusal } from './extract.mjs';
import { requireCheckedSerializationMeta } from './meta.mjs';
import { projectSerializationDescriptor } from './descriptor.mjs';

const fail = message => { throw new SerializationRefusal(message); };
const members = new WeakMap();
class JsonNumber { constructor(raw) { this.raw=raw; } }
const integerBounds=Object.freeze(Object.fromEntries([8,16,32,64].flatMap(bits=>[
  ['i'+bits,[-(1n<<BigInt(bits-1)),(1n<<BigInt(bits-1))-1n]],
  ['u'+bits,[0n,(1n<<BigInt(bits))-1n]],
])));
function scalarString(value) {
  if(typeof value!=='string')fail('Expected a scalar string');
  for(let at=0;at<value.length;at++) {
    const unit=value.charCodeAt(at);
    if(unit>=0xd800&&unit<=0xdbff) {const next=value.charCodeAt(++at);if(!(next>=0xdc00&&next<=0xdfff))fail('Lone leading surrogate');}
    else if(unit>=0xdc00&&unit<=0xdfff)fail('Lone trailing surrogate');
  }
  return value;
}
function integer(value,type) {
  if(value instanceof JsonNumber) {
    // serde_json's -0, fractions and exponent spellings visit floats. Locked
    // serde's fixed-width integer visitors do not implement visit_f64.
    if(!/^-?(?:0|[1-9]\d*)$/.test(value.raw)||value.raw==='-0'||value.raw.length>21)fail('Expected '+type+' integer visitor');
    value=BigInt(value.raw);
  }
  if(typeof value!=='bigint'&&!(typeof value==='number'&&Number.isSafeInteger(value)))fail('Expected an exact '+type+' value');
  const exact=BigInt(value),[low,high]=integerBounds[type];
  if(exact<low||exact>high)fail('Integer outside '+type+' bounds');
  return exact>=BigInt(Number.MIN_SAFE_INTEGER)&&exact<=BigInt(Number.MAX_SAFE_INTEGER)?Number(exact):exact;
}
function entries(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||value instanceof JsonNumber)fail('Expected a map');
  return members.get(value)??Object.entries(value);
}
// One generic lexical JSON reader, shared by every original descriptor. It
// preserves duplicate fields and integer spellings before any IEEE conversion.
function readJSON(text) {
  if(typeof text!=='string'||Buffer.byteLength(text)>4*1024*1024)fail('Expected bounded JSON text');
  let at=0;
  const whitespace=()=>{while(at<text.length&&/[\x20\t\r\n]/.test(text[at]))at++;};
  const string=()=>{
    const begin=at++;
    while(at<text.length) {const character=text[at++];if(character==='"') {try{return scalarString(JSON.parse(text.slice(begin,at)));}catch{fail('Invalid JSON scalar string');}}if(character==='\\')at++;}
    fail('Unterminated JSON string');
  };
  function value(depth=0) {
    if(depth>=128)fail('JSON recursion limit exceeded');
    whitespace();const character=text[at];
    if(character==='"')return string();
    if(character==='{'||character==='[') {
      const array=character==='[',end=array?']':'}',output=array?[]:Object.create(null),pairs=[];
      at++;whitespace();if(text[at]===end){at++;if(!array)members.set(output,pairs);return output;}
      while(true) {
        whitespace();let name;
        if(!array) {if(text[at]!=='"')fail('JSON keys must be strings');name=string();whitespace();if(text[at++]!==':')fail('Expected JSON colon');}
        const child=value(depth+1);if(array)output.push(child);else{pairs.push([name,child]);output[name]=child;}
        whitespace();if(text[at]===end){at++;break;}if(text[at++]!==',')fail('Expected JSON comma');
      }
      if(!array)members.set(output,pairs);return output;
    }
    for(const [word,decoded]of [['null',null],['true',true],['false',false]])if(text.startsWith(word,at)){at+=word.length;return decoded;}
    const numeric=/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(at));
    if(numeric) {at+=numeric[0].length;if(!Number.isFinite(Number(numeric[0])))fail('JSON number out of range');return new JsonNumber(numeric[0]);}
    fail('Expected JSON value');
  }
  const output=value();whitespace();if(at!==text.length)fail('Trailing JSON characters');return output;
}
function writeJSON(value) {
  if(typeof value==='bigint')return value.toString();
  if(Array.isArray(value))return '['+value.map(writeJSON).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.entries(value).map(([key,child])=>JSON.stringify(key)+':'+writeJSON(child)).join(',')+'}';
  return JSON.stringify(value);
}

// Callable directions come from the privately re-extracted original trait
// proof, never a copied registry JSON or a caller-supplied promotion Boolean.
export function createSerializationCodec(input,{root}={}) {
  const meta=requireCheckedSerializationMeta(input),schema=projectSerializationDescriptor(meta),direction=meta.direction??'both';
  root??=meta.roots[0];if(!meta.roots.includes(root))fail('Codec root is not an original checked extraction root');
  const name=meta.types.find(type=>type.owner===root).name;
  function apply(value,type,encoding,depth=0) {
    if(depth>=128)fail('Descriptor recursion limit exceeded');
    if(type==='String')return scalarString(value);
    if(type==='bool') {if(typeof value!=='boolean')fail('Expected boolean visitor');return value;}
    if(Object.hasOwn(integerBounds,type))return integer(value,type);
    const spec=typeof type==='string'?schema[type]:type;if(!spec)fail('Unknown checked schema type');
    if(spec.kind==='vec') {if(!Array.isArray(value))fail('Expected a sequence');return value.map(child=>apply(child,spec.type,encoding,depth+1));}
    if(spec.kind==='enum') {
      if(!encoding&&typeof value!=='string'){const pairs=entries(value);if(pairs.length!==1||pairs[0][1]!==null)fail('Expected unit enum');value=pairs[0][0];}
      scalarString(value);const canonical=encoding?value:spec.aliases?.[value]??value;
      if(!spec.variants.includes(canonical))fail('Unknown enum variant');return canonical;
    }
    if(spec.kind==='tagged') {
      let tag,content;
      if(!encoding&&Array.isArray(value)) {tag=value[0];content=value.slice(1);}
      else {
        const pairs=entries(value),tags=pairs.filter(([key])=>key===spec.tag);
        if(tags.length!==1)fail(tags.length?'Duplicate enum tag':'Missing enum tag');
        tag=tags[0][1];content=Object.fromEntries(pairs.filter(([key])=>key!==spec.tag));members.set(content,pairs.filter(([key])=>key!==spec.tag));
      }
      scalarString(tag);if(!Object.hasOwn(spec.variants,tag))fail('Unknown tagged variant');
      return Object.assign(Object.create(null),{[spec.tag]:tag},apply(content,spec.variants[tag],encoding,depth+1));
    }
    if(spec.kind==='struct') {
      const selected=new Map(),output=Object.create(null);
      if(!encoding&&Array.isArray(value)) {
        if(value.length>spec.fields.length)fail('Invalid struct sequence length');
        value.forEach((child,index)=>selected.set(spec.fields[index].name,child));
      } else for(const [key,child]of entries(value)) {
        scalarString(key);const field=spec.fields.find(field=>field.name===key||!encoding&&field.aliases?.includes(key));if(!field)continue;
        if(selected.has(field.name))fail('Duplicate field '+field.name);selected.set(field.name,child);
      }
      for(const field of spec.fields) {
        if(!selected.has(field.name)) {
          if(!encoding&&field.default?.kind==='primitive') {
            const literal=typeof field.default.value==='string'?new JsonNumber(field.default.value):field.default.value;
            output[field.name]=apply(literal,field.type,false,depth+1);continue;
          }
          if(field.optional&&(!Array.isArray(value)||encoding||field.sequenceDefault!==false)){if(field.omitNone===false)output[field.name]=null;continue;}
          fail('Missing field '+field.name);
        }
        const child=selected.get(field.name);if(field.optional&&child===null){if(field.omitNone===false)output[field.name]=null;continue;}
        output[field.name]=apply(child,field.type,encoding,depth+1);
      }
      return output;
    }
    fail('Unsupported checked descriptor runtime');
  }
  const codec={root,schema,runtimeAuthority:false,generatedTraitBehavior:false};
  if(direction!=='deserialize')codec.serialize=value=>writeJSON(apply(value,name,true));
  if(direction!=='serialize')codec.deserialize=text=>apply(readJSON(text),name,false);
  return Object.freeze(codec);
}
