// A layout-only prepass supplies evidence; final project checking still owns
// every method body and its dependencies. Failed layouts never supply Copy.
import {HostChecker,hostData} from './extensions/host-contracts.mjs';
import {extractImplDeclarations,certifyCopyType} from './impl-resolver.mjs';
import {TranslationError} from './vendor/meta-language/translation/diagnostics.js';
import {nominalTypeIdentities,resolveNominalImplTarget} from './project-nominal.mjs';
import {macroProvenance} from './macro-provenance.mjs';

function tree(declarations){const items=[];for(const entry of declarations){let owner=items;for(const name of entry.path){let module=owner.find(item=>item.k==='module'&&item.name===name);if(!module){module={k:'module',name,items:[]};owner.push(module);}owner=module.items;}owner.push(entry.surface);}return items;}
export function projectCopyEvidence(declarations,modules,aliases,scopes=new Map()){
  let active=declarations.filter(entry=>['enum','struct','generated-type'].includes(entry.term)),checker,program;
  for(let attempts=0;attempts<=declarations.length;attempts++){
    checker=new HostChecker('Rust',[]);
    const items=tree(active);
    try{program=checker.program({language:'Rust',items:[...items,...hostData().filter(entry=>!items.some(item=>item.name===entry.name))],main:null});break;}
    catch(error){if(!(error instanceof TranslationError))throw error;const owner=active.find(entry=>error.span&&entry.globalSpan.start<=error.span.start&&error.span.start<=entry.globalSpan.end);if(!owner)return ()=>null;active=active.filter(entry=>entry!==owner);}
  }
  if(!program)return ()=>null;
  const checked=new Map([...program.declarations].map(([name,entry])=>[name,entry.standardGeneric?{...entry,standardGeneric:{...entry.standardGeneric,arguments:entry.standardGeneric.arguments.map(type=>checker.resolveType(type,entry.modulePath,entry.span))}}:entry]));
  const nominalTypes=nominalTypeIdentities([...scopes.values()]);
  const implementations=modules.flatMap(module=>extractImplDeclarations(module.source,{sourcePath:module.file,modulePath:module.path}).implementations.map(implementation=>{
    const binding=aliases.get(module.file)?.get(module.path.join('.'))?.get(implementation.typePath?.[0]);
    const path=binding?[...binding,...implementation.typePath.slice(1)]:implementation.typePath;
    let resolvedType=null;try{if(Array.isArray(path)&&path.length&&path.every(part=>typeof part==='string'))resolvedType=checker.resolveType({kind:'named',path},module.path,implementation.headerSpan);}catch(error){if(!(error instanceof TranslationError))throw error;}
    return {...implementation,resolvedType,resolvedNominalTarget:resolvedType?null:resolveNominalImplTarget(implementation,module,[...scopes.values()],nominalTypes)};
  }));
  return (qualifiedType,module,span)=>{
    let type;try{type=checker.resolveType({kind:'named',path:qualifiedType},module.path,span);}catch(error){if(!(error instanceof TranslationError))throw error;return null;}
    const owners=new Set(),seen=new Set();
    const visit=current=>{if(current.kind!=='data'||seen.has(current.name))return;seen.add(current.name);const entry=checked.get(current.name);if(!entry)return;const declaration=active.find(declaration=>declaration.name===current.name);if(declaration)owners.add(declaration.file);for(const ctor of entry.ctors)for(const field of ctor.fields)visit(field.type);};visit(type);
    const relevant=modules.filter(candidate=>owners.has(candidate.file)||[...owners].some(file=>{const owner=modules.find(candidate=>candidate.file===file);return candidate.path.every((name,index)=>owner.path[index]===name);}));
    const evidence=relevant.map(module=>macroProvenance(module.source));
    const provenance={shadowedNames:[...new Set(evidence.flatMap(value=>value.shadowedNames))],importedNames:[...new Set(evidence.flatMap(value=>value.importedNames))],unresolvedImportScope:relevant.some(module=>scopes.has(module.file)?scopes.get(module.file).unresolvedMacroScope||scopes.get(module.file).unresolvedTypeScope:macroProvenance(module.source).unresolvedImportScope)};
    const certificate=certifyCopyType(type,{declarations:checked,implementations,nominalTypes,macroProvenance:provenance,span});
    return certificate;
  };
}
