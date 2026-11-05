// Independent typed aliases/public native operator regression SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {createOwnedCoreSourceContext,ownedCoreRuntimeSources,ownedPrimitiveOperatorRuntimeSources} from '../owned-outcome-source.mjs';
import {translateOwnedAliasedTypeScript} from '../owned-aliased-typescript.mjs';
import {translateOwnedModuleProject} from '../owned-module-scalar-project.mjs';
import {restoreOwnedModuleProject} from '../owned-module-restore.mjs';
import {prepareOwnedCoreRuntime,evaluateOwnedCoreBatch} from '../owned-outcome-operations.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000};
function data(source){const original=ownedStateReceivingData([{path:'entry.mts',source}]);return {...original,primitiveOperators:true,files:original.files.filter(row=>!row.path.startsWith('runtime/')).concat([...new Map([...ownedCoreRuntimeSources(),...ownedPrimitiveOperatorRuntimeSources()].map(row=>[row.path,row])).values()])};}
const aliases='type Identity<T extends bigint>=T;type Word=Identity<import("./runtime/primitive-operator-runtime.mjs").RustU128>;\n',functions='export function combine(left:Word,right:Word):Word{return left|right;}\nexport function present(left:Word,right:Word):boolean{return (left&right)!==0n;}\n';
test('actual generic native type aliases qualify ordinary BigInt operator bodies without forging imported host calls',limits,async()=>{
 const source=aliases+functions,result=translateOwnedAliasedTypeScript(source,{context:createOwnedCoreSourceContext(data(source)),sourcePath:'entry.mts'});assert.equal(result.program.length,2);assert.ok(result.program.every(row=>row.hostCalls.length===0&&row.sourceNativeOperators.length>=1));assert.equal(result.program.find(row=>row.javascript==='present').sourceNativeOperators.length,2);assert.equal(result.ownedTypeAliasSourceHistory.equations[0].inverse,source);assert.equal(result.ownedTypeAliasSourceHistory.nativeScalarConstraints.sourceAuthority,false);const token=await prepareOwnedCoreRuntime(result.program);assert.deepEqual(evaluateOwnedCoreBatch(result.program,[['combine',[1n<<127n,1n]],['present',[1n<<127n,1n]],['present',[1n<<127n,1n<<127n]]],token),[(1n<<127n)+1n,false,true]);
});
test('public raw native operator modules retain concrete Rust aliases and complete receiving restoration',limits,()=>{
 const source=aliases.replace('type Word=','export type Word=')+functions,input=data(source),project={entry:'entry.mts',language:'TypeScript',modules:[{path:'entry.mts',source}]},forward=translateOwnedModuleProject(project,{context:createOwnedCoreSourceContext(input)});assert.ok(forward.rust.includes('pub type Word = ::core::primitive::u128;'));assert.equal(forward.program.length,2);const files=input.files.concat([{path:'generated/project.rs',source:forward.rust}]),restored=restoreOwnedModuleProject(forward.rust,{project,context:createOwnedCoreSourceContext({...input,files}),sourcePath:'generated/project.rs'});assert.equal(sameRustSourceSyntax(forward.rust,restored.rust),true);assert.equal(restored.runtimeParity,false);assert.equal(restored.rustExecuted,false);
});
