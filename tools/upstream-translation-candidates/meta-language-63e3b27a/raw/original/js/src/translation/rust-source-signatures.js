// Structured, owned facts from actual parsed headers. No raw source or hash.
import {readRuntimeProjectData} from '../project-data-loader.js';
import {unsupported,typeError} from './diagnostics.js';
import {typeKey} from './types.js';
import {acceptProgramIntegralMetadata} from '../program-numeric-metadata-rules.js';
import {acceptRustSourceLifetimeBinding} from './rust-indirection-rules.js';
import {acceptRustSourceSignatureModel,acceptRustSourceSignaturePrimitive,acceptRustSourceSignatureWrapper,acceptRustSourceSignatureOwnerKind} from './rust-source-signature-rules.js';
export const RUST_SOURCE_SIGNATURE_POLICY=readRuntimeProjectData(new URL('./data/rust-source-signatures.lino',import.meta.url));

export function readRustSourceTypeOwner(parser,head,children,type) {
  const owner=(kind,path,arguments_)=>({kind,path,arguments:arguments_});
  if(head[0]==='&') {
    if(head.includes('['))return owner('slice',[],children);
    if(children.length)return children[0];
    const declared=parser.origins.lookup(['str'],parser.modulePath,RUST_SOURCE_SIGNATURE_POLICY.typeOwnerKinds)??parser.origins.lookup(parser.resolve(['str'],parser.modulePath),parser.modulePath,RUST_SOURCE_SIGNATURE_POLICY.typeOwnerKinds);
    return declared?owner('declaration',declared.fullName.split('.'),[]):owner('primitive',['str'],[]);
  }
  if(head[0]==='(') {
    if(type.kind==='unit')return owner('unit',[],[]);
    if(type.kind==='tuple')return owner('tuple',[],children);
    return children[0];
  }
  const resolved=parser.resolve(head,parser.modulePath);
  const declared=parser.origins.lookup(head,parser.modulePath,RUST_SOURCE_SIGNATURE_POLICY.typeOwnerKinds)??parser.origins.lookup(resolved,parser.modulePath,RUST_SOURCE_SIGNATURE_POLICY.typeOwnerKinds);
  if(declared)return owner('declaration',declared.fullName.split('.'),children);
  const library=RUST_SOURCE_SIGNATURE_POLICY.libraries[head.join('::')]??Object.values(RUST_SOURCE_SIGNATURE_POLICY.libraries).find(path=>path.join('::')===resolved.join('::'));
  if(library)return owner('library',[...library],children);
  if(head.length===1&&Object.hasOwn(RUST_SOURCE_SIGNATURE_POLICY.primitives,head[0]))return owner('primitive',[...head],children);
  return owner('declaration',resolved,children);
}

export function readRustSourceTypeHead(cursor) {
  const first=cursor.peek().value;
  if(['&','('].includes(first)) {
    const head=[first];
    if(first==='&') {
      let at=1;if(cursor.is("'",at))at+=2;
      if(cursor.is('[',at))head.push('[');
    }
    return head;
  }
  const path=[first];let at=1;
  while(cursor.is('::',at)&&cursor.peek(at+1).kind==='identifier'){path.push(cursor.peek(at+1).value);at+=2;}
  return path;
}

export function createRustSourceSignature(model,parameters,result,lifetimeBindings) {
  if(!acceptRustSourceSignatureModel(model)||!model)throw unsupported('Rust source signature model','select Rust source function signature 1');
  const position=origin=>({type:structuredClone(origin.type),wrappers:[...origin.wrappers],lifetimes:[...(origin.sourceLifetimes??[])],owner:structuredClone(origin.sourceOwner)});
  return {model,language:'Rust',parameters:parameters.map(position),result:position(result),lifetimeBindings:[...lifetimeBindings]};
}

