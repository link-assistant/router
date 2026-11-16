// Independent native scalar presentation/forward regression SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeScalarTypeScriptModule,nativeScalarTypeScriptType} from '../native-scalar-typescript.mjs';
import {typeScriptType,typeScriptAliases,valueSchema,dataAliasName} from '../type-layout.mjs';
import {translateSource,tsType,annotateRuntimeTypes} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {prepareForwardNativeScalarSources} from '../prepare-forward-native-scalar-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},module='../runtime/primitive-operator-runtime.mjs',options={nativeScalarModule:module};
const types=[['u8','RustU8',8,false],['i8','RustI8',8,true],['u16','RustU16',16,false],['i16','RustI16',16,true],['u32','RustU32',32,false],['i32','RustI32',32,true],['u64','RustU64',64,false],['i64','RustI64',64,true],['u128','RustU128',128,false],['i128','RustI128',128,true]];
const fixed=([rustPrimitiveName,,bits,signed])=>({kind:'fixed',rustPrimitiveName,bits,signed}),expected=alias=>'import("../runtime/primitive-operator-runtime.mjs").'+alias;
test('exact native identities retain widths through signatures future values arrays and recursive data aliases',limits,()=>{
 for(const row of types){const type=fixed(row);assert.equal(nativeScalarTypeScriptType(type,module),expected(row[1]));assert.equal(typeScriptType(type,new Map(),options),expected(row[1]));assert.equal(tsType({kind:'routerFuture',value:type},[],options),'PromiseLike<'+expected(row[1])+'>');assert.equal(typeScriptType({kind:'array',element:type},new Map(),options),'ReadonlyArray<'+expected(row[1])+'>');assert.equal(typeScriptType(type,new Map()),'bigint');assert.equal(nativeScalarTypeScriptType(type,null),null);}
 const tree={k:'data',fullName:'Tree',ctors:[{name:'Leaf',fields:[{name:'number',type:fixed(types[0])}]},{name:'Branch',fields:[{name:'child',type:{kind:'data',name:'Tree'}}]}]},declarations=new Map([['Tree',tree]]),aliases=typeScriptAliases(declarations,options);assert.ok(aliases.includes(expected('RustU8')));assert.ok(aliases.includes(dataAliasName('Tree')));assert.equal(typeScriptAliases(declarations).includes('primitive-operator-runtime'),false);assert.equal(Object.hasOwn(valueSchema(declarations).types.Tree.ctors[0].fields[0].type,'nativeScalarTypeScript'),false);
 for(const type of [{kind:'nat'},{kind:'int'},{kind:'fixed',bits:8,signed:false},{...fixed(types[0]),rustPrimitiveName:'usize'},{...fixed(types[0]),bits:16},...['rustReference','rustOwnership','patternOwnershipRefusal','rustGenericIdentityUnresolved','rustBorrowingUnresolved','rustBorrowLifetime'].map(flag=>({...fixed(types[0]),[flag]:true}))])assert.equal(nativeScalarTypeScriptType(type,module),null);
 for(const value of ['runtime/primitive-operator-runtime.mjs','/runtime/primitive-operator-runtime.mjs','../runtime/other.mjs','../runtime/primitive-operator-runtime.mjs\n',{},42])assert.throws(()=>nativeScalarTypeScriptModule(value),TypeError);
});
test('complete annotator retains native parameter return and checked local evidence without changing runtime source',limits,()=>{
 const runtime='function selected(value){const chosen=value;return chosen;}\n',type=fixed(types[0]),params=new Map([['selected',[{name:'value',type}]]]),returns=new Map([['selected',type]]),locals=[{function:'selected',name:'chosen',type}],typed=annotateRuntimeTypes(runtime,params,[],returns,locals,options);assert.ok(typed.includes('value: '+expected('RustU8')));assert.ok(typed.includes('): '+expected('RustU8')));assert.ok(typed.includes(' as '+expected('RustU8')));assert.equal(annotateRuntimeTypes(runtime,params,[],returns,locals).includes('primitive-operator-runtime'),false);
});
test('actual standalone forward output carries native ABI annotations through its concrete and semantic path',limits,async()=>{
 const source='pub fn mask(left:u8,right:u8)->u8{left|right}pub fn signed(left:i128,right:i128)->i128{left^right}',result=translateSource(source,'src/scalars.rs');assert.equal(result.ir.items.filter(row=>row.status==='executable').length,2);assert.ok(result.typescript.includes(expected('RustU8')));assert.ok(result.typescript.includes(expected('RustI128')));await verifyTypedTargets(result,api=>{assert.equal(api.mask(85n,51n),119n);assert.equal(api.signed(-1n,-170141183460469231731687303715884105728n),170141183460469231731687303715884105727n);},{childTimeoutMs:20000});
});
test('actual project forwarding preserves all ten native domains and reparsed checked meta under strict TS',limits,async()=>{
 const source=types.map(([name])=>'pub fn mask_'+name+'(left:'+name+',right:'+name+')->'+name+'{left|right}').join(''),result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.equal(result.meta.executable.length,10,JSON.stringify(result.meta.refused));for(const [,alias]of types)assert.ok(result.typescript.includes(expected(alias)),alias);const serialized=JSON.stringify(result.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(serialized)),serialized);await verifyTypedTargets(result,api=>{for(const [name]of types)assert.equal(api['mask_'+name](85n,51n),119n,name);},{childTimeoutMs:20000});
});
test('twelve whole source equations retain both fixed phases and full source inverses',limits,()=>{
 const plan=prepareForwardNativeScalarSources();assert.equal(plan.files.length,12);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
