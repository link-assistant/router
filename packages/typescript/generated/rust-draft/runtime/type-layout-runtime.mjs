// Pure schema validation for the generated immutable Rust value domain.
// This file has no compiler, vendor, filesystem or process dependencies.
const scalar=value=>typeof value === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value);
const typeKey=type=>type.kind === 'data'?`data:${type.name}`:type.kind === 'array'?`array:${typeKey(type.element)}`:type.kind === 'fixed'?`${type.signed?'i':'u'}${type.bits}`:type.kind;
const failure=(path,message)=>{throw new TypeError(`Rust value domain ${path}: ${message}`);};
const own=(value,key,path)=>{
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor || !Object.hasOwn(descriptor,'value'))failure(path,'missing field or accessor property');
  return descriptor.value;
};
export function validateRustValue(value,type,schema,{refinements=new Map()}={}) {
  if(schema?.schemaVersion !== 1 || !schema.types || typeof schema.types !== 'object')throw new TypeError('Unsupported Rust value schema');
  if(!(refinements instanceof Map))throw new TypeError('Registered data refinements must be a Map');
  for(const [name,refinement] of refinements)if(!Object.hasOwn(schema.types,name) || typeof refinement !== 'function')throw new TypeError('Invalid registered data refinement');
  const active=new WeakSet(),completed=new WeakMap();
  const visit=(current,expected,path)=>{
    if(!expected || typeof expected !== 'object')failure(path,'missing checked type');
    if(expected.kind === 'named')expected={kind:'data',name:(expected.path[0] === 'crate'?expected.path.slice(1):expected.path).join('.')};
    switch(expected.kind) {
      case 'unit':if(current !== null)failure(path,'expected unit null');return;
      case 'bool':if(typeof current !== 'boolean')failure(path,'expected boolean');return;
      case 'string':if(!scalar(current))failure(path,'expected Unicode scalar string');return;
      case 'float':if(typeof current !== 'number')failure(path,'expected IEEE754 binary64');return;
      case 'nat':if(typeof current !== 'bigint' || current < 0n)failure(path,'expected natural BigInt');return;
      case 'int':if(typeof current !== 'bigint')failure(path,'expected integer BigInt');return;
      case 'fixed': {
        if(![8,16,32,64,128].includes(expected.bits) || typeof expected.signed !== 'boolean')failure(path,'invalid machine-integer schema');
        const width=BigInt(expected.bits),minimum=expected.signed?-(1n<<(width-1n)):0n,maximum=expected.signed?(1n<<(width-1n))-1n:(1n<<width)-1n;
        if(typeof current !== 'bigint' || current < minimum || current > maximum)failure(path,'machine-integer value out of range');return;
      }
      case 'array':case 'data':break;
      default:failure(path,'unsupported checked type');
    }
    if(!current || typeof current !== 'object')failure(path,'expected algebraic object or array');
    if(active.has(current))failure(path,'cyclic value');
    const key=typeKey(expected),previous=completed.get(current);if(previous?.has(key))return;
    active.add(current);
    try {
      const keys=Reflect.ownKeys(current);
      if(expected.kind === 'array') {
        if(!Array.isArray(current))failure(path,'expected immutable array layout');
        const length=own(current,'length',path);
        if(keys.length !== length+1)failure(path,'array holes or extra properties');
        for(const name of keys)if(name !== 'length' && (typeof name !== 'string' || !/^(?:0|[1-9][0-9]*)$/u.test(name) || Number(name) >= length))failure(path,'array holes or extra properties');
        for(let index=0;index<length;index++)visit(own(current,String(index),`${path}[${index}]`),expected.element,`${path}[${index}]`);
      } else {
        if(Array.isArray(current))failure(path,'data constructor cannot be an array');
        const prototype=Object.getPrototypeOf(current);if(prototype !== null && prototype !== Object.prototype)failure(path,'data constructor has an unsupported prototype');
        const layout=Object.hasOwn(schema.types,expected.name)?schema.types[expected.name]:null;
        if(!layout || layout.kind !== 'data')failure(path,'unknown data layout');
        const tag=own(current,'$',path),ctor=layout.ctors.find(candidate=>candidate.name === tag);
        if(!ctor)failure(path,'unknown data constructor');
        const allowed=new Set(['$',...ctor.fields.map(field=>field.name)]);
        if(keys.length !== allowed.size || keys.some(name=>typeof name !== 'string' || !allowed.has(name)))failure(path,'constructor has missing or extra fields');
        for(const field of ctor.fields)visit(own(current,field.name,`${path}.${field.name}`),field.type,`${path}.${field.name}`);
        const refine=refinements.get(expected.name);
        if(refine && refine(current,{schema,type:expected,path}) === false)failure(path,'registered data refinement failed');
      }
    } finally {active.delete(current);}
    if(previous)previous.add(key);else completed.set(current,new Set([key]));
  };
  visit(value,type,'$');return true;
}
