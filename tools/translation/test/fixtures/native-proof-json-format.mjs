// Explicit test-DATA format equations; no source, owner or semantic permit.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {ownershipCompiler} from '../../js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline,exactSubstitutionRule} from '../../rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../../concrete-syntax-meta.mjs';
const RULES=Object.freeze([
 Object.freeze({path:'tools/translation/builtin-debug-ast-route.mjs',before:"import {createPrivateFrozenJsonComposer} from './private-frozen-json.mjs';",intermediate:"import {createPrivateNativeProofJsonSerializer as createPrivateFrozenJsonComposer} from './private-frozen-json.mjs';",after:"import {createPrivateNativeProofJsonSerializer as createPrivateFrozenJsonComposer} from './private-native-proof-json.mjs';"}),
 Object.freeze({path:'tools/translation/builtin-derive-bang-footprints.mjs',before:"import {createPrivateFrozenJsonCache,createPrivateFrozenJsonComposer,privateFrozenJsonEqualHint} from './private-frozen-json.mjs';",intermediate:"import {createPrivateFrozenJsonCache,privateFrozenJsonEqualHint} from './private-frozen-json.mjs';\nimport {createPrivateNativeProofJsonSerializer as createPrivateFrozenJsonComposer} from './private-frozen-json.mjs';",after:"import {createPrivateFrozenJsonCache,privateFrozenJsonEqualHint} from './private-frozen-json.mjs';\nimport {createPrivateNativeProofJsonSerializer as createPrivateFrozenJsonComposer} from './private-native-proof-json.mjs';"}),
]);
export const PROOF_JSON_FORMAT_PATHS=Object.freeze(RULES.map(row=>row.path));
const sourcePins={"tools/translation/builtin-debug-ast-route.mjs":{"before":{"bytes":39396,"utf16Units":39396,"sha256":"1ffa9517fd5cadbbb26aa5578db1074e9900017601f2188a4077662507f59e75"},"after":{"bytes":39444,"utf16Units":39444,"sha256":"a1d3655d8de9b6628b4a83014b5d0bb2eb67cf7a77a6f5a2846bc39854ec4e5a"}},"tools/translation/builtin-derive-bang-footprints.mjs":{"before":{"bytes":39014,"utf16Units":39014,"sha256":"11372586893462cd262c55902b268f71568d237eceb12283cd9b9724b36c1514"},"after":{"bytes":39105,"utf16Units":39105,"sha256":"6fab80c5f6ad1428215f12820efc20779ea6496c1a446bc80d925f44c62f7613"}}};
for(const path of PROOF_JSON_FORMAT_PATHS){Object.freeze(sourcePins[path].before);Object.freeze(sourcePins[path].after);Object.freeze(sourcePins[path]);}
export const PROOF_JSON_FORMAT_SOURCE_PINS=Object.freeze(sourcePins);
const fail=message=>{throw new TypeError('Private proof JSON format DATA: '+message);};
const hash=source=>createHash('sha256').update(source).digest('hex');
function exact(source,before,after,id){return exactSubstitutionRule(id,before,after.split('$').join('$$'),'one complete format equation required: '+id).apply(source);}
/** Legacy comparison subjects explicitly retain the original composer. This
 * literal-only preparation adds no I/O, CST, producer call or warming. The
 * actual selected-mode source and complete inverse stay separate test DATA.
 */
