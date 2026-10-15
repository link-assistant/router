// Independent whole output-syntax candidates, before caller owner resolution.
// A private source candidate is not an owned invocation or namespace effect.
import {createHash} from 'node:crypto';
import {types,isDeepStrictEqual} from 'node:util';
import {isDeriveDependencyProof} from './derive-dependencies.mjs';
import {originalSourceModuleItems,isSourceModuleView} from './source-module-views.mjs';
import {builtinStandardDeriveRegistry,builtinStandardDeriveSourceOwner} from './builtin-derive-standard-inputs.mjs';
import {builtinDeriveAstSourceProfile,originalAstFunction} from './builtin-derive-ast-meta.mjs';
import {builtinDeriveDataInputs,builtinDebugDataInputs,builtinPayloadDataInputs} from './builtin-derive-data-inputs.mjs';
import {inspectDeriveInput} from './derive-inputs.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {liftBuiltinCloneAstRoute} from './builtin-clone-ast-route.mjs';
import {liftBuiltinDebugAstRoute} from './builtin-debug-ast-route.mjs';
import {liftBuiltinPartialEqAstRoute} from './builtin-partial-eq-ast-route.mjs';
import {liftBuiltinEqAstRoute} from './builtin-eq-ast-route.mjs';
import {originalBuiltinCopyOutputSyntax} from './builtin-copy-output-syntax.mjs';

const candidates=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original builtin namespace candidate: '+message);};
const own=(value,key)=>{
 if(!value||typeof value!=='object'||types.isProxy(value))fail('plain own input required');
 const descriptor=Object.getOwnPropertyDescriptor(value,key);
 if(!descriptor||!Object.hasOwn(descriptor,'value'))fail('missing or accessor input: '+key);
 return descriptor.value;
};
const recipes=new Map([
 ['copy::expand_deriving_copy',{file:'bounds.rs',name:'expand_deriving_copy',owner:'Copy'}],
 ['clone::expand_deriving_clone',{file:'clone.rs',name:'expand_deriving_clone',owner:'Clone',lift:liftBuiltinCloneAstRoute}],
 ['debug::expand_deriving_debug',{file:'debug.rs',name:'expand_deriving_debug',owner:'Debug',lift:liftBuiltinDebugAstRoute}],
 ['partial_eq::expand_deriving_partial_eq',{file:'cmp/partial_eq.rs',name:'expand_deriving_partial_eq',owner:'PartialEq',lift:liftBuiltinPartialEqAstRoute}],
 ['eq::expand_deriving_eq',{file:'cmp/eq.rs',name:'expand_deriving_eq',owner:'Eq',lift:liftBuiltinEqAstRoute}],
]);

function originalInput(options){
 const dependencies=own(options,'dependencies'),module=own(options,'module'),item=own(options,'item'),invocationIndex=own(options,'invocationIndex');
 if(!isDeriveDependencyProof(dependencies)||!Number.isSafeInteger(invocationIndex)||invocationIndex<0)fail('genuine dependency and original invocation index required');
 const source=own(module,'source'),file=own(module,'file'),view=own(module,'sourceView');
 if(typeof source!=='string'||typeof file!=='string'||!isSourceModuleView(view))fail('complete genuine original source view required');
 const path=copyMetadata(own(module,'path')),compilationProfile=copyMetadata(own(module,'compilationProfile'));
 if(!Array.isArray(path)||path.some(part=>typeof part!=='string'))fail('original module path differs');
 const carrier={source,file,path,compilationProfile,sourceView:view};
 // Item identity comes from the private view issuer, not matching public
 // spans/text/name fields. A copied item cannot stand in for this occurrence.
 const originals=originalSourceModuleItems(carrier);
 if(!originals.some(original=>original===item)||!['struct','enum'].includes(item.term))fail('exact issued original item required');
 const input=inspectDeriveInput(item,compilationProfile);
 const invocations=input.attributes.filter(attribute=>attribute.name==='derive').flatMap(attribute=>attribute.derives.map(path=>({path,attributeSpan:attribute.span})));
 const invocation=invocations[invocationIndex];
 if(!invocation||invocation.path.length!==1)fail('original invocation is outside the direct standard candidate grammar');
 const registry=builtinStandardDeriveRegistry(dependencies),owner=builtinStandardDeriveSourceOwner(registry,dependencies,invocation.path[0]);
 const recipe=recipes.get(owner.registration.callback.join('::'));
 if(!recipe||recipe.owner!==owner.name||owner.name!==invocation.path[0])fail('actual registered compiler callback has no complete source candidate route');
 const span={start:item.start,end:item.end},certificate={source:file,sourceSha256:hash(source),span,itemSha256:hash(source.slice(span.start,span.end)),name:item.name,kind:item.term};
 return {dependencies,module:freeze(carrier),item,invocationIndex,invocation,registry,owner,recipe,certificate};
}

