// Lexical source-copy validation only, independent of receiving strict targets.
import {resolve,dirname,join} from 'node:path';
export function verifyNativeCopiedSourceBindings(ts,path,source){
 if(ts.version!=='5.9.3'||typeof path!=='string'||typeof source!=='string')throw new TypeError('Native copied-source binding check requires installed TypeScript 5.9.3 and complete primitive source');
 const candidate=resolve(path),ambient=join(dirname(candidate),'.copied-source-node-globals.d.ts'),options={allowJs:true,checkJs:true,noEmit:true,noResolve:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,types:[]},host=ts.createCompilerHost(options),original=host.getSourceFile;
 // These are runtime-provided names, not imported module declarations. This
 // finite scope check does not claim to typecheck Node's implementation.
 host.getSourceFile=(name,languageVersion,onError,shouldCreateNewSourceFile)=>resolve(name)===candidate?ts.createSourceFile(name,source,languageVersion,true,ts.ScriptKind.JS):resolve(name)===ambient?ts.createSourceFile(name,'declare const process: any;\ndeclare const Buffer: any;\n',languageVersion,true,ts.ScriptKind.TS):original(name,languageVersion,onError,shouldCreateNewSourceFile);
 const program=ts.createProgram([candidate,ambient],options,host),file=program.getSourceFile(candidate);if(!file)throw new TypeError('Native copied-source candidate was not parsed');
 const missing=program.getSemanticDiagnostics(file).filter(row=>[2304,2552,18004,2580].includes(row.code));
 if(missing.length)throw new TypeError('Native copied-source unbound identifier: '+missing.map(row=>ts.flattenDiagnosticMessageText(row.messageText,' ')).join('; '));
 return {typescriptVersion:ts.version,sourcePath:candidate,unboundIdentifiers:[],nativeSemanticScopeChecked:true,strictTypecheck:false,semanticAuthority:false};
}
