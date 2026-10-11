// Stable recursive algebraic layouts for target types and runtime domains.
import {fixedArrayLength} from './checked-types.mjs';
const PRIMITIVES=new Set(['bool','string','unit','float','nat','int']);
export const dataAliasName=name=>'MLData_'+Buffer.from(name,'utf8').toString('hex');
function dataEntries(declarations) {
  if(!(declarations instanceof Map))throw new TypeError('Type layouts require the actual checked declaration Map');
  return [...declarations].filter(([,entry])=>entry.k === 'data').sort(([left],[right])=>left < right?-1:left > right?1:0);
}
function normalizeType(type,declarations) {
  if(!type || typeof type !== 'object')throw new TypeError('Checked type layout is missing');
  if(PRIMITIVES.has(type.kind))return {kind:type.kind};
  if(type.kind === 'fixed') {
    if(![8,16,32,64,128].includes(type.bits) || typeof type.signed !== 'boolean')throw new TypeError('Invalid checked machine-integer layout');
    return {kind:'fixed',bits:type.bits,signed:type.signed};
  }
  if(type.kind === 'array')return {kind:'array',element:normalizeType(type.element,declarations),...(fixedArrayLength(type)!==null?{rustFixedArray:{length:fixedArrayLength(type)}}:{})};
  let name;
  if(type.kind === 'data')name=type.name;
  else if(type.kind === 'named')name=(type.path[0] === 'crate'?type.path.slice(1):type.path).join('.');
  else throw new TypeError(`Unsupported checked type layout: ${type.kind}`);
  if(typeof name !== 'string' || declarations.get(name)?.k !== 'data')throw new TypeError(`Unknown checked data layout: ${name}`);
  return {kind:'data',name};
}
function fieldsOf(ctor,declarations) {
  if(!Array.isArray(ctor.fields))throw new TypeError('Constructor layout has no field list');
  const names=new Set();return ctor.fields.map((field,index)=>{
    const name=field.name ?? `field${index}`;
    if(typeof name !== 'string' || name === '$' || names.has(name))throw new TypeError('Constructor layout has an invalid or duplicate field name');
    names.add(name);return {name,type:normalizeType(field.type,declarations)};
  });
}
export function valueSchema(declarations) {
  const entries=dataEntries(declarations),types=Object.create(null);
  for(const [name,entry] of entries) {
    if(!Array.isArray(entry.ctors))throw new TypeError(`Data layout ${name} has no constructors`);
    const names=new Set(),ctors=entry.ctors.map(ctor=>{
      if(typeof ctor.name !== 'string' || names.has(ctor.name))throw new TypeError('Data layout has an invalid or duplicate constructor');
      names.add(ctor.name);return {name:ctor.name,fields:fieldsOf(ctor,declarations)};
    });
    types[name]={kind:'data',name,ctors};
  }
  return {schemaVersion:1,types};
}
const typeReferences=type=>type.kind === 'data'?[type.name]:type.kind === 'array'?typeReferences(type.element):[];
export function recursiveDataNames(declarations) {
  const schema=valueSchema(declarations),graph=new Map(Object.entries(schema.types).map(([name,entry])=>[name,new Set(entry.ctors.flatMap(ctor=>ctor.fields.flatMap(field=>typeReferences(field.type))))]));
  let next=0;const indices=new Map(),low=new Map(),active=new Set(),stack=[],recursive=new Set();
  const visit=name=>{
    indices.set(name,next);low.set(name,next++);stack.push(name);active.add(name);
    for(const dependency of graph.get(name)) {
      if(!indices.has(dependency)){visit(dependency);low.set(name,Math.min(low.get(name),low.get(dependency)));}
      else if(active.has(dependency))low.set(name,Math.min(low.get(name),indices.get(dependency)));
    }
    if(low.get(name) !== indices.get(name))return;
    const component=[];let item;do{item=stack.pop();active.delete(item);component.push(item);}while(item !== name);
    if(component.length>1 || graph.get(name).has(name))for(const item of component)recursive.add(item);
  };
  for(const name of graph.keys())if(!indices.has(name))visit(name);
  return recursive;
}
function render(type,schema,aliases,active=new Set()) {
  switch(type.kind) {
    case 'fixed':case 'nat':case 'int':return 'bigint';
    case 'float':return 'number';
    case 'bool':return 'boolean';
    case 'string':return 'string';
    case 'unit':return 'null';
    case 'array':return `ReadonlyArray<${render(type.element,schema,aliases,active)}>${type.rustFixedArray?` & { readonly length: ${type.rustFixedArray.length} }`:''}`;
    case 'data': {
      if(aliases.has(type.name))return dataAliasName(type.name);
      if(active.has(type.name))throw new TypeError(`Recursive type ${type.name} requires a named TypeScript alias`);
      const entry=schema.types[type.name];if(!entry)throw new TypeError(`Unknown checked data layout: ${type.name}`);
      active.add(type.name);
      try{return entry.ctors.map(ctor=>'Readonly<{ readonly "$": '+JSON.stringify(ctor.name)+ctor.fields.map(field=>`; readonly ${JSON.stringify(field.name)}: ${render(field.type,schema,aliases,active)}`).join('')+' }>').join(' | ') || 'never';}
      finally{active.delete(type.name);}
    }
    default:throw new TypeError(`Unsupported checked type layout: ${type.kind}`);
  }
}
export function typeScriptType(type,declarations,{aliases=recursiveDataNames(declarations)}={}) {
  if(!(aliases instanceof Set))throw new TypeError('TypeScript alias selection must be a Set');
  const schema=valueSchema(declarations);
  for(const name of aliases)if(!Object.hasOwn(schema.types,name))throw new TypeError(`Unknown TypeScript data alias: ${name}`);
  return render(normalizeType(type,declarations),schema,aliases);
}
export function typeScriptAliases(declarations) {
  const schema=valueSchema(declarations),names=Object.keys(schema.types),aliases=new Set(names);
  return names.map(name=>{
    const entry=schema.types[name];
    const body=entry.ctors.map(ctor=>'Readonly<{ readonly "$": '+JSON.stringify(ctor.name)+ctor.fields.map(field=>`; readonly ${JSON.stringify(field.name)}: ${render(field.type,schema,aliases)}`).join('')+' }>').join(' | ') || 'never';
    return `type ${dataAliasName(name)} = ${body};`;
  }).join('\n');
}
