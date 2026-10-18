// Pure source proposal DATA. No installer, compiler permit or observer equivalence
// for arbitrary stack/source inspection is issued by these source/CST equations.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {createRulePipeline,exactSubstitutionRule} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const COMMON="tools/translation/original-json-intrinsics.mjs";
const LINKS="tools/translation/extensions/source-links.mjs";
const CLONE="tools/translation/extensions/clone-source-body.mjs";
const HEADER="export function copyOriginalDigestMetadata(value,fallback,ordinal){";
const MARKER="\n\n// Private internal-source digest copy; derived from the complete 645 kernel.\n";
const OLD_IMPORT="import {originalFlatTokenIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,copyOriginalDigestMetadata} from '../original-json-intrinsics.mjs';";
const NEW_IMPORT="import {originalFlatTokenIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,copyOriginalDigestMetadata,createOriginalDigestMetadataCopierForInternalSources} from '../original-json-intrinsics.mjs';";
const OLD_READER="export function originalParsedDeclarationEvidence(entry) {\n  const evidence=linked.get(entry);if(!evidence)return null;\n  if(evidence.parsedSurfaceSha256!==metadataDigest(entry))fail('original parsed declaration changed after source capture');\n  return evidence;\n}";
const NEW_READER="export function originalParsedDeclarationEvidence(entry) {\n  const evidence=linked.get(entry);if(!evidence)return null;\n  if(evidence.parsedSurfaceSha256!==metadataDigestForInternalSources(entry))fail('original parsed declaration changed after source capture');\n  return evidence;\n}";
const OLD_CLONE_IMPORT="import {metadataDigest,copyMetadata} from './source-links.mjs';";
const NEW_CLONE_IMPORT="import {metadataDigestForInternalSources as metadataDigest,copyMetadata} from './source-links.mjs';";
const DIGEST_MARKER="\n// Internal-source sibling: the old JSON call expression and Hash frame name remain literal.\n";
const DIGEST="\n// Internal-source sibling: the old JSON call expression and Hash frame name remain literal.\nconst internalSourcesMetadataFallback=copyMetadata;\nexport const metadataDigestForInternalSources = function metadataDigest(value) {\n  const copyMetadata=createOriginalDigestMetadataCopierForInternalSources(internalSourcesMetadataFallback,ordinal);\n  return hash(JSON.stringify(copyMetadata(value),(_,item)=>typeof item==='bigint'?{$integer:item.toString()}:item));\n};\n";
const FORK_RULES=[{"expected": "export function copyOriginalDigestMetadata(value,fallback,ordinal){", "replacement": "export function createOriginalDigestMetadataCopierForInternalSources(fallback,ordinal){"}, {"expected": " if(!pathNative||!syntaxNative)return fallback(value);", "replacement": " if(!pathNative||!syntaxNative)return fallback;\n return function copyMetadata(value){"}, {"expected": " function privateCreate(object){\n  if(object!==originalObject)return false;\n  const create=descriptor(originalObject,'create');\n  return !!(create&&hasOwn(create,'value')&&typeof create.value==='function'&&!pathIsProxy.value(create.value)&&apply(functionText,create.value,[])==='function create() { [native code] }');\n }", "replacement": " let qualifiedCreate=null;\n function privateCreate(object){\n  if(object!==originalObject)return false;\n  const create=descriptor(originalObject,'create');\n  if(!create||!hasOwn(create,'value')||typeof create.value!=='function')return false;\n  if(create.value===qualifiedCreate)return true;\n  if(pathIsProxy.value(create.value)||apply(functionText,create.value,[])!=='function create() { [native code] }')return false;\n  qualifiedCreate=create.value;return true;\n }"}, {"expected": "\n return copyMetadata(value);\n}", "replacement": "\n return copyMetadata(value);\n };\n}"}];
const fail=reason=>{throw new TypeError('Private metadata digest source proposal: '+reason);};
const hash=value=>createHash('sha256').update(value).digest('hex');
export const PRIVATE_METADATA_DIGEST_SOURCE_PATHS=Object.freeze([COMMON,LINKS,CLONE]);
function ownSources(input){
 if(!input||typeof input!=='object'||types.isProxy(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))fail('three complete own source strings required');
 const prototype=Object.getPrototypeOf(input),keys=Reflect.ownKeys(input),descriptors=Object.getOwnPropertyDescriptors(input),value=Object.create(null);let total=0;
 if(keys.length!==3||keys.some(key=>typeof key!=='string'||!PRIVATE_METADATA_DIGEST_SOURCE_PATHS.includes(key)))fail('exact three source paths required');
 for(const name of PRIVATE_METADATA_DIGEST_SOURCE_PATHS){const field=descriptors[name];if(!field||!Object.hasOwn(field,'value')||!field.enumerable||typeof field.value!=='string'||field.value.length>524288)fail('bounded own primitive source required');total+=field.value.length;value[name]=field.value;}
 if(total>1048576)fail('whole source budget');
 return {value,verify(){if(Object.getPrototypeOf(input)!==prototype)fail('source record changed');const current=Reflect.ownKeys(input);if(current.length!==keys.length||current.some((key,index)=>key!==keys[index]))fail('source keys changed');for(const key of keys){const a=descriptors[key],b=Object.getOwnPropertyDescriptor(input,key);if(!b||!Object.hasOwn(b,'value')||a.value!==b.value||a.enumerable!==b.enumerable||a.writable!==b.writable||a.configurable!==b.configurable)fail('source fields changed');}}};
}
function exact(source,expected,replacement,id){
 // exactSubstitutionRule uses String.replace replacement syntax; escape its
 // dollar tokens so the declared full literal remains byte-for-byte literal.
 return exactSubstitutionRule(id,expected,replacement.split('$').join('$$'),'source anchor differs: '+id).apply(source);
}
function fork(source){
 if(source.split(HEADER).length!==2||source.includes(MARKER)||!source.endsWith('\n return copyMetadata(value);\n}\n'))fail('complete terminal 645 kernel required');
 const kernel=source.slice(source.indexOf(HEADER));let derived=kernel;
 for(const [index,rule]of FORK_RULES.entries())derived=exact(derived,rule.expected,rule.replacement,'kernel-'+index);
 let inverse=derived;for(const [index,rule]of [...FORK_RULES].reverse().entries())inverse=exact(inverse,rule.replacement,rule.expected,'kernel-inverse-'+index);
 if(inverse!==kernel)fail('complete kernel inverse');
 return {source:source+MARKER+derived,kernel,derived,rules:FORK_RULES};
}
function language(name,source){
 if(name===COMMON)return fork(source).source;
 if(name===LINKS){if(source.includes(DIGEST_MARKER)||source.split(OLD_READER).length!==2)fail('unchanged private reader required');return exact(source,OLD_IMPORT,NEW_IMPORT,'internal-factory-import')+DIGEST;}
 if(source.split(OLD_CLONE_IMPORT).length!==2||[...source.matchAll(/\bmetadataDigest\(/gu)].length!==23)fail('unchanged Clone import and 23 syntax callsites required');return source;
}
function repository(name,source){
 if(name===LINKS)return exact(source,OLD_READER,NEW_READER,'private-linked-reader');
 if(name===CLONE)return exact(source,OLD_CLONE_IMPORT,NEW_CLONE_IMPORT,'private-clone-digest-binding');return source;
}
function stage(source,after,phase,id){
 const first=transportConcreteSyntaxSource(source,{language:'JavaScript'}),beforeMeta=serializeConcreteSyntaxMeta(first.document),before=transportConcreteSyntaxMeta(beforeMeta);
 if(before.source!==source)fail('complete input CST inverse');
 const edits=source===after?[]:[{span:[0,source.length],expected:source,replacement:after}],sequences={languageRules:phase==='language'?[{id,edits}]:[],repositoryRules:phase==='repository'?[{id,edits}]:[]};
 const applied=applyConcreteSyntaxSubstitutions(before.document,sequences),afterMeta=serializeConcreteSyntaxMeta(applied.value),restored=transportConcreteSyntaxMeta(afterMeta);
 if(restored.source!==after)fail('complete output CST inverse');
 const undone=applyConcreteSyntaxSubstitutions(restored.document,{languageRules:phase==='language'?[{id:id+'-inverse',edits:source===after?[]:[{span:[0,after.length],expected:after,replacement:source}]}]:[],repositoryRules:phase==='repository'?[{id:id+'-inverse',edits:source===after?[]:[{span:[0,after.length],expected:after,replacement:source}]}]:[]});
 if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(undone.value)).source!==source)fail('whole serialized CST substitution inverse');
 return {phase,id,before:{source,sha256:hash(source),meta:beforeMeta},after:{source:after,sha256:hash(after),meta:afterMeta},edits,trace:applied.trace,mapping:source===after?[{kind:'unchanged',before:[0,source.length],after:[0,after.length]}]:[{kind:'substitution',before:[0,source.length],after:[0,after.length],expected:source,replacement:after}],completeInverse:true};
}
export function proposePrivateMetadataDigestSources(input){
 const captured=ownSources(input),files=captured.value,rows=[];
 for(const name of PRIVATE_METADATA_DIGEST_SOURCE_PATHS){
  const firstId='private-digest:default-data-equation',secondId='router-translator:private-digest-binding';
  const pipeline=createRulePipeline([{phase:'language',rules:[{id:firstId,apply:source=>stage(source,language(name,source),'language',firstId)}]},{phase:'repository',rules:[{id:secondId,apply:first=>({first,second:stage(first.after.source,repository(name,first.after.source),'repository',secondId)})}]}]);
  const run=pipeline.run(files[name]),{first,second}=run.value;
  rows.push({file:name,before:first.before,intermediate:first.after,after:second.after,stages:[first,second],trace:run.trace,completeInverse:true});
 }
 captured.verify();
 return {schema:'private-metadata-digest-source-proposal-v1',rows,selectedSyntaxSites:{cloneDigestExpressions:23,linkedParsedEvidenceExpressions:1},authority:{source:false,owner:false,type:false,executable:false},semanticChecksPassed:false,installApproved:false,obligations:['Fresh complete physical/Git source and compiler-profile joins before and after proposal serialization.','Independent current CST, genuine private Clone/source-method, JavaScript and strict TypeScript validation.','Whole original derive4 and observer/source suites under unchanged native deadlines.','Explicit extra factory/copier frames: no arbitrary stack/source-introspection equivalence claim.']};
}
export function restorePrivateMetadataDigestSources(input){
 const captured=ownSources(input),files=captured.value,result=Object.create(null),common=files[COMMON],at=common.indexOf(MARKER);
 if(at<0||common.indexOf(MARKER,at+1)!==-1)fail('unique complete appended kernel required');
 result[COMMON]=common.slice(0,at);if(fork(result[COMMON]).source!==common)fail('complete derived kernel differs');
 if(!files[LINKS].endsWith(DIGEST))fail('complete appended named digest required');
 let links=files[LINKS].slice(0,-DIGEST.length);links=exact(links,NEW_IMPORT,OLD_IMPORT,'restore-factory-import');links=exact(links,NEW_READER,OLD_READER,'restore-private-reader');result[LINKS]=links;
 result[CLONE]=exact(files[CLONE],NEW_CLONE_IMPORT,OLD_CLONE_IMPORT,'restore-clone-import');captured.verify();return result;
}
