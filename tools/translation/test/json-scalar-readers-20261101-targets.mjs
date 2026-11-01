// Complete additive strict receiving harness SOURCE. All execution UNRUN.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,cpSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {writeNamedRuntimeAssets as writeRuntimeAssets} from './text-artifact-loader.mjs';

// Execute the emitted JavaScript and the separately strict-compiled TypeScript.
export async function verifyJsonScalarReadersTargets(result,verify,{childTimeoutMs=20000,record=()=>{}}={}) {
  if(childTimeoutMs!==undefined&&(!Number.isSafeInteger(childTimeoutMs)||childTimeoutMs<1||childTimeoutMs>120_000))throw new TypeError('Typed target child timeout must be a bounded positive integer');
  const childOptions={stdio:'pipe',...(childTimeoutMs!==undefined?{timeout:childTimeoutMs}:{})};
  const entry=result.meta?.entry;
  if(entry!==undefined&&(typeof entry!=='string'||!entry.endsWith('.rs')||entry.includes('\\')||entry.includes('\0')||entry.includes(':')||entry.split('/').some(part=>!part||part==='.'||part==='..')))throw new TypeError('Typed target entry must be a safe repository-relative Rust path');
  const relative=entry===undefined?'src/module':entry.slice(0,-3);
  const directory=mkdtempSync(join(tmpdir(),'router-typed-targets-'));
  let primaryFailed=false;try {
    writeRuntimeAssets(directory);
    const javascript=join(directory,relative+'.mjs'),typescript=join(directory,relative+'.ts');
    mkdirSync(dirname(javascript),{recursive:true});
    writeFileSync(javascript,result.javascript);
    writeFileSync(typescript,result.typescript);
    // Bun's --check is not Node's syntax-only command. Scan the complete module
    // without executing it or resolving imports; both targets execute below.
    if(process.versions.bun)new Bun.Transpiler({loader:'js',target:'bun'}).scan(result.javascript);
    else execFileSync(process.execPath,['--check',javascript],childOptions);
    const contract=join(directory,'persistent-contract.ts');writeFileSync(contract,`import * as p from './runtime/persistent-output-backend-20261101-runtime.mjs';
import * as dynamic from './runtime/dynamic-primitive-output-20261101-runtime.mjs';
import * as fields from './runtime/json-fields-runtime.mjs';
export function scalarContract(value:import('./runtime/json-macro-runtime.mjs').JsonValue){const text=fields.router_field_json_value_as_str(value),integer=fields.router_field_json_value_as_u64(value),flag=fields.router_field_json_value_as_bool(value),empty:boolean=fields.router_field_json_value_is_null(value);if(integer.$==='Some'){const exact:bigint=integer.field0;void exact;}\n// @ts-expect-error an arbitrary object is not a checked canonical Json value\nfields.router_field_json_value_is_null({kind:'forged'});return [text,flag,empty];}\nexport function textContract(value:string){const result:null=dynamic.output_text_write(false,value);
// @ts-expect-error actual text is required, not a structural marker
dynamic.output_text_write(false,{text:'forged'});return result;}
export function check(context:p.PersistentOutputContext){const options:p.PersistentOutputOptions={dataDirectory:'/fixture',verbose:false,quiet:false,operation:'fixture',token:null,secrets:[],context,version:'fixture',sourceCommit:'UNRUN',python:null};const code:number=p.runPersistentLauncherOperational(options,()=>0);const outcome:number=p.runPersistentLauncher(options,()=>({kind:'ok',code:0}));const count:bigint=p.withPersistentTraceWriter(writer=>p.writePersistentTrace(writer,new Uint8Array([0])));p.withPersistentOperationalWriter(writer=>{p.flushPersistentOperational(writer);});
// @ts-expect-error structural lookalikes never implement the private context brand
p.snapshotPersistentOperationContext({kind:'owned-persistent-output-context'});
// @ts-expect-error launcher and operational writer brands remain distinct
p.withPersistentTraceWriter(writer=>p.flushPersistentOperational(writer));
return [code,outcome,count];}
`);
    const compiled=join(directory,'compiled');
    const require=createRequire(new URL('../../../js/package.json',import.meta.url)),compiler=process.execPath,prefix=[require.resolve('typescript/bin/tsc')];
    const version=execFileSync(compiler,[...prefix,'--version'],childOptions).toString();
    if(version.trim()!=='Version 5.9.3')throw new TypeError('Owned scalar readers require lockfile TypeScript5.9.3');
    record({stage:'compiler-version',version:'5.9.3',output:version});
    const args=[...prefix,'--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--rootDir',directory,'--outDir',compiled,typescript,contract];
    try{const stdout=execFileSync(compiler,args,childOptions).toString();record({stage:'strict-typescript',version:'5.9.3',args,stdout,passed:true});}
    catch(error){record({stage:'strict-typescript',version:'5.9.3',args,stdout:error.stdout?.toString()??'',stderr:error.stderr?.toString()??'',passed:false});throw error;}
    cpSync(join(directory,'runtime'),join(compiled,'runtime'),{recursive:true});
    if(entry===undefined)symlinkSync('../runtime',join(compiled,'src/runtime'),'dir');
    for(const [path,runtimeRoot] of [[javascript,directory],[join(compiled,relative+'.js'),compiled]]) {
      const module=await import(pathToFileURL(path));
      const effects=await import(pathToFileURL(join(runtimeRoot,'runtime/effects.mjs')));
      const output=await import(pathToFileURL(join(runtimeRoot,'runtime/output-literal-core-20261101-runtime.mjs'))),literal=await import(pathToFileURL(join(runtimeRoot,'runtime/literal-arguments-core-20261101-runtime.mjs')));
      const json=await import(pathToFileURL(join(runtimeRoot,'runtime/json-macro-runtime.mjs')));const jsonRuntime=await import(pathToFileURL(join(runtimeRoot,'runtime/json-runtime.mjs'))),fields=await import(pathToFileURL(join(runtimeRoot,'runtime/json-fields-runtime.mjs'))),options=await import(pathToFileURL(join(runtimeRoot,'runtime/primitive-option-runtime.mjs'))),callbacks=await import(pathToFileURL(join(runtimeRoot,'runtime/primitive-option-callback-runtime.mjs')));const persistent=await import(pathToFileURL(join(runtimeRoot,'runtime/persistent-output-backend-20261101-runtime.mjs')));const dynamic=await import(pathToFileURL(join(runtimeRoot,'runtime/dynamic-primitive-output-20261101-runtime.mjs')));await verify(module.translated,result,module,{effects,output,literal,persistent,dynamic,json,jsonRuntime,fields,options,callbacks});
    }
  }catch(error){primaryFailed=true;throw error;}finally{try{rmSync(directory,{recursive:true,force:true});}catch(error){if(!primaryFailed)throw error;}}
}
