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

// Invocation-local shared native program. Script inputs retain the old checker.
// Each module keeps its original filename and private lexical module scope.
export function verifyNativeCopiedSourceBindingBatch(ts,rows){
 if(ts.version!=='5.9.3'||!Array.isArray(rows)||rows.length>256)throw new TypeError('Native source batch requires installed TypeScript 5.9.3 and bounded complete rows');
 const captured=[],sources=new Map(),results=new Array(rows.length),options={allowJs:true,checkJs:true,noEmit:true,noResolve:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,types:[]};
 for(let index=0;index<rows.length;index++){
  const {path,source}=rows[index];if(typeof path!=='string'||typeof source!=='string')throw new TypeError('Native source batch requires complete primitive sources');const candidate=resolve(path);if(sources.has(candidate)||captured.some(row=>row.candidate===candidate))throw new TypeError('Native source batch requires unique original filenames');
  const file=ts.createSourceFile(candidate,source,options.target,true,ts.ScriptKind.JS);if(!ts.isExternalModule(file)){results[index]=verifyNativeCopiedSourceBindings(ts,path,source);captured.push({candidate,index,standalone:true});continue;}sources.set(candidate,file);captured.push({candidate,index});
 }
 if(!sources.size)return results;
 const ambient=join(dirname(captured.find(row=>!row.standalone).candidate),'.copied-source-node-globals.d.ts'),host=ts.createCompilerHost(options),original=host.getSourceFile;
 host.getSourceFile=(name,languageVersion,onError,shouldCreateNewSourceFile)=>sources.get(resolve(name))??(resolve(name)===ambient?ts.createSourceFile(name,'declare const process: any;\ndeclare const Buffer: any;\n',languageVersion,true,ts.ScriptKind.TS):original(name,languageVersion,onError,shouldCreateNewSourceFile));
 const program=ts.createProgram([...sources.keys(),ambient],options,host);
 for(const row of captured){if(row.standalone)continue;const candidate=row.candidate,file=program.getSourceFile(candidate);if(!file)throw new TypeError('Native copied-source candidate was not parsed');results[row.index]=(()=>{const diagnostics=program.getSemanticDiagnostics(file);
const missing=diagnostics.filter(row=>[2304,2552,18004,2580].includes(row.code));
if(missing.length)throw new TypeError('Native copied-source unbound identifier: '+missing.map(row=>ts.flattenDiagnosticMessageText(row.messageText,' ')).join('; '));
const uninitialized=diagnostics.filter(row=>row.code===2448);
if(uninitialized.length)throw new TypeError('Native copied-source initialization: '+uninitialized.map(row=>ts.flattenDiagnosticMessageText(row.messageText,' ')).join('; '));
return {typescriptVersion:ts.version,sourcePath:candidate,unboundIdentifiers:[],nativeSemanticScopeChecked:true,strictTypecheck:false,semanticAuthority:false};})();}
 return results;
}
