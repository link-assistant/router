import {itemConfiguration} from './cfg-profile.mjs';
import {moduleScopeKey} from './source-module-views.mjs';
// A layout-only prepass supplies evidence; final project checking still owns
// every method body and its dependencies. Failed layouts never supply Copy.
import {HostChecker,hostData} from './extensions/host-contracts.mjs';
import {extractImplDeclarations,certifyCopyType} from './impl-resolver.mjs';
import {TranslationError} from './vendor/meta-language/translation/diagnostics.js';
import {checkCollectedDeclarationTypes,declarationRefusals} from './extensions/declaration-refusals.mjs';
import {nominalTypeIdentities,resolveNominalImplTarget,implementationTargetPath} from './project-nominal.mjs';
import {macroProvenance} from './macro-provenance.mjs';
import {attributeMacroProvenance} from './macro-subnamespaces.mjs';
import {admittedHostData} from './extensions/source-namespaces.mjs';
import {originalParsedDeclarationEvidence,metadataDigest} from './extensions/source-links.mjs';
const optionPayloads=new WeakMap();
const freezeOptionLayout=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freezeOptionLayout);Object.freeze(value);}return value;};
export function originalOptionCopyPayload(surface){
  const proof=optionPayloads.get(surface);if(!proof)return null;
  if(!originalParsedDeclarationEvidence(surface)||metadataDigest(surface)!==proof.syntaxDigest)throw new TypeError('Option nominal original layout changed');
  return proof;
}
import {bindNonCopyTraitOwner} from './copy-trait-owners.mjs';

