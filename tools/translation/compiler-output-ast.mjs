// Opt-in original compiler source flow. Structured syntax is not an executed
// iterator, typed constructor value, hygiene proof or complete output theorem.
import {compilerOutputAstSourceAccess,requireCompilerOutputAstSourceAccess} from './builtin-derive-ast-meta.mjs';
import {createCompilerOutputAstSourceSubstitution} from './builtin-ast-source-substitution.mjs';
const compilers=new WeakMap(),flows=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const edition='compiler/rustc_builtin_macros/src/edition_panic.rs';
// Paths identify missing original contracts, not acquired sources or owners.
// Each remains a machine-readable work item after focused receiving checks.
export const COMPILER_OUTPUT_COLLECTION_WORKLIST=freeze([
 {id:'rust.collection.once',inputs:['library/core/src/iter/sources/once.rs'],requires:['Iterator::next','once construction','single owned Ident value']},
 {id:'rust.collection.chain',inputs:['library/core/src/iter/adapters/chain.rs'],requires:['ordered next/short-circuit','Once then slice Map state']},
 {id:'rust.collection.map',inputs:['library/core/src/iter/adapters/map.rs'],requires:['actual Iterator/FnMut owner','closure input and call once per yielded element']},
 {id:'rust.collection.slice-iter',inputs:['library/core/src/slice/iter.rs'],requires:['slice lifetime/length','unsafe pointer implementation','shared reference Copy and |&s| pattern']},
 {id:'rust.collection.vec-into-iter',inputs:['library/alloc/src/vec/into_iter.rs'],requires:['owned vector traversal/drop','IntoIterator actual route']},
 {id:'rust.collection.vec-collect',inputs:['library/alloc/src/vec/mod.rs','library/alloc/src/vec/spec_from_iter.rs'],requires:['FromIterator specialization','allocator/storage/drop','complete collect source route']},
 {id:'rust.compiler.path-segment',inputs:['compiler/rustc_ast/src/lib.rs','compiler/rustc_ast/src/ast.rs'],requires:['wildcard public reexport namespace','PathSegment::from_ident actual impl','Self/Ident/NodeId/Option source types']},
 {id:'rust.compiler.std-path',inputs:['compiler/rustc_expand/src/base.rs','compiler/rustc_span/src/symbol.rs'],requires:['ExtCtxt original receiver','def-site span/hygiene','DollarCrate actual owner','Ident constructors','immutable collection contracts above']},
 {id:'rust.compiler.return-carriers',inputs:['compiler/rustc_expand/src/base.rs'],requires:['ExpandResult Ready/Retry actual variants','make_MacEager complete declarative expansion','all MacResult expression/pattern/items/stmts/type accessors','selected expr slot and all other fields exact']},
 {id:'rust.compiler.edition-stack',inputs:[edition],requires:['actual private expansion stack','allow_internal_unstable lookup','call-site ancestry','all loop/continue/break conditions','edition comparison']},
 {id:'rust.compiler.nested-format-output',inputs:['library/core/src/panic.rs','library/std/src/panic.rs','compiler/rustc_builtin_macros/src/format.rs'],requires:['both editions/abort alternatives','actual selected panic/unreachable owner','format_args/const_format_args full arguments and output']},
].map(entry=>({...entry,rustRevision:'29483883eed69d5fb4db01964cdf2af4d86e9cb2',status:'unresolved',sourceAcquisitionComplete:false,semanticsProved:false})));
export function createCompilerOutputAstCompiler(profile,sourcePlan){
 const access=compilerOutputAstSourceAccess(profile,sourcePlan),stage=createCompilerOutputAstSourceSubstitution(profile,access);
 const compiler=Object.freeze({schema:'private-compiler-output-source-flow-v1'});compilers.set(compiler,{profile,sourcePlan,access,stage});return compiler;
}
export function compileOriginalCompilerOutputFlow(compiler,path,name,selector=null){
 const state=compilers.get(compiler);if(!state)throw new TypeError('Original compiler output requires its private compiler');
 requireCompilerOutputAstSourceAccess(state.access,state.profile);
 if(typeof path!=='string'||typeof name!=='string'||!/^[_a-zA-Z][_a-zA-Z0-9]*$/u.test(name))throw new TypeError('Original compiler source member and function required');
 const original=state.access.original(path),fragment=state.access.function(path,name,selector),program=state.stage.compile(fragment),substitution=state.stage.substitute(program);
 const token=Object.freeze({schema:'private-original-compiler-output-flow-v1'}),facts=freeze({schema:'original-compiler-output-flow-v1',original,fragment,program,substitution,
  sourceSyntaxRetained:true,concreteCollectionValuesProved:false,constructorOwnerResolved:false,controlAndEffectClosureComplete:false,completeOutputProved:false,namespaceAuthority:false,runtimeAuthority:false,
  worklist:COMPILER_OUTPUT_COLLECTION_WORKLIST});
 flows.set(token,{compiler,state,fragment,facts});return token;
}
export function originalCompilerOutputFlowFacts(token,compiler){
 const record=flows.get(token);if(!record||record.compiler!==compiler||compilers.get(compiler)!==record.state)throw new TypeError('Copied or foreign original compiler output flow');
 requireCompilerOutputAstSourceAccess(record.state.access,record.state.profile).assert(record.fragment);record.state.stage.assert(record.facts.substitution);return record.facts;
}
