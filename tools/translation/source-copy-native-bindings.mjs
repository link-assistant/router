// Lexical source-copy validation only, independent of receiving strict targets.
import {resolve,dirname,join} from 'node:path';
export function verifyNativeCopiedSourceBindings(ts,path,source){
 if(ts.version!=='5.9.3'||typeof path!=='string'||typeof source!=='string')throw new TypeError('Native copied-source binding check requires installed TypeScript 5.9.3 and complete primitive source');
 const candidate=resolve(path),ambient=join(dirname(candidate),'.copied-source-node-globals.d.ts'),options={allowJs:true,checkJs:true,noEmit:true,noResolve:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,types:[]},host=ts.createCompilerHost(options),original=host.getSourceFile;
 // These are runtime-provided names, not imported module declarations. This
 // finite scope check does not claim to typecheck Node's implementation.
 host.getSourceFile=(name,languageVersion,onError,shouldCreateNewSourceFile)=>resolve(name)===candidate?ts.createSourceFile(name,source,languageVersion,true,ts.ScriptKind.JS):resolve(name)===ambient?ts.createSourceFile(name,'declare const process: any;\ndeclare const Buffer: any;\n',languageVersion,true,ts.ScriptKind.TS):original(name,languageVersion,onError,shouldCreateNewSourceFile);
 const program=ts.createProgram([candidate,ambient],options,host),file=program.getSourceFile(candidate);if(!file)throw new TypeError('Native copied-source candidate was not parsed');
 const diagnostics=program.getSemanticDiagnostics(file);
 const missing=diagnostics.filter(row=>[2304,2552,18004,2580].includes(row.code));
 if(missing.length)throw new TypeError('Native copied-source unbound identifier: '+missing.map(row=>ts.flattenDiagnosticMessageText(row.messageText,' ')).join('; '));
 const uninitialized=diagnostics.filter(row=>row.code===2448);
 if(uninitialized.length)throw new TypeError('Native copied-source initialization: '+uninitialized.map(row=>ts.flattenDiagnosticMessageText(row.messageText,' ')).join('; '));
 return {typescriptVersion:ts.version,sourcePath:candidate,unboundIdentifiers:[],nativeSemanticScopeChecked:true,strictTypecheck:false,semanticAuthority:false};
}

// One fresh program shares standard-library parsing. Each complete candidate
// must remain an external module, so another candidate cannot supply globals.
// There is no retained program, AST, diagnostic or verdict between calls.
export function verifyNativeCopiedModuleBindings(ts,rows){
 const fail=reason=>{throw new TypeError('Native copied-source module batch: '+reason);};
 if(ts.version!=='5.9.3'||!Array.isArray(rows)||rows.length<1||rows.length>85)fail('installed TypeScript 5.9.3 and bounded complete modules required');
 const candidates=new Map();let units=0;
 for(const row of rows){
  if(!row||typeof row.path!=='string'||typeof row.source!=='string')fail('complete primitive path/source required');
  const path=resolve(row.path);if(candidates.has(path))fail('distinct complete module paths required');
  units+=row.source.length;if(units>2097152)fail('complete module source budget');
  const file=ts.createSourceFile(path,row.source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS);
  if(!ts.isExternalModule(file))fail('candidate must have its own external module scope');
  const scoped=node=>{if(ts.isNamespaceExportDeclaration(node)||ts.isModuleDeclaration(node)&&(node.flags&ts.NodeFlags.GlobalAugmentation))fail('global augmentation cannot share a module program');ts.forEachChild(node,scoped);};scoped(file);
  candidates.set(path,{source:row.source,file});
 }
 const first=candidates.keys().next().value,ambient=join(dirname(first),'.copied-source-node-globals.d.ts');
 if(candidates.has(ambient))fail('candidate collides with finite ambient declarations');
 const options={allowJs:true,checkJs:true,noEmit:true,noResolve:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,types:[]},host=ts.createCompilerHost(options),original=host.getSourceFile;
 host.getSourceFile=(name,languageVersion,onError,shouldCreateNewSourceFile)=>candidates.get(resolve(name))?.file??(resolve(name)===ambient?ts.createSourceFile(name,'declare const process: any;\ndeclare const Buffer: any;\n',languageVersion,true,ts.ScriptKind.TS):original(name,languageVersion,onError,shouldCreateNewSourceFile));
 const program=ts.createProgram([...candidates.keys(),ambient],options,host),results=[];
 for(const candidate of candidates.keys()){
  const file=program.getSourceFile(candidate);if(!file)throw new TypeError('Native copied-source candidate was not parsed');
  const diagnostics=program.getSemanticDiagnostics(file),missing=diagnostics.filter(row=>[2304,2552,18004,2580].includes(row.code));
  if(missing.length)throw new TypeError('Native copied-source unbound identifier: '+missing.map(row=>ts.flattenDiagnosticMessageText(row.messageText,' ')).join('; '));
  const uninitialized=diagnostics.filter(row=>row.code===2448);
  if(uninitialized.length)throw new TypeError('Native copied-source initialization: '+uninitialized.map(row=>ts.flattenDiagnosticMessageText(row.messageText,' ')).join('; '));
  results.push({typescriptVersion:ts.version,sourcePath:candidate,unboundIdentifiers:[],nativeSemanticScopeChecked:true,strictTypecheck:false,semanticAuthority:false});
 }
 return results;
}