export function legacyProofConsumerSource(source,retain=()=>{}){
 source=unscopedCreatorSource(source,retain);
 source=statelessProofConsumerSource(source,retain);
 if(typeof source!=='string')fail('complete source text required');
 let selected=null;for(const row of RULES)if(source.includes(row.after)&&(!selected||row.after.length>selected.after.length))selected=row;
 if(!selected)return source;
 const legacy=exact(source,selected.after,selected.before,'legacy-comparison-import');
 if(RULES.some(row=>legacy.includes(row.after)))fail('multiple format imports');
 const replay=exact(legacy,selected.before,selected.after,'selected-format-roundtrip');
 if(replay!==source)fail('complete literal inverse differs');
 retain('explicit-selected-format-and-legacy-comparison-source',{path:selected.path,actualSource:source,legacySource:legacy,replayedSource:replay,rules:[{phase:'language',before:selected.before,after:selected.intermediate},{phase:'repository',before:selected.intermediate,after:selected.after}],scope:'Literal test DATA only. Both historical storage comparison subjects explicitly select legacy; actual new-mode production is exercised independently.',authority:{source:false,owner:false,type:false,executable:false}});
 return legacy;
}
function ownSources(input){
 if(!input||typeof input!=='object'||types.isProxy(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))fail('two complete own source strings required');
 const parent=Object.getPrototypeOf(input),names=Reflect.ownKeys(input);
 // Census precedes descriptors: an unknown native lazy stack is never read.
 if(names.length!==2||names.some(name=>typeof name!=='string'||!PROOF_JSON_FORMAT_PATHS.includes(name)))fail('exact two source paths required');
 const fields=Object.getOwnPropertyDescriptors(input),value=Object.create(null);let total=0;
 for(const path of PROOF_JSON_FORMAT_PATHS){const field=fields[path];if(!field||!Object.hasOwn(field,'value')||!field.enumerable||typeof field.value!=='string'||field.value.length>262144)fail('bounded source DATA fields required');value[path]=field.value;total+=field.value.length;}
 if(total>524288)fail('whole source budget');
 return {value,verify(){if(Object.getPrototypeOf(input)!==parent)fail('source prototype changed');const now=Reflect.ownKeys(input);if(now.length!==names.length||now.some((name,at)=>name!==names[at]))fail('source keys changed');for(const name of names){const a=fields[name],b=Object.getOwnPropertyDescriptor(input,name);if(!b||!Object.hasOwn(b,'value')||a.value!==b.value||a.writable!==b.writable||a.enumerable!==b.enumerable||a.configurable!==b.configurable)fail('source fields changed');}}};
}
function stage(source,after,phase,id){
 const first=transportConcreteSyntaxSource(source,{language:'JavaScript'}),beforeMeta=serializeConcreteSyntaxMeta(first.document),before=transportConcreteSyntaxMeta(beforeMeta);
 if(before.source!==source)fail('whole source CST input differs');
 const ts=ownershipCompiler(),syntax=ts.createSourceFile('proof-format.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(syntax.parseDiagnostics.length)fail('complete native input syntax');
 const edits=[{span:[0,source.length],expected:source,replacement:after}],sequence={languageRules:phase==='language'?[{id,edits}]:[],repositoryRules:phase==='repository'?[{id,edits}]:[]},applied=applyConcreteSyntaxSubstitutions(before.document,sequence),afterMeta=serializeConcreteSyntaxMeta(applied.value),restored=transportConcreteSyntaxMeta(afterMeta);
 if(restored.source!==after)fail('whole source CST output differs');
 const output=ts.createSourceFile('proof-format.mjs',after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(output.parseDiagnostics.length)fail('complete native output syntax');
 const inverseEdits=[{span:[0,after.length],expected:after,replacement:source}],inverse=applyConcreteSyntaxSubstitutions(restored.document,{languageRules:phase==='language'?[{id:id+'-inverse',edits:inverseEdits}]:[],repositoryRules:phase==='repository'?[{id:id+'-inverse',edits:inverseEdits}]:[]});
 if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==source)fail('complete source CST inverse differs');
 return {phase,id,before:{source,sha256:hash(source),meta:beforeMeta},after:{source:after,sha256:hash(after),meta:afterMeta},edits,trace:applied.trace,mapping:[{kind:'substitution',before:[0,source.length],after:[0,after.length],expected:source,replacement:after}],completeInverse:true};
}
/** Complete two-module proposal DATA, never an installation/admission permit. */
export function proposeNativeProofConsumerFormats(input){
 const captured=ownSources(input),rows=[];
 for(const row of RULES){const source=captured.value[row.path],pin=PROOF_JSON_FORMAT_SOURCE_PINS[row.path].before;if(source.length!==pin.utf16Units||hash(source)!==pin.sha256)fail('complete pinned consumer beforeimage differs');const pipeline=createRulePipeline([
  {phase:'language',rules:[{id:'javascript:explicit-json-byte-format-factory',apply:source=>stage(source,exact(source,row.before,row.intermediate,'factory-binding'),'language','javascript:explicit-json-byte-format-factory')}]},
  {phase:'repository',rules:[{id:'router:select-private-native-json-module',apply:first=>({first,second:stage(first.after.source,exact(first.after.source,row.intermediate,row.after,'private-module-import'),'repository','router:select-private-native-json-module')})}]},
 ]),run=pipeline.run(source),{first,second}=run.value;
 rows.push({file:row.path,before:first.before,intermediate:first.after,after:second.after,stages:[first,second],trace:run.trace,completeInverse:true});}
 captured.verify();return {schema:'private-native-proof-json-source-format-v1',rows,authority:{source:false,owner:false,type:false,executable:false},semanticChecksPassed:false,installApproved:false,obligations:['Independent fresh physical/NativeGit complete sources remain mandatory.','Current private owner/source/parser/CST/reissue/Hash operations stay exact.','Compare full genuinely issued old/new proof bytes and Hash payloads under both engines.','Native format intentionally changes internal global lookup/JSON/measurement/warming observations; legacy default composer contracts stay exact.','No result/verdict/source cache or performance/coverage completion follows from this DATA.']};
}
export function restoreNativeProofConsumerFormats(input){const captured=ownSources(input),restored=Object.create(null);for(const row of RULES){const source=captured.value[row.path],pin=PROOF_JSON_FORMAT_SOURCE_PINS[row.path].after;if(source.length!==pin.utf16Units||hash(source)!==pin.sha256)fail('complete selected consumer afterimage differs');const before=exact(source,row.after,row.before,'restore-native-format');if(exact(before,row.before,row.after,'restore-forward')!==source)fail('whole restore inverse');restored[row.path]=before;}captured.verify();return restored;}

// Additive scoped-format DATA. Old RULES/pins/proposal/restore keep their original
// stateless-native meaning; actual current sources and full inverses are separate.
const SCOPED_RULES=Object.freeze(RULES.map(row=>Object.freeze({path:row.path,before:row.after,intermediate:row.after.replace('createPrivateNativeProofJsonSerializer as','createScopedPrivateNativeProofJsonSerializer as').replace("'./private-native-proof-json.mjs'","'./private-frozen-json.mjs'"),after:row.after.replace('createPrivateNativeProofJsonSerializer as','createScopedPrivateNativeProofJsonSerializer as')})));
const scopedSourcePins={"tools/translation/builtin-debug-ast-route.mjs":{"before":{"bytes":39444,"utf16Units":39444,"sha256":"a1d3655d8de9b6628b4a83014b5d0bb2eb67cf7a77a6f5a2846bc39854ec4e5a"},"after":{"bytes":39450,"utf16Units":39450,"sha256":"7ded8d6f0653255e6fdb4749b39f62abb14e86bbc98b41449783ee3e929e932a"}},"tools/translation/builtin-derive-bang-footprints.mjs":{"before":{"bytes":39105,"utf16Units":39105,"sha256":"6fab80c5f6ad1428215f12820efc20779ea6496c1a446bc80d925f44c62f7613"},"after":{"bytes":39111,"utf16Units":39111,"sha256":"2da70566c2c4b6d822bd7fc730d8ee07e952554bf3f19f43f345e8d25bdd00bb"}}};
for(const path of PROOF_JSON_FORMAT_PATHS){Object.freeze(scopedSourcePins[path].before);Object.freeze(scopedSourcePins[path].after);Object.freeze(scopedSourcePins[path]);}
export const SCOPED_PROOF_JSON_FORMAT_SOURCE_PINS=Object.freeze(scopedSourcePins);
export function statelessProofConsumerSource(source,retain=()=>{}){
 if(typeof source!=='string')fail('complete source text required');
 let selected=null;for(const row of SCOPED_RULES)if(source.includes(row.after)&&(!selected||row.after.length>selected.after.length))selected=row;
 if(!selected)return source;
 const stateless=exact(source,selected.after,selected.before,'stateless-comparison-import');
 if(SCOPED_RULES.some(row=>stateless.includes(row.after)))fail('multiple scoped format imports');
 const replay=exact(stateless,selected.before,selected.after,'scoped-format-roundtrip');if(replay!==source)fail('whole scoped literal inverse differs');
 retain('explicit-scoped-and-stateless-comparison-source',{path:selected.path,actualSource:source,statelessSource:stateless,replayedSource:replay,rules:[{phase:'language',before:selected.before,after:selected.intermediate},{phase:'repository',before:selected.intermediate,after:selected.after}],authority:{source:false,owner:false,type:false,executable:false}});
 return stateless;
}
export function proposeScopedProofConsumerFormats(input){
 const captured=ownSources(input),rows=[];
 for(const row of SCOPED_RULES){const source=captured.value[row.path],pin=SCOPED_PROOF_JSON_FORMAT_SOURCE_PINS[row.path].before;if(source.length!==pin.utf16Units||hash(source)!==pin.sha256)fail('complete scoped consumer beforeimage differs');
  const pipeline=createRulePipeline([
   {phase:'language',rules:[{id:'javascript:scoped-proof-cost-factory',apply:source=>stage(source,exact(source,row.before,row.intermediate,'scoped-factory-binding'),'language','javascript:scoped-proof-cost-factory')}]},
   {phase:'repository',rules:[{id:'router:select-scoped-proof-byte-format',apply:first=>({first,second:stage(first.after.source,exact(first.after.source,row.intermediate,row.after,'scoped-module-import'),'repository','router:select-scoped-proof-byte-format')})}]},
  ]),run=pipeline.run(source),{first,second}=run.value;
  rows.push({file:row.path,before:first.before,intermediate:first.after,after:second.after,stages:[first,second],trace:run.trace,completeInverse:true});
 }
 captured.verify();return {schema:'private-scoped-proof-json-source-format-v1',rows,authority:{source:false,owner:false,type:false,executable:false},semanticChecksPassed:false,installApproved:false,obligations:['All actual source/owner/parser/reissue/JSON/Hash fences remain fresh.','Scoped costs are invocation-local immutable DATA only; every occurrence is charged.','New internal measurement/warming/RegExp scratch observations are explicit.','No performance qualification follows from this DATA.']};
}
export function restoreScopedProofConsumerFormats(input){
 const captured=ownSources(input),restored=Object.create(null);
 for(const row of SCOPED_RULES){const source=captured.value[row.path],pin=SCOPED_PROOF_JSON_FORMAT_SOURCE_PINS[row.path].after;if(source.length!==pin.utf16Units||hash(source)!==pin.sha256)fail('complete scoped consumer afterimage differs');const before=statelessProofConsumerSource(source);if(exact(before,row.before,row.after,'scoped-restore-forward')!==source)fail('whole scoped restore inverse');restored[row.path]=before;}
 captured.verify();return restored;
}

// Default creator selection is explicit format DATA, not source/owner authority.
const DEFAULT_CREATOR_HEADER={"before":"export function createDeriveBangContext({deriveContext}={}){","after":"export function createUnscopedDeriveBangContext({deriveContext}={}){"},EXPLICIT_CREATOR_CALL={"before":" return withPrivateNativeProofCostScope(()=>createDeriveBangContext(options));","after":" return withPrivateNativeProofCostScope(()=>createUnscopedDeriveBangContext(options));"},DEFAULT_CREATOR_APPEND="\n// Default selection scopes only the genuine synchronous creator body.\nexport function createDeriveBangContext({deriveContext}={}){\n return withPrivateNativeProofCostScope(()=>createUnscopedDeriveBangContext({deriveContext}));\n}\n";
export function unscopedCreatorSource(source,retain=()=>{}){
 source=restoreRetainedCreatorSource(source,retain);
 if(typeof source!=='string')fail('complete creator source text required');
 if(!source.includes(DEFAULT_CREATOR_HEADER.after)&&!source.includes(EXPLICIT_CREATOR_CALL.after)&&!source.includes(DEFAULT_CREATOR_APPEND))return source;
 if(source.split(DEFAULT_CREATOR_HEADER.after).length!==2||source.split(EXPLICIT_CREATOR_CALL.after).length!==2||source.split(DEFAULT_CREATOR_APPEND).length!==2||!source.endsWith(DEFAULT_CREATOR_APPEND))fail('incomplete or duplicate default creator format');
 const withoutAppend=source.slice(0,-DEFAULT_CREATOR_APPEND.length),oldCall=exact(withoutAppend,EXPLICIT_CREATOR_CALL.after,EXPLICIT_CREATOR_CALL.before,'restore-explicit-one-scope-callee'),unscoped=exact(oldCall,DEFAULT_CREATOR_HEADER.after,DEFAULT_CREATOR_HEADER.before,'restore-original-creator-declaration');
 const reheaded=exact(unscoped,DEFAULT_CREATOR_HEADER.before,DEFAULT_CREATOR_HEADER.after,'replay-unscoped-control-declaration'),recalled=exact(reheaded,EXPLICIT_CREATOR_CALL.before,EXPLICIT_CREATOR_CALL.after,'replay-explicit-one-scope-callee'),replayed=recalled+DEFAULT_CREATOR_APPEND;
 if(replayed!==source)fail('complete default creator source inverse differs');
 retain('complete-default-creator-format-and-unscoped-history',{actualSource:source,unscopedSource:unscoped,replayedSource:replayed,stages:[{phase:'language',before:unscoped,after:reheaded,rule:DEFAULT_CREATOR_HEADER},{phase:'repository',before:reheaded,after:recalled,rule:EXPLICIT_CREATOR_CALL},{phase:'repository',before:recalled,after:source,fullRootAppend:{before:recalled,after:source}}],authority:{source:false,owner:false,type:false,executable:false}});
 return unscoped;
}

// Complete706 creator DATA, separate from all existing703 and native/scoped rules.
const RETAINED_CREATOR_RULES=[{"before":"import {withPrivateNativeProofCostScope} from './private-native-proof-json.mjs';","after":"import {withPrivateNativeProofCostScope,withRetainedPrivateNativeProofCostScope} from './private-native-proof-json.mjs';","phase":"language","id":"javascript:extend-one-existing-scope-import"},{"before":" return withPrivateNativeProofCostScope(()=>createUnscopedDeriveBangContext({deriveContext}));","after":" return withRetainedPrivateNativeProofCostScope(()=>createUnscopedDeriveBangContext({deriveContext}));","phase":"repository","id":"router:default-retains-immutable-arithmetic-only"},{"before":"// Default selection scopes only the genuine synchronous creator body.\nexport function createDeriveBangContext({deriveContext}={}){\n return withRetainedPrivateNativeProofCostScope(()=>createUnscopedDeriveBangContext({deriveContext}));\n}\n","after":"// Default selection scopes only the genuine synchronous creator body.\nexport function createDeriveBangContext({deriveContext}={}){\n return withRetainedPrivateNativeProofCostScope(()=>createUnscopedDeriveBangContext({deriveContext}));\n}\n\n// Explicit core format selection; options retain the original in-scope getter.\nexport function createRetainedProofDeriveBangContext(options){\n return withRetainedPrivateNativeProofCostScope(()=>createUnscopedDeriveBangContext(options));\n}\n","phase":"repository","id":"router:explicit-retained-core-creator"}];
export function proposeRetainedCreatorSource(source,retain=()=>{}){
 if(typeof source!=='string')fail('complete creator source text required');
 const before=source,stages=[];
 for(const row of RETAINED_CREATOR_RULES){const prior=source;source=exact(source,row.before,row.after,row.id);stages.push({phase:row.phase,before:prior,after:source,rule:row});}
 retain('complete706-retained-creator-forward-DATA',{before,after:source,stages,authority:{source:false,owner:false,type:false,executable:false}});return source;
}
export function restoreRetainedCreatorSource(source,retain=()=>{}){
 if(typeof source!=='string')fail('complete creator source text required');
 if(!source.includes('withRetainedPrivateNativeProofCostScope')&&!source.includes('createRetainedProofDeriveBangContext'))return source;
 const current=source,stages=[];
 for(let at=RETAINED_CREATOR_RULES.length-1;at>=0;at--){const row=RETAINED_CREATOR_RULES[at];if(source.split(row.after).length!==2)fail('incomplete or duplicate default creator format');const prior=source;source=exact(source,row.after,row.before,row.id+'-inverse');stages.push({phase:row.phase,before:prior,after:source,rule:row});}
 const replay=proposeRetainedCreatorSource(source);if(replay!==current)fail('complete retained creator source inverse differs');
 retain('complete706-retained-creator-inverse-DATA',{actualSource:current,source703:source,replayedSource:replay,stages,authority:{source:false,owner:false,type:false,executable:false}});return source;
}
