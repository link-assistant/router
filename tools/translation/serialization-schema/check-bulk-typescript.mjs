import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScript } from '../js-to-rust/native-typescript.mjs';
const root=resolve(fileURLToPath(new URL('../../../',import.meta.url))),ts=loadTypeScript(root);
const path=join(root,'tools/translation/serialization-schema/bulk-generated/router-serialization.ts');
const program=ts.createProgram([path],{strict:true,noEmit:true,types:[],target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,lib:['lib.es2022.d.ts']});
const diagnostics=ts.getPreEmitDiagnostics(program);
if(diagnostics.length){process.stderr.write(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:path=>path,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}));process.exitCode=1;}
else process.stdout.write(JSON.stringify({descriptor:path,typescript:ts.version,strict:true,noEmit:true,diagnostics:0,runtimeAuthority:false})+'\n');
