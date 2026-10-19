// Constructor ABI isolation, not Rust Clone/Copy or allocator authority.
// Walk iteratively: Vec/slice values retain their existing unbounded length
// domain. Only source-sized arrays use the established 4096-element bound.
import {types} from 'node:util';
const fail=message=>{throw new TypeError('Constructor value domain: '+message);};
const own=(value,key)=>{
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor||!Object.hasOwn(descriptor,'value'))fail('missing field or accessor property');
  return descriptor.value;
};
const scalar=(value,type)=>{
  switch(type.kind){
    case 'unit':return value===null;
    case 'bool':return typeof value==='boolean';
    case 'string':return typeof value==='string'&&!/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value);
    case 'float':return typeof value==='number';
    case 'nat':return typeof value==='bigint'&&value>=0n;
    case 'int':return typeof value==='bigint';
    case 'fixed':{
      if(![8,16,32,64,128].includes(type.bits)||typeof type.signed!=='boolean'||typeof value!=='bigint')return false;
      const bits=BigInt(type.bits),minimum=type.signed?-(1n<<(bits-1n)):0n,maximum=type.signed?(1n<<(bits-1n))-1n:(1n<<bits)-1n;
      return value>=minimum&&value<=maximum;
    }
    default:return false;
  }
};
function walk(value,type,schema,snapshot){
  if(schema?.schemaVersion!==1||!schema.types||typeof schema.types!=='object')fail('missing checked constructor schema');
  const active=new WeakSet(),stack=[];let completed;
  const enter=(current,expected,parent=null,key=null)=>{
    if(expected?.kind==='named')expected={kind:'data',name:(expected.path[0]==='crate'?expected.path.slice(1):expected.path).join('.')};
    if(!expected||typeof expected!=='object')fail('missing checked field type');
    if(!['array','data'].includes(expected.kind)){
      if(snapshot&&!scalar(current,expected))fail('scalar outside its checked source type');
      return {value:current,immutable:true,parent,key};
    }
    if(!current||typeof current!=='object'||types.isProxy(current))fail('proxy or nonobject aggregate');
    if(active.has(current))fail('cyclic constructor value');
    const keys=Reflect.ownKeys(current),prototype=Object.getPrototypeOf(current);
    let fields,result;
    if(expected.kind==='array'){
      if(!Array.isArray(current)||prototype!==Array.prototype)fail('array requires an ordinary dense layout');
      const length=own(current,'length');
      if(!Number.isSafeInteger(length)||length<0||keys.length!==length+1)fail('array holes or extra fields');
      if(expected.rustFixedArray&&(!Number.isSafeInteger(expected.rustFixedArray.length)||expected.rustFixedArray.length<0||expected.rustFixedArray.length>4096||length!==expected.rustFixedArray.length))fail('fixed-array length differs from its source type');
      for(const key of keys)if(key!=='length'&&(typeof key!=='string'||!/^(?:0|[1-9][0-9]*)$/u.test(key)||Number(key)>=length))fail('array holes or extra fields');
      fields={length};result=snapshot?[]:null;
    }else{
      if(Array.isArray(current)||(prototype!==Object.prototype&&prototype!==null))fail('record has an unsupported prototype');
      const layout=Object.hasOwn(schema.types,expected.name)?schema.types[expected.name]:null;
      if(layout?.kind!=='data'||!Array.isArray(layout.ctors))fail('unknown checked data layout');
      const tag=own(current,'$'),ctor=layout.ctors.find(candidate=>candidate.name===tag);
      if(!ctor||!Array.isArray(ctor.fields))fail('unknown checked constructor');
      const allowed=new Set(['$']);for(const field of ctor.fields)allowed.add(field.name);
      if(keys.length!==allowed.size)fail('constructor has missing or extra fields');
      for(const key of keys)if(typeof key!=='string'||!allowed.has(key))fail('constructor has missing or extra fields');
      fields=ctor.fields;result=snapshot?Object.create(prototype):null;
      if(snapshot)Object.defineProperty(result,'$',{value:tag,enumerable:true,writable:true,configurable:true});
    }
    active.add(current);
    const frame={current,expected,parent,key,fields,result,index:0,immutable:Object.isFrozen(current),root:parent===null};
    stack.push(frame);return null;
  };
  const accept=part=>{
    if(!part.parent){completed=part.value;return;}
    part.parent.immutable&&=part.immutable;
    if(snapshot)Object.defineProperty(part.parent.result,part.key,{value:part.value,enumerable:true,writable:true,configurable:true});
  };
  const first=enter(value,type);if(first)accept(first);
  while(stack.length){
    const frame=stack[stack.length-1],array=frame.expected.kind==='array',length=frame.fields.length;
    if(frame.index<length){
      const index=frame.index++,field=array?{name:String(index),type:frame.expected.element}:frame.fields[index];
      const child=enter(own(frame.current,field.name),field.type,frame,field.name);if(child)accept(child);
    }else{
      stack.pop();active.delete(frame.current);
      // Existing immutable nominal values may carry registered host identity.
      // Their original guards/refinements run before this output snapshot.
      const result=!snapshot?frame.current:frame.expected.kind==='data'&&frame.immutable&&!frame.root?frame.current:Object.freeze(frame.result);
      accept({value:result,immutable:frame.immutable,parent:frame.parent,key:frame.key});
    }
  }
  return completed;
}
export function assertConstructorInput(value,type,schema){walk(value,type,schema,false);return true;}
export function snapshotConstructorValue(value,type,schema){return walk(value,type,schema,true);}
