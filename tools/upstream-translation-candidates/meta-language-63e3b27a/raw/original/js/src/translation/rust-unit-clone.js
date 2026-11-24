import { readRuntimeProjectData } from '../project-data-loader.js';
import { unsupported, typeError } from './diagnostics.js';
import { acceptRustTypeNamespaceUnitClone } from './rust-type-namespace-rules.js';
import { RUST_SOURCE_SIGNATURE_POLICY } from './rust-source-signatures.js';
const policy=readRuntimeProjectData(new URL('./data/rust-type-namespace.lino',import.meta.url));
const fail=()=>{throw typeError('an owned Rust unit Clone derivation has inconsistent actual datatype or attribute facts');};
const equal=(left,right)=>Array.isArray(left)&&left.length===right.length&&left.every((value,index)=>value===right[index]);
const exact=(value,fields)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===fields.length&&fields.every(field=>Object.hasOwn(value,field));

/** Record only a real attached derive attribute and its field-free datatype. */
export function captureRustUnitCloneDerivation(attributes,declaration,path) {
  const occurrences=attributes.flatMap(attribute=>attribute.traits).filter(trait=>trait==='Clone').length;
  if(!occurrences)return null;
  if(attributes.length!==1||occurrences!==1)throw unsupported('Rust unit Clone derivation','one actual attached derive attribute with one Clone argument is required');
  if(declaration.ctors.some(constructor=>constructor.fields.length))return null;
  const proof={model:policy.unitCloneModel,language:policy.language,datatypeOwner:[...path,declaration.name],traitOwner:[...policy.unitCloneTraitOwner],constructorNames:declaration.ctors.map(constructor=>constructor.name),attribute:structuredClone(attributes[0])};
  checkRustUnitCloneDerivation(proof,{...declaration,modulePath:path});
  return proof;
}

/** The owned source fact describes the actual standard unit derive instance. */
export function checkRustUnitCloneDerivation(proof,declaration) {
  if(!declaration||!Array.isArray(declaration.modulePath)||!Array.isArray(declaration.ctors)||declaration.ctors.some(constructor=>!constructor||!Array.isArray(constructor.fields)))fail();
  if(!exact(proof,policy.unitCloneFields)||proof.model!==policy.unitCloneModel||proof.language!==policy.language||declaration.k!=='data'||!equal(proof.datatypeOwner,[...declaration.modulePath,declaration.name])||!equal(proof.traitOwner,policy.unitCloneTraitOwner)||!equal(proof.constructorNames,declaration.ctors.map(constructor=>constructor.name))||declaration.ctors.some(constructor=>constructor.fields.length))fail();
  const attribute=proof.attribute;
  if(!exact(attribute,policy.unitCloneAttributeFields)||attribute.name!=='derive'||!Array.isArray(attribute.traits)||attribute.traits.some(trait=>!policy.unitCloneDeriveArguments.includes(trait))||new Set(attribute.traits).size!==attribute.traits.length||attribute.traits.filter(trait=>trait==='Clone').length!==1)fail();
  for(const trait of attribute.traits)if((policy.unitCloneDeriveDependencies[trait]??[]).some(required=>!attribute.traits.includes(required)))fail();
  if(!exact(attribute.span,['start','end'])||!Number.isSafeInteger(attribute.span.start)||!Number.isSafeInteger(attribute.span.end)||attribute.span.start<0||attribute.span.end<=attribute.span.start||!declaration.span||attribute.span.end>declaration.span.start)fail();
  return proof;
}

/** Validate represented facts before any general graph normalization. */
export function checkRustUnitCloneDerivations(program) {
  for(const declaration of program.declarations.values())if(Object.hasOwn(declaration,'sourceUnitCloneDerivation')) {
    if(program.sourceLanguage!==policy.language||program.imports?.length||program.externals?.length)fail();
    checkRustUnitCloneDerivation(declaration.sourceUnitCloneDerivation,declaration);
  }
}

/** Use actual source catalog identity and a direct owned receiver. */
export function acceptRustUnitCloneReceiver(parser,receiver) {
  const origin=parser.origins.origin(receiver,parser.modulePath);
  const owner=origin.type?.kind==='named'?parser.origins.lookup(origin.type.path,origin.path,RUST_SOURCE_SIGNATURE_POLICY.typeOwnerKinds):null;
  return acceptRustTypeNamespaceUnitClone(Boolean(owner?.sourceUnitCloneDerivation),owner?.unitFields===true,origin.proven&&origin.wrappers.length===0);
}