function tree(declarations,modules){
  const items=[];
  const owner=path=>{
    let current=items;
    for(const name of path){
      let module=current.find(item=>item.k==='module'&&item.name===name);
      if(!module){module={k:'module',name,items:[]};current.push(module);}
      current=module.items;
    }
    return current;
  };
  // Lookup still starts in an original module after every layout in that
  // module refuses. Empty lexical contexts provide no declaration or layout.
  // Unknown scopes retain possible shadows; inactive scopes contribute none.
  for(const module of modules)if(module.configurationCondition!=='inactive')owner(module.path);
  for(const entry of declarations)owner(entry.path).push(entry.surface);
  return items;
}
export function projectCopyEvidence(declarations,modules,aliases,scopes=new Map()){
  let active=declarations.filter(entry=>['enum','struct','generated-type'].includes(entry.term)),checker,program;
  for(let attempts=0;attempts<=declarations.length;attempts++){
    checker=new HostChecker('Rust',[]);
    const items=tree(active,modules);
    try{program=checkCollectedDeclarationTypes(checker,{language:'Rust',items:[...items,...admittedHostData(hostData(),items)],main:null});break;}
    catch(error){
      const failures=declarationRefusals(error)??(error instanceof TranslationError?[{error}]:null);if(!failures)throw error;
      const owners=new Set();
      for(const failure of failures){const cause=failure.error,owner=active.find(entry=>(!failure.name||failure.name===entry.name)&&cause.span&&entry.globalSpan.start<=cause.span.start&&cause.span.start<=entry.globalSpan.end);if(!owner)return ()=>null;owners.add(owner);}
      active=active.filter(entry=>!owners.has(entry));
    }
  }
  if(!program)return ()=>null;
  const checked=new Map([...program.declarations].map(([name,entry])=>[name,entry.standardGeneric?{...entry,standardGeneric:{...entry.standardGeneric,arguments:entry.standardGeneric.arguments.map(type=>checker.resolveType(type,entry.modulePath,entry.span))}}:entry]));
  const nominalTypes=nominalTypeIdentities([...scopes.values()],modules);
  const implementations=modules.filter(module=>module.configurationCondition!=='inactive').flatMap(module=>extractImplDeclarations(module.source,{sourcePath:module.file,modulePath:module.path,sourceView:module.sourceView,compilationProfile:module.compilationProfile}).implementations.filter(implementation=>itemConfiguration((module.allItems??module.items).find(item=>item.term==='impl'&&item.start===implementation.span.start)?.tokens??[],module.compilationProfile).status!=='inactive').map(implementation=>{
    const binding=aliases.get(moduleScopeKey(module))?.get(module.path.join('.'))?.get(implementation.typePath?.[0]);
    const actualTarget=implementationTargetPath(implementation,module);
    const path=actualTarget?(binding?[...binding,...implementation.typePath.slice(1)]:implementation.typePath):null;
    let resolvedType=null;try{if(Array.isArray(path)&&path.length&&path.every(part=>typeof part==='string'))resolvedType=checker.resolveType({kind:'named',path},module.path,implementation.headerSpan);}catch(error){if(!(error instanceof TranslationError))throw error;}
    return bindNonCopyTraitOwner({...implementation,resolvedType,resolvedNominalTarget:resolvedType?null:resolveNominalImplTarget(implementation,module,[...scopes.values()],nominalTypes)},module,scopes);
  }));
  const resolve=(qualifiedType,module,span)=>{try{return checker.resolveType({kind:'named',path:qualifiedType},module.path,span);}catch(error){if(!(error instanceof TranslationError))throw error;return null;}};
  const certify=(type,span)=>{
    const owners=new Set(),seen=new Set();
    const visit=current=>{if(current.kind!=='data'||seen.has(current.name))return;seen.add(current.name);const entry=checked.get(current.name);if(!entry)return;const declaration=active.find(declaration=>declaration.name===current.name);if(declaration)for(const origin of declaration.sourceModuleOrigins??[{file:declaration.file,path:declaration.path}])owners.add(moduleScopeKey(origin));for(const ctor of entry.ctors)for(const field of ctor.fields)visit(field.type);};visit(type);
    const ownerModules=modules.filter(module=>owners.has(moduleScopeKey(module)));
    const relevant=modules.filter(candidate=>ownerModules.some(owner=>candidate.path.every((name,index)=>owner.path[index]===name)));
    let provenance;
    if(relevant.every(module=>scopes.has(moduleScopeKey(module))))provenance=attributeMacroProvenance(relevant.map(module=>scopes.get(moduleScopeKey(module))));
    else {
      // Only incomplete binding contexts consume this conservative lexical
      // fallback. A complete context must not rescan discarded source text.
      const evidence=relevant.map(module=>macroProvenance(module.source));
      provenance={shadowedNames:[...new Set(evidence.flatMap(value=>value.shadowedNames))],importedNames:[...new Set(evidence.flatMap(value=>value.importedNames))],unresolvedImportScope:evidence.some(value=>value.unresolvedImportScope)};
    }
    const certificate=certifyCopyType(type,{declarations:checked,implementations,nominalTypes,macroProvenance:provenance,span});
    return certificate;
  };
  const evidence=(qualifiedType,module,span)=>{const type=resolve(qualifiedType,module,span);return type?certify(type,span):null;};
  evidence.fieldCertificates=(qualifiedType,module,span)=>{
    const type=resolve(qualifiedType,module,span),entry=type?.kind==='data'?checked.get(type.name):null;
    if(!entry)return [];
    return entry.ctors.flatMap(ctor=>ctor.fields.map(field=>({ctor:ctor.name,field:field.name,copyCertificate:certify(field.type,span)}))).filter(field=>field.copyCertificate.verified);
  };
  for(const declaration of active){
    if(!originalParsedDeclarationEvidence(declaration.surface)||!['Copy','Clone'].every(trait=>declaration.surface.deriveTraits?.includes(trait)))continue;
    const type=resolve(declaration.name.split('.'),{path:[]},declaration.globalSpan),layout=type?.kind==='data'?checked.get(type.name):null;
    if(!layout||layout.standardGeneric||layout.generated)continue;
    const certificate=certify(type,declaration.globalSpan);
    if(certificate.verified){
      const dependencies=[],seen=new Set();
      const visit=current=>{if(current?.kind!=='data'||seen.has(current.name))return;seen.add(current.name);const entry=checked.get(current.name);if(!entry)return;dependencies.push(structuredClone(entry));for(const ctor of entry.ctors)for(const field of ctor.fields)visit(field.type);};visit(type);
      optionPayloads.set(declaration.surface,Object.freeze({syntaxDigest:metadataDigest(declaration.surface),layout:freezeOptionLayout(structuredClone(layout)),dependencies:freezeOptionLayout(dependencies),certificate}));
    }
  }
  return evidence;
}