function outputSyntax(state){
 const {dependencies,module,certificate,recipe}=state,profile=builtinDeriveAstSourceProfile(dependencies);
 const entry=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/'+recipe.file,recipe.name);
 const original={dependencies,module},base={profile,entry,original,certificate};
 const input=(recipe.owner==='Debug'?builtinDebugDataInputs:builtinPayloadDataInputs)({source:module.source,span:certificate.span});
 if(input.name!==certificate.name||input.kind!==certificate.kind||input.wholeSourceSha256!==certificate.sourceSha256||input.itemSha256!==certificate.itemSha256)fail('complete source syntax input changed');
 if(input.attributes.some(attribute=>!['derive','doc'].includes(attribute.name)))fail('candidate input retains an unsupported attribute/helper obligation');
 if(recipe.owner==='Copy'){
  const syntax=originalBuiltinCopyOutputSyntax(base);
  return freeze({schema:'original-complete-copy-output-syntax-candidate-v1',input,
   descriptor:syntax.descriptor,recipes:[syntax.expand,syntax.structure,syntax.enumeration,syntax.sink,syntax.itemBuilder,syntax.emptyVec,syntax.parameters,syntax.typePath,syntax.pathBuilder,syntax.typeBuilder,syntax.traitBuilder],
   positiveSchema:[syntax.schema,syntax.implSchema],constructionSink:syntax.implementation,
   slotProofs:{methods:{source:syntax.field('methods').span,length:0},associatedTypes:{source:syntax.field('associated_types').span,length:0},genericParameters:0,whereClauses:0},
   branches:[{outputKind:'ItemKind::Impl',associatedItems:0,associatedTypes:0,genericParameters:0,wherePredicates:0,constness:['Const::Yes','Const::No']}],
   positiveOutputGrammarComplete:true,callerOwnerResolved:false,namespaceAuthority:false,generatedImplBehavior:false});
 }
 // The same existing complete source/field/roundtrip/positive-AST walkers are
 // used by the later owned proof. No rendered or normalized replacement body.
 // Unit/named PartialEq/Clone retain their original narrower syntax issuer.
 const selected=(recipe.owner==='Clone'||recipe.owner==='PartialEq')&&input.style!=='payload-enum'
  ?builtinDeriveDataInputs({source:module.source,span:certificate.span}):input;
 const route=recipe.lift({...base,input:selected});
 // Eq/PartialEq retain their existing source-specific closed construction
 // records, rather than a shared public "complete" flag. Authority comes
 // from this exact producer call and the private candidate join below.
 return route;
}

export function captureOriginalBuiltinNamespaceCandidate(options){
 const state=originalInput(options),syntax=outputSyntax(state);
 const token=Object.freeze({schema:'private-original-builtin-output-syntax-candidate-v1'});
 const evidence=freeze({schema:'original-builtin-output-syntax-candidate-v1',
  source:state.module.file,module:state.module.path,sourceSha256:state.certificate.sourceSha256,
  sourceViewDigest:state.module.sourceView.digest,itemSpan:state.certificate.span,itemSha256:state.certificate.itemSha256,
  invocationIndex:state.invocationIndex,invocation:state.invocation,registeredOwner:state.owner,
  registryDigest:state.registry.digest,syntax,
  callerOwnerResolved:false,callerScopeComplete:false,attributeOwnersResolved:false,
  namespaceAuthority:false,runtimeAuthority:false,generatedImplBehavior:false,
  obligations:['independent complete original and generated all-alternative namespace superset',
   'actual original caller attribute/prelude noncompetition',
   'fresh genuine derive input and full190 per-invocation output reissue']});
 candidates.set(token,{state,evidence});return token;
}

export function originalBuiltinNamespaceCandidateFacts(token,options){
 const issued=candidates.get(token);if(!issued)fail('copied or foreign candidate token');
 const current=originalInput(options),prior=issued.state;
 if(current.dependencies!==prior.dependencies||current.module.source!==prior.module.source||current.module.file!==prior.module.file||current.module.sourceView!==prior.module.sourceView||current.item!==prior.item||current.invocationIndex!==prior.invocationIndex||!isDeepStrictEqual(current.module.path,prior.module.path)||!isDeepStrictEqual(current.module.compilationProfile,prior.module.compilationProfile)||!isDeepStrictEqual(current.invocation,prior.invocation)||!isDeepStrictEqual(current.owner,prior.owner))fail('original dependency/source/view/item/profile/invocation changed');
 return issued.evidence;
}
