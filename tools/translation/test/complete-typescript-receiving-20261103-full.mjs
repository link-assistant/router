// Full copied SDK/actual copied compiler receiver SOURCE, explicitly deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {produceCompleteTypeScriptReceivingSourcePackage} from '../complete-typescript-receiving-20261103.mjs';
/** compilerRoot must be the entire actual fresh compiler package, not a fixture. */
export function registerCompleteTypeScriptReceivingCases({sourceRoot,compilerRoot}){
 test('actual complete copied SDK can acquire a fresh original native birth in a complete receiving compiler',{timeout:120000},t=>{
  sourceRoot=fs.realpathSync(resolve(sourceRoot));compilerRoot=fs.realpathSync(resolve(compilerRoot));
  assert.ok(compilerRoot!==sourceRoot&&!compilerRoot.startsWith(sourceRoot+sep));
  const container=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'actual-complete-sdk-receiver-')));t.after(()=>fs.rmSync(container,{recursive:true,force:true}));
  const sdk=produceCompleteTypeScriptReceivingSourcePackage({sourceRoot,destination:join(container,'package')});
  const script=`
   import assert from 'node:assert/strict';import {createRequire}from'node:module';import {join}from'node:path';
   import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent,ownershipCompilerRuntimeOriginData,ownershipCompilerRuntimeSourceScopeCurrent}from'./tools/translation/js-to-rust/vendor/module-syntax.mjs';
   const sourceRoot=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT,require=createRequire(join(sourceRoot,'js/package.json'));
   assert.equal(require.resolve('typescript/package.json'),join(sourceRoot,'js/node_modules/typescript/package.json'));
   const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');assert.equal(ownershipCompilerRuntimeNativeCurrent(ts),true);assert.equal(ownershipCompilerRuntimeSourceScopeCurrent(ts),true);assert.ok(ownershipCompilerRuntimeOriginData(ts));
   const source='export function copiedSdkCase(value:number):number{return value+1;}';
   const file=ts.createSourceFile('actual-receiving-source.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(file.text,source);assert.equal(file.parseDiagnostics.length,0);assert.equal(ts.isFunctionDeclaration(file.statements[0]),true);
   assert.equal(ownershipCompilerRuntimeSourceScopeCurrent(ts),true);assert.equal(ownershipCompilerRuntimeNativeCurrent(ts),true);
  `;
  execFileSync(process.execPath,['--input-type=module','-e',script],{cwd:compilerRoot,env:{...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:sdk.root},timeout:30000,maxBuffer:1048576,stdio:'pipe'});
  assert.equal(sdk.tarballIntegrityVerified,false);assert.equal(sdk.compilerQualified,false);
 });
}
