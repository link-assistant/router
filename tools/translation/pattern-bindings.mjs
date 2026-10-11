// Typed projection plans for destructuring and refutable control flow.
// These plans inspect declarations, never evaluate or rewrite Rust source.
import {fixedBounds,typeKey,sameType} from './vendor/meta-language/translation/types.js';
import {unsupported,typeError} from './vendor/meta-language/translation/diagnostics.js';
const always=()=>({kind:'always'});
const combine=(kind,tests)=>{const useful=tests.filter(test=>test.kind !== 'always');return useful.length?useful.length === 1?useful[0]:{kind,tests:useful}:always();};
const equalProjection=(left,right)=>left.length === right.length && left.every((field,index)=>field === right[index]);
const scalar=value=>typeof value === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value);
export function planPattern(pattern,type,{declarations,resolveType,span}={}) {
  if(!(declarations instanceof Map))throw new TypeError('Pattern checking requires the actual checked declaration Map');
  const active=new Set(),fallbackSpan=span ?? pattern?.span;
  function checkedType(current,location) {
    if(current?.kind === 'array')return {...current,element:checkedType(current.element,location)};
    if(current?.kind === 'data'){if(declarations.get(current.name)?.k !== 'data')throw typeError(`unresolved pattern layout ${current.name}`,location);return current;}
    if(current?.kind !== 'named') {
      if(!current || !['fixed','bool','string','unit','nat','int','float'].includes(current.kind))throw unsupported('pattern type','a checked portable type is required',location);
      return current;
    }
    if(resolveType){const resolved=resolveType(current,location);if(resolved?.kind === 'named')throw typeError('pattern type resolver left a named type unresolved',location);return checkedType(resolved,location);}
    const path=current.path[0] === 'crate'?current.path.slice(1):current.path;
    const name=path.join('.'),entry=declarations.get(name);
    if(!entry || entry.k !== 'data')throw typeError(`unresolved pattern type ${name}`,location);
    return {kind:'data',name};
  }
  function layout(current,location) {
    current=checkedType(current,location);
    const entry=current?.kind === 'data'?declarations.get(current.name):null;
    if(!entry || entry.k !== 'data' || !Array.isArray(entry.ctors))throw typeError(`pattern needs an actual algebraic layout, got ${current?typeKey(current):'missing type'}`,location);
    return {type:current,entry};
  }
  function bind(name,current,projection,location) {
    if(name === '_')return {refutable:false,bindings:[],test:always()};
    if(typeof name !== 'string' || !/^[\p{L}_][\p{L}\p{N}_]*$/u.test(name))throw typeError('pattern binding has an invalid identifier',location);
    return {refutable:false,bindings:[{name,type:current,projection:[...projection],span:location ?? null}],test:always()};
  }
  function merge(children,location) {
    const bindings=[],names=new Set();
    for(const child of children)for(const binding of child.bindings) {
      if(names.has(binding.name))throw typeError(`duplicate pattern binding ${binding.name}`,binding.span ?? location);
      names.add(binding.name);bindings.push(binding);
    }
    return bindings;
  }
  function constructorName(node,current,location) {
    const name=node.ctor ?? node.path?.at(-1),owner=node.data;
    if(owner && (typeof owner === 'string'?owner:owner.name) !== current.name)throw typeError(`constructor pattern belongs to ${typeof owner === 'string'?owner:owner.name}, not ${current.name}`,location);
    if(node.path?.length > 1) {
      const path=node.path.slice(0,-1),qualified=path[0] === 'crate'?path.slice(1):path;
      if(qualified.join('.') !== current.name) {
        const resolved=resolveType?checkedType({kind:'named',path},location):null;
        if(resolved?.kind !== 'data' || resolved.name !== current.name)throw typeError(`${node.path.join('::')} is not a constructor of ${current.name}`,location);
      }
    }
    return name;
  }
  function constructor(node,current,projection,location,record=false,tuple=false) {
    const {type,entry}=layout(current,location);
    let name=constructorName(node,type,location);
    if(!name && (record || tuple) && entry.ctors.length === 1)name=entry.ctors[0].name;
    const ctor=entry.ctors.find(candidate=>candidate.name === name);
    if(!ctor)throw typeError(`${type.name} has no constructor ${name ?? '(unspecified)'}`,location);
    const fields=ctor.fields.map((field,index)=>({...field,name:field.name ?? `field${index}`,type:checkedType(field.type,location)}));
    let children;
    if(record) {
      if(!Array.isArray(node.fields))throw typeError('record pattern has no named field list',location);
      if(node.rest !== undefined && typeof node.rest !== 'boolean')throw typeError('record rest marker is not a checked boolean',location);
      const names=new Set();children=node.fields.map(field=>{
        if(names.has(field.name))throw typeError(`duplicate record pattern field ${field.name}`,field.span ?? location);names.add(field.name);
        const declared=fields.find(candidate=>candidate.name === field.name);
        if(!declared)throw typeError(`${type.name}::${name} has no field ${field.name}`,field.span ?? location);
        return visit(field.pattern ?? {k:'bind',name:field.name,span:field.span},declared.type,[...projection,declared.name]);
      });
      if(!node.rest && names.size !== fields.length)throw typeError(`record pattern names ${names.size} of ${fields.length} fields without rest`,location);
    } else {
      if(tuple && entry.tuple !== true)throw unsupported('tuple pattern','requires an actual checked tuple layout, not a tuple-struct or another algebraic constructor',location);
      if(!tuple && !fields.every((field,index)=>field.name === `field${index}`))throw unsupported('tuple constructor pattern','named-field layout requires a record pattern',location);
      const patterns=tuple?node.items:node.args ?? node.patterns ?? node.binds?.map(name=>({k:'bind',name})) ?? [];
      if(!Array.isArray(patterns) || patterns.length !== fields.length)throw typeError(`${name} pattern names ${patterns?.length ?? 0} of ${fields.length} fields`,location);
      children=patterns.map((child,index)=>visit(child,fields[index].type,[...projection,fields[index].name]));
    }
    const refutable=entry.ctors.length !== 1 || children.some(child=>child.refutable);
    const tagTest=entry.ctors.length === 1?always():{kind:'ctor',data:type.name,ctor:name,projection:[...projection]};
    return {refutable,bindings:merge(children,location),test:combine('and',[tagTest,...children.map(child=>child.test)]),
      coverage:children.every(child=>!child.refutable)?{data:type.name,ctors:[name],universe:entry.ctors.map(ctor=>ctor.name)}:null};
  }
  function literal(node,current,projection,location) {
    let raw=node.k === 'lit'?node.value:node;
    if(raw && typeof raw === 'object' && raw.k === 'lit')raw=raw.value;
    let value,category;
    if(['bool','boolLit'].includes(raw?.k) || typeof raw === 'boolean') {
      value=typeof raw === 'boolean'?raw:raw.value;category='bool';
      if(typeof value !== 'boolean' || current.kind !== 'bool')throw typeError('boolean pattern has the wrong checked type',location);
    } else if(['str','strLit'].includes(raw?.k) || typeof raw === 'string' && current.kind === 'string') {
      value=typeof raw === 'string'?raw:raw.value;category='string';
      if(current.kind !== 'string' || !scalar(value))throw typeError('string pattern is outside the checked Unicode scalar domain',location);
    } else if(raw?.k === 'unit' || raw === null) {
      if(current.kind !== 'unit')throw typeError('unit pattern has the wrong checked type',location);
      return {refutable:false,bindings:[],test:always()};
    } else {
      if(!['fixed','nat','int'].includes(current.kind))throw typeError('numeric pattern has the wrong checked type',location);
      if(node.suffix) {
        const suffix=/^([ui])(8|16|32|64|128|size)$/u.exec(node.suffix),bits=suffix?.[2] === 'size'?64:Number(suffix?.[2]);
        if(!suffix || current.kind !== 'fixed' || current.bits !== bits || current.signed !== (suffix[1] === 'i'))throw typeError('numeric pattern suffix has the wrong checked type',location);
      }
      try {value=BigInt(typeof raw === 'object'?raw.value:raw)*(raw?.negative?-1n:1n);}catch{throw typeError('numeric pattern is not an exact integer',location);}
      if(current.kind === 'nat' && value < 0n)throw typeError('negative pattern for a natural type',location);
      if(current.kind === 'fixed'){const {min,max}=fixedBounds(current);if(value < min || value > max)throw typeError(`pattern literal is outside ${typeKey(current)}`,location);}
      value=value.toString();category='integer';
    }
    return {refutable:true,bindings:[],test:{kind:'literal',type:current,value,projection:[...projection]},coverage:category === 'bool'?{booleans:[value]}:null};
  }
  function alternatives(node,current,projection,location) {
    const patterns=node.alternatives ?? node.patterns;
    if(!Array.isArray(patterns) || !patterns.length)throw typeError('or-pattern requires nonempty alternatives',location);
    const plans=patterns.map(pattern=>visit(pattern,current,projection)),baseline=plans[0].bindings;
    for(const plan of plans.slice(1)) {
      if(plan.bindings.length !== baseline.length)throw typeError('or-pattern alternatives must bind the same names',location);
      for(const binding of baseline) {
        const other=plan.bindings.find(candidate=>candidate.name === binding.name);
        if(!other || !sameType(binding.type,other.type))throw typeError('or-pattern alternatives must bind the same names and types',location);
        if(!equalProjection(binding.projection,other.projection))throw unsupported('or-pattern binding','different branch projections require conditional binding lowering',location);
      }
    }
    let exhaustive=plans.some(plan=>!plan.refutable);
    if(!exhaustive && current.kind === 'bool')exhaustive=[true,false].every(value=>plans.some(plan=>plan.coverage?.booleans?.includes(value)));
    if(!exhaustive && current.kind === 'data') {
      const {entry}=layout(current,location);
      exhaustive=entry.ctors.every(ctor=>plans.some(plan=>plan.coverage?.data === current.name && plan.coverage.ctors.includes(ctor.name)));
    }
    return {refutable:!exhaustive,bindings:baseline,test:exhaustive && plans.some(plan=>plan.test.kind === 'always')?always():{kind:'or',tests:plans.map(plan=>plan.test)}};
  }
  function visit(node,current,projection=[]) {
    const location=node?.span ?? fallbackSpan,currentType=checkedType(current,location);
    if(!node || typeof node !== 'object' || !currentType)throw typeError('pattern or its checked type is missing',location);
    if(active.has(node))throw typeError('cyclic pattern structure',location);
    if(node.mutable || node.mut || node.ref || node.byRef || node.reference || node.borrow || node.bindingMode && !['value','checked-copy'].includes(node.bindingMode) || node.ownership && node.ownership !== 'checked-copy')throw unsupported('pattern binding ownership','mutable/reference bindings need an explicit checked ownership contract',location);
    active.add(node);let result;
    try {
      switch(node.k) {
        case 'wild':result={refutable:false,bindings:[],test:always()};break;
        case 'bind':result=bind(node.name,currentType,projection,location);break;
        case 'bindOrCtor': {
          if(currentType.kind === 'data' && declarations.get(currentType.name)?.ctors.some(ctor=>ctor.name === node.name))result=constructor({k:'ctor',ctor:node.name,args:[]},currentType,projection,location);
          else result=bind(node.name,currentType,projection,location);break;
        }
        case 'ctor':case 'data':result=constructor(node,currentType,projection,location);break;
        case 'routerRecordPattern':result=constructor(node,currentType,projection,location,true);break;
        case 'routerTuplePattern':result=constructor(node,currentType,projection,location,false,true);break;
        case 'or':case 'routerOrPattern':result=alternatives(node,currentType,projection,location);break;
        case 'lit':case 'numLit':case 'boolLit':case 'strLit':result=literal(node,currentType,projection,location);break;
        default:throw unsupported('pattern',`${node.k} needs separate checked pattern semantics`,location);
      }
    } finally {active.delete(node);}
    return result;
  }
  const {refutable,bindings,test}=visit(pattern,type);
  return {refutable,bindings,test,diagnostics:[]};
}