export function checkRustSourceSignature(signature,parameters,result,language,resolveType=value=>value) {
  const policy=RUST_SOURCE_SIGNATURE_POLICY;
  let visits=0;
  const exact=(value,keys)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))throw typeError('an owned Rust source signature has unrecognized or missing fields');};
  exact(signature,policy.fields.signature);
  if(signature.model!==policy.model||signature.language!==policy.language||language!==policy.language)throw typeError('an owned Rust source signature has an unsupported model or language');
  if(!Array.isArray(signature.parameters)||signature.parameters.length!==parameters.length||!Array.isArray(signature.lifetimeBindings)||signature.lifetimeBindings.some(value=>typeof value!=='string'||!acceptRustSourceLifetimeBinding(value,false,false))||new Set(signature.lifetimeBindings).size!==signature.lifetimeBindings.length)throw typeError('an owned Rust source signature has inconsistent parameter or lifetime bindings');
  function valueType(value,allowNamed=false,depth=0) {
    if(++visits>100000||depth>256)throw typeError('an owned Rust source signature exceeds its resource limit');
    if(allowNamed&&value?.kind==='named') {
      const keys=Object.keys(value);
      if(keys.some(key=>!['kind','path','span'].includes(key))||!Array.isArray(value.path)||value.path.some(part=>typeof part!=='string'))throw typeError('an owned Rust source type has unrecognized value-type fields');
      return;
    }
    const fields=policy.valueTypeFields[value?.kind];
    if(!fields)throw typeError('an owned Rust source type has an unsupported value type');
    exact(value,fields);
    if(value.kind==='fixed'&&(!acceptProgramIntegralMetadata(value.kind,'bits',value.bits,Object.is(value.bits,-0))||typeof value.signed!=='boolean'))throw typeError('an owned Rust source type has invalid fixed-width metadata');
    if(value.kind==='array')valueType(value.element,allowNamed,depth+1);
    if(value.kind==='tuple') {if(!Array.isArray(value.elements))throw typeError('an owned Rust source tuple has invalid fields');value.elements.forEach(child=>valueType(child,allowNamed,depth+1));}
  }
  function owner(value,type,depth=0) {
    if(++visits>100000||depth>256)throw typeError('an owned Rust source signature exceeds its resource limit');
    exact(value,policy.fields.owner);
    if(!acceptRustSourceSignatureOwnerKind(value.kind)||!Array.isArray(value.path)||value.path.some(part=>typeof part!=='string'||!part)||!Array.isArray(value.arguments))throw typeError('an owned Rust source type has an invalid owner');
    const path=value.path.join('::');
    if(value.kind==='primitive') {
      if(value.path.length!==1||value.arguments.length||!acceptRustSourceSignaturePrimitive(type.kind,path,String(type.bits??''),Boolean(type.signed)))throw typeError('an owned Rust source primitive differs from its value type');
    } else if(value.kind==='declaration') {
      if(!value.path.length||value.arguments.length||type.kind!=='data'||value.path.join('.')!==type.name)throw typeError('an owned Rust source declaration differs from its value type');
    } else if(value.kind==='unit') {
      if(value.path.length||value.arguments.length||type.kind!=='unit')throw typeError('an owned Rust source unit differs from its value type');
    } else if(value.kind==='tuple') {
      if(value.path.length||type.kind!=='tuple'||value.arguments.length!==type.elements.length)throw typeError('an owned Rust source tuple differs from its value type');
      value.arguments.forEach((child,index)=>owner(child,type.elements[index],depth+1));
    } else if(value.kind==='slice'||path==='std::vec::Vec') {
      if(value.kind==='slice'&&value.path.length||type.kind!=='array'||value.arguments.length!==1)throw typeError('an owned Rust source array differs from its value type');
      owner(value.arguments[0],type.element,depth+1);
    } else if(path==='std::boxed::Box'||path==='alloc::boxed::Box') {
      if(value.arguments.length!==1)throw typeError('an owned Rust source box has invalid arguments');
      owner(value.arguments[0],type,depth+1);
    } else if(path==='std::string::String') {
      if(value.arguments.length||type.kind!=='string')throw typeError('an owned Rust source string differs from its value type');
    } else throw typeError('an owned Rust source type has an unsupported owner');
  }
  const position=(value,expected)=>{
    exact(value,policy.fields.position);
    valueType(value.type,true);
    const type=resolveType(value.type);
    valueType(type);
    if(typeKey(type)!==typeKey(expected))throw typeError('an owned Rust source signature differs from its function type');
    if(!Array.isArray(value.wrappers)||value.wrappers.some(wrapper=>!acceptRustSourceSignatureWrapper(wrapper))||!Array.isArray(value.lifetimes)||value.lifetimes.length!==value.wrappers.filter(wrapper=>wrapper==='reference').length||value.lifetimes.some(lifetime=>lifetime!==null&&(typeof lifetime!=='string'||!signature.lifetimeBindings.includes(lifetime)&&!policy.specialLifetimes.includes(lifetime))))throw typeError('an owned Rust source type has inconsistent wrapper or lifetime facts');
    owner(value.owner,type);
    let boxed = 0, leaf = value.owner;
    while (leaf.kind === 'library' && ['std::boxed::Box','alloc::boxed::Box'].includes(leaf.path.join('::'))) { boxed += 1; leaf = leaf.arguments[0]; }
    if (boxed !== value.wrappers.filter(wrapper=>wrapper==='box').length ||
      ((leaf.kind==='slice'||leaf.kind==='primitive'&&leaf.path[0]==='str')&&!value.wrappers.includes('reference'))) throw typeError('an owned Rust source type has inconsistent owner and wrapper facts');
    return {...value,type};
  };
  return {...signature,parameters:signature.parameters.map((value,index)=>position(value,parameters[index])),result:position(signature.result,result)};
}
