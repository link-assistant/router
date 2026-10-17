import { SerializationRefusal, freeze } from './extract.mjs';
import { requireCheckedSerializationMeta } from './meta.mjs';
const refuse = message => { throw new SerializationRefusal(message); };
function helpers(attributes, allowed) {
  const values=[];
  for(const attribute of attributes) {
    if(attribute.name !== 'serde') continue;
    for(const helper of attribute.helpers ?? []) {
      if(!allowed.includes(helper.key)) refuse('Serde '+helper.key+' requires a separately proven serialization projection');
      if(helper.key !== 'alias' && values.some(value=>value.key===helper.key)) refuse('Conflicting original Serde helpers');
      values.push(helper);
    }
  }
  return values;
}
const value = (entries,name) => entries.find(entry=>entry.key===name)?.value ?? null;
function renamed(name, entries, rule, position) {
  const explicit=value(entries,'rename');if(explicit!==null)return explicit;
  if(!rule)return name;
  if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))refuse('Non-ASCII rename_all requires a separately checked character projection');
  // Exact bounded ASCII branches from locked serde_derive internals/case.rs.
  const snake = name.replace(/[A-Z]/g,(letter,index)=>(index?'_':'')+letter.toLowerCase());
  if(position==='variant') {
    switch(rule) {
      case 'lowercase':return name.toLowerCase();case 'UPPERCASE':return name.toUpperCase();case 'PascalCase':return name;
      case 'camelCase':return name[0].toLowerCase()+name.slice(1);case 'snake_case':return snake;
      case 'SCREAMING_SNAKE_CASE':return snake.toUpperCase();case 'kebab-case':return snake.replaceAll('_','-');case 'SCREAMING-KEBAB-CASE':return snake.toUpperCase().replaceAll('_','-');
    }
  } else {
    const pascal=name.split('_').map(part=>part?part[0].toUpperCase()+part.slice(1):'').join('');
    switch(rule) {
      case 'lowercase':case 'snake_case':return name;case 'UPPERCASE':case 'SCREAMING_SNAKE_CASE':return name.toUpperCase();
      case 'PascalCase':return pascal;case 'camelCase':return pascal?pascal[0].toLowerCase()+pascal.slice(1):pascal;
      case 'kebab-case':return name.replaceAll('_','-');case 'SCREAMING-KEBAB-CASE':return name.toUpperCase().replaceAll('_','-');
    }
  }
  refuse('Unknown pinned Serde rename rule');
}
const sourceLabel = type => type.source.replace(/^src\//,'')+'::'+type.name;
export function projectSerializationDescriptor(input) {
  const meta=requireCheckedSerializationMeta(input), names=new Map(), result=Object.create(null);
  for(const type of meta.types) { if([...names.values()].includes(type.name))refuse('Distinct qualified source owners collide in the ordinary store ABI: '+type.name);names.set(type.owner,type.name); }
  function projectType(type) {
    if(type.kind==='primitive')return type.name;
    if(['json-value','json-map'].includes(type.kind)) {
      if((meta.direction??'both')!=='serialize')refuse('Actual serde_json decoding profile remains refused: '+(type.sourceProof.actualParserProfile.diagnostic??'separate numeric/typed visitor proof required'));
      return {kind:type.kind,owner:type.owner,sourceProfileSha256:type.sourceProof.profileSha256,domain:type.sourceProof.domain,finiteFloatFormattingAvailable:false,manualTraitCompleteness:false};
    }
    if(type.kind==='named'){if(!names.has(type.owner))refuse('Missing reachable serialization owner');return names.get(type.owner);}
    if(type.kind==='vec')return {kind:'vec',type:projectType(type.type)};
    refuse('Nested Option requires a separately proven descriptor ABI');
  }
  function projectFields(fields, rule) {
    const emitted=new Set(),accepted=new Map();
    return fields.map(field=>{
      const entries=helpers(field.attributes,['rename','alias','default','skip_serializing_if']);
      if(entries.some(entry=>entry.key==='default' && entry.value!==null))refuse('Custom serde default function remains opaque');
      const optional=field.type.kind==='option', name=renamed(field.name,entries,rule,'field');
      if(emitted.has(name))refuse('Renamed field collision');emitted.add(name);
      const aliases=[...new Set(entries.filter(entry=>entry.key==='alias').map(entry=>entry.value))].filter(alias=>alias!==name);
      for(const spelling of [name,...aliases]) {
        if(typeof spelling!=='string')refuse('Field alias requires its actual original string spelling');
        if(accepted.has(spelling))refuse('Field alias collides with another canonical field or alias');accepted.set(spelling,name);
      }
      if(optional) {
        const skip=value(entries,'skip_serializing_if');
        if(field.type.owner!=='rust-prelude::Option'||skip!==null&&skip!=='Option::is_none')refuse('Optional omission lacks the checked standard Option::is_none identity');
      } else {
        if(entries.some(entry=>entry.key==='skip_serializing_if'))refuse('Non-Option omission requires a separately checked original predicate');
        if(entries.some(entry=>entry.key==='default')&&!field.defaultProof)refuse('Non-Option default requires a separately checked original Default body');
      }
      return {name,type:projectType(optional?field.type.type:field.type),optional,...(aliases.length?{aliases}:{}),...(field.defaultProof?{default:field.defaultProof.schema==='original-json-value-default-v1'?{kind:'json-value',value:field.defaultProof.value}:{kind:'primitive',value:field.defaultProof.checkedLiteral.value}}:{}),...(optional&&value(entries,'skip_serializing_if')===null?{omitNone:false}:{}),...(optional&&!entries.some(entry=>entry.key==='default')?{sequenceDefault:false}:{})};
    });
  }
  for(const type of meta.types) {
    const entries=helpers(type.attributes.filter(attribute=>attribute.position==='container'),type.kind==='enum'?['rename_all','rename','tag']:['rename','rename_all']);
    const rule=value(entries,'rename_all'), source=sourceLabel(type);
    if(type.kind==='struct')result[type.name]={kind:'struct',source,fields:projectFields(type.fields,rule)};
    else {
      const tag=value(entries,'tag'), unit=type.variants.every(variant=>variant.layout==='unit'), namesSeen=new Set(), variants=[], aliases=Object.create(null), tagged=Object.create(null);
      if(tag!==null && unit || tag===null && !unit)refuse('Only plain unit enums or internally tagged named variants are projected');
      for(const variant of type.variants) {
        const metadata=helpers(variant.attributes,tag!==null?['rename']:['rename','alias']);
        const name=renamed(variant.name,metadata,rule,'variant');if(namesSeen.has(name))refuse('Renamed enum variant collision');namesSeen.add(name);
        if(tag!==null) {
          const fields=projectFields(variant.fields,null);if(fields.some(field=>field.name===tag||field.aliases?.includes(tag)))refuse('Internal tag conflicts with a named field or its alias');
          tagged[name]={kind:'struct',source:source+'::'+variant.name,fields};
        } else {variants.push(name);for(const entry of metadata.filter(value=>value.key==='alias')) {if(Object.hasOwn(aliases,entry.value))refuse('Alias collision');aliases[entry.value]=name;} }
      }
      if(Object.keys(aliases).some(alias=>namesSeen.has(alias)))refuse('Alias collides with another canonical variant');
      result[type.name]=tag!==null?{kind:'tagged',source,tag,variants:tagged}:{kind:'enum',source,variants,...(Object.keys(aliases).length?{aliases}:{})};
    }
  }
  return freeze(result);
}
function literal(value) {
  if(Array.isArray(value))return '['+value.map(literal).join(',')+']';
  if(value && typeof value==='object')return '{'+Object.entries(value).map(([key,child])=>'['+JSON.stringify(key)+']:'+literal(child)).join(',')+'}';
  return JSON.stringify(value);
}
// JS and TS descriptor data originate in the same checked meta projection.
export function emitSerializationDescriptor(meta,{language='javascript',exportName='serializationSchema'}={}) {
  if(!['javascript','typescript'].includes(language)||!/^[$A-Z_a-z][$\w]*$/.test(exportName)||new Set('await break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof let new null return super switch this throw true try typeof var void while with yield implements interface package private protected public static'.split(' ')).has(exportName))refuse('Unsupported descriptor emitter options');
  const descriptor=projectSerializationDescriptor(meta);
  return '// Checked bounded original serialization schema; generated trait/runtime parity remains unproved.\nexport const '+exportName+' = '+literal(descriptor)+(language==='typescript'?' as const':'')+';\n';
}
