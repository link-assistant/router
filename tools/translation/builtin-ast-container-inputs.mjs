// Original source inputs for transitive AST payload wrappers. This evidence
// deliberately establishes no Rust heap behavior or compiler feature union.
import {createHash} from 'node:crypto';
import {BUILTIN_DERIVE_AST_PROFILE,isBuiltinDeriveAstProfile,builtinAstOriginal,originalAstFunction} from './builtin-derive-ast-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const cached=new WeakMap(),evidenceStates=new WeakMap();
function actualSlice(origin,text){
  const start=origin.source.indexOf(text);if(start<0||origin.source.indexOf(text,start+1)>=0)throw new TypeError('Original container source selection is not unique');
  return {source:origin.path,sourceSha256:origin.sha256,span:{start,end:start+text.length},text,sha256:hash(text)};
}
export function builtinAstContainerSourceEvidence(profile){
  if(!isBuiltinDeriveAstProfile(profile))throw new TypeError('Container inputs require their sealed original AST source profile');
  if(cached.has(profile))return cached.get(profile);
  const inputs=BUILTIN_DERIVE_AST_PROFILE.builderContainerInputs;
  if(!inputs||inputs.selectedOwnerBangComplete!==false||inputs.generatedImplBehavior!==false)throw new TypeError('Original transitive container profile is absent');
  const lock=builtinAstOriginal(profile,inputs.rustWorkspaceLock.source);
  if(lock.sha256!==inputs.rustWorkspaceLock.sha256)throw new TypeError('Original compiler Cargo lock identity changed');
  const packages=lock.source.split('[[package]]').filter(value=>/^\s*name = "thin-vec"\s*$/mu.test(value));
  if(packages.length!==1||!packages[0].includes('version = "'+inputs.thinVec.version+'"')||!packages[0].includes('checksum = "'+inputs.thinVec.crateSha256+'"'))throw new TypeError('Actual original compiler ThinVec dependency differs');
  const dependency=actualSlice(lock,packages[0]);
  const pointer=originalAstFunction(profile,inputs.pointer.source,'P');
  const thinSource=builtinAstOriginal(profile,inputs.thinVec.source);
  const thinNew=originalAstFunction(profile,inputs.thinVec.source,'new');
  const capacity=originalAstFunction(profile,inputs.thinVec.source,'with_capacity');
  const spanned=builtinAstOriginal(profile,inputs.spanned.source);
  const aliases=actualSlice(builtinAstOriginal(profile,'compiler/rustc_ast/src/ast.rs'),'pub type AttrVec = ThinVec<Attribute>;');
  const values={schema:'original-ast-container-inputs-v1',profileDigest:profile.digest,rustWorkspaceLock:inputs.rustWorkspaceLock,dependency,
    pointer:{originalConstructor:pointer,payloadSlot:{parameter:'value',actualTypeSyntax:'T',body:'original Box::new(value) source'},allocationPhaseBehavior:false},
    thinVec:{originalConstructor:thinNew,originalCapacityConstructor:capacity,attributeAlias:aliases,
      headerBranches:[actualSlice(thinSource,'static EMPTY_HEADER: Header = Header { _len: 0, _cap: 0 };'),actualSlice(thinSource,'static EMPTY_HEADER: Header;')],
      featureCompleteness:false,elementCountEstablished:false,allocationPhaseBehavior:false},
    spanned:{originalSource:{path:spanned.path,sha256:spanned.sha256},allocationPhaseBehavior:false},
    sourceSyntaxRoundTrip:true,selectedOwnerBangComplete:false,generatedImplBehavior:false,
    obligations:['generic AST payload slots require actual caller binding, not return-type inference','ThinVec gecko-ffi external header has no closed feature/owner proof','P wrapping does not establish Rust allocation behavior','None and empty attribute slots retain independent original owner/source obligations']};
  const encoded=JSON.stringify(values);if(Buffer.byteLength(encoded)>524288)throw new TypeError('Original container evidence metadata budget exceeded');
  const roundTrip=JSON.parse(encoded);if(JSON.stringify(roundTrip)!==encoded)throw new TypeError('Original container evidence roundtrip changed');
  const result=freeze({...roundTrip,digest:hash(encoded)});evidenceStates.set(result,{profile});cached.set(profile,result);return result;
}
export const isBuiltinAstContainerSourceEvidence=value=>!!value&&evidenceStates.has(value);
