// Source proposal only. A module declaration candidate grants no dispatch or
// executable authority; each adopted body still needs the independent checker.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PATH='tools/translation/literal-text-import-roles.mjs',MARKER='\n// Generated direct standard module declaration candidates; no namespace authority.\n';
const PLAIN='standardRole(leaf.segments)??external?.(leaf.segments)',ADAPTED='standardRole(leaf.segments)??standardRootModuleRole(leaf.segments)??external?.(leaf.segments)';
const APPEND=`
function standardRootModuleRole(segments){
 if(segments.length!==2||!['std','core'].includes(segments[0]))return null;
 const owner=segments[0],root=owner==='std'?stdRoot:coreRoot;
 // Inspect the complete pinned original root each time. No caller table,
 // spelling allowlist, cross-invocation census or imported trait is inferred.
 const candidate=originalPublicModuleCandidate(root.source,segments[1]);
 return candidate?{kind:'mod',route:[{crate:owner,sourceSha256:root.sourceSha256??root.sha256,...candidate}],namespaceComplete:false,originalDispatchProved:false,executableAdmission:false}:null;
}
`;
const fail=message=>{throw new TypeError('Standard module role preparation: '+message);};
function once(source,before,after){if(source.split(before).length!==2)fail('unique complete source anchor required');return source.replace(before,()=>after);}
export function prepareStandardModuleImportRoles({root=ROOT}={}){
 const before=readFileSync(resolve(root,PATH),'utf8');let original=before.includes(MARKER)?before.slice(0,before.indexOf(MARKER)):before;if(original.includes(ADAPTED))original=once(original,ADAPTED,PLAIN);
 const language=original+MARKER+APPEND,after=once(language,PLAIN,ADAPTED);if(before!==original&&before!==after)fail('unexpected complete current source');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');for(const source of [original,language,after]){const file=ts.createSourceFile(PATH,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');}
 const rule=(a,b,id)=>({id,edits:[{span:[0,a.length],expected:a,replacement:b}]}),beforeMeta=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(original,{language:'JavaScript'}).document),first=transportConcreteSyntaxMeta(beforeMeta);if(first.source!==original)fail('complete original CST differs');
 const sequence={languageRules:[rule(original,language,'javascript:select-original-unconditional-public-module-declarations')],repositoryRules:[rule(language,after,'router:compose-nontrait-module-candidates-for-owned-text-adoption')]},run=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);if(last.source!==after)fail('complete proposed CST differs');
 const inverse=applyConcreteSyntaxSubstitutions(last.document,{languageRules:[rule(after,original,'javascript:restore-complete-original-import-role-selector')],repositoryRules:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==original)fail('complete source inverse differs');
 return {schema:'standard-root-module-import-candidates-source-v1',files:[{path:PATH,before,original,language,after,beforeMeta,afterMeta,sequence,trace:run.trace,inverse:original}],newAcrossInvocationCaches:false,originalTimeRoleUnchanged:true,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))fail('Usage: prepare-standard-module-import-roles.mjs --emit|--check');const plan=prepareStandardModuleImportRoles();if(args[0]==='--check'){if(plan.files.some(row=>row.before!==row.after))fail('complete installed source is stale');console.log('Standard module role source is current; no executable authority.');}else console.log(JSON.stringify(plan));}
