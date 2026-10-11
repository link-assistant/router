// A layout-only prepass supplies evidence; final project checking still owns
// every method body and its dependencies. Failed layouts never supply Copy.
import {HostChecker,hostData} from './extensions/host-contracts.mjs';
import {extractImplDeclarations,certifyCopyType} from './impl-resolver.mjs';
import {TranslationError} from './vendor/meta-language/translation/diagnostics.js';
import {macroProvenance} from './macro-provenance.mjs';

function tree(declarations){const items=[];for(const entry of declarations){let owner=items;for(const name of entry.path){let module=owner.find(item=>item.k==='module'&&item.name===name);if(!module){module={k:'module',name,items:[]};owner.push(module);}owner=module.items;}owner.push(entry.surface);}return items;}
export function projectCopyEvidence(declarations,modules,aliases){
  let active=declarations.filter(entry=>['enum','struct','generated-type'].includes(entry.term)),checker,program;
  for(let attempts=0;attempts<=declarations.length;attempts++){
    checker=new HostChecker('Rust',[]);
    const items=tree(active);
    try{program=checker.program({language:'Rust',items:[...items,...hostData().filter(entry=>!items.some(item=>item.name===entry.name))],main:null});break;}
    catch(error){if(!(error instanceof TranslationError))throw error;const owner=active.find(entry=>error.span&&entry.globalSpan.start<=error.span.start&&error.span.start<=entry.globalSpan.end);if(!owner)return ()=>null;active=active.filter(entry=>entry!==owner);}
  }
  if(!program)return ()=>null;
  const checked=new Map([...program.declarations].map(([name,entry])=>[name,entry.standardGeneric?{...entry,standardGeneric:{...entry.standardGeneric,arguments:entry.standardGeneric.arguments.map(type=>checker.resolveType(type,entry.modulePath,entry.span))}}:entry]));
  const implementations=modules.flatMap(module=>extractImplDeclarations(module.source,{sourcePath:module.file,modulePath:module.path}).implementations.map(implementation=>{
    const binding=aliases.get(module.file)?.get(module.path.join('.'))?.get(implementation.typePath?.[0]);
    const path=binding?[...binding,...implementation.typePath.slice(1)]:implementation.typePath;
    let resolvedType=null;try{resolvedType=checker.resolveType({kind:'named',path},module.path,implementation.headerSpan);}catch(error){if(!(error instanceof TranslationError))throw error;}
    return {...implementation,resolvedType};
  }));
  return (qualifiedType,module,span)=>{
    let type;try{type=checker.resolveType({kind:'named',path:qualifiedType},module.path,span);}catch(error){if(!(error instanceof TranslationError))throw error;return null;}
    const provenance=macroProvenance(module.source);
    const certificate=certifyCopyType(type,{declarations:checked,implementations,macroProvenance:provenance,span});
    return certificate.verified?certificate:null;
  };
}
