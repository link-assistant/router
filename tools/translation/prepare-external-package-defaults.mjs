// Copy the actual complete positive-feature producer into a package-only DATA
// entry. No caller, unit role, compilation configuration or owner is invented.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from './literal-substitution-rule.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const path='tools/translation/external-dependency-defaults.mjs',url=new URL('./external-dependency-defaults.mjs',import.meta.url);
const marker='\n// Package-only positive source DATA; the original caller-bound producers stay exact.\n';
const fail=message=>{throw new TypeError('External package default source proposal: '+message);};
const hash=source=>createHash('sha256').update(source).digest('hex');
function concrete(source){const wire=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document);if(transportConcreteSyntaxMeta(wire).source!==source)fail('whole source CST differs');return wire;}
export function prepareExternalPackageDefaultSources(source){
 if(typeof source!=='string'||Buffer.byteLength(source)>524288)fail('bounded complete primitive source required');
 const at=source.indexOf(marker);if(at>=0&&source.indexOf(marker,at+1)>=0)fail('duplicate copied producer marker');const original=at<0?source:source.slice(0,at),ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const file=ts.createSourceFile(path,original,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete original grammar failed');
 const nodes=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='facts');if(nodes.length!==1)fail('one complete actual facts producer required');const node=nodes[0],kernel=node.getText(file);
 const returns=node.body.statements.filter(statement=>ts.isReturnStatement(statement));if(returns.length!==1||!ts.isCallExpression(returns[0].expression)||returns[0].expression.arguments.length!==1||!ts.isObjectLiteralExpression(returns[0].expression.arguments[0]))fail('actual complete frozen facts result required');
 const fields=returns[0].expression.arguments[0].properties,project=fields.filter(property=>ts.isPropertyAssignment(property)&&property.name.getText(file)==='project');if(project.length!==1)fail('one actual caller-only metadata field required');const projectField=project[0].getText(file)+',';
 const state=`  originalRegistry();const originals=deriveDependencyOriginalInputs(dependencies),originalPackage=originalExternalTraitPackageInputs(packageToken);
  const matches=registry.packages.filter(row=>row.name===originalPackage.dependency.package&&row.version===originalPackage.dependency.version&&row.archiveSha256===originalPackage.dependency.archiveSha256);
  if(matches.length!==1||originalPackage.dependency.manifestSha256!==hash(originals.manifest)||originalPackage.dependency.lockSha256!==hash(originals.lock))fail('complete genuine package/project association required');
  const state={dependencies,packageToken,originals,originalPackage,selected:matches[0]},selected=sourceFeatures(state);`;
 const language=[['language:copy-complete-actual-source-facts','function facts(state){','export function originalExternalPackageDefaultSourceData(dependencies,packageToken){'],['language:genuine-package-inputs-without-caller','  const selected=sourceFeatures(state);',state]];
 const repository=[['repository:package-only-schema',"schema:'private-original-positive-external-defaults-v1'","schema:'original-package-positive-default-source-data-v1'"],['repository:explicit-positive-source-domain',"profile:'explicit registered ordinary direct default dependency; no command-line dependency-feature overrides'","profile:'complete registered ordinary direct dependency defaults; positive source membership only'"],['repository:remove-caller-field-only',projectField,'/* No project module or compilation unit is asserted by this DATA API. */']];
 const make=rows=>rows.map(([id,before,after])=>exactLiteralSubstitutionRule(id,before,after,'complete actual source equation differs: '+id)),result=createRulePipeline([{phase:'language',rules:make(language)},{phase:'repository',rules:make(repository)}]).run(kernel),copied=result.value;
 let inverse=copied;for(const [,before,after]of [...language,...repository].reverse()){if(inverse.split(after).length!==2)fail('ambiguous complete copied-source inverse');inverse=inverse.replace(after,()=>before);}if(inverse!==kernel)fail('complete actual producer inverse differs');
 const text=original+marker+copied+'\n';if(at>=0&&source!==text)fail('installed copied producer is stale');const parsed=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(parsed.parseDiagnostics.length)fail('complete copied module grammar failed');
 return {path,source:original,text,sourceSha256:hash(original),sha256:hash(text),beforeMeta:concrete(original),afterMeta:concrete(text),kernel:{span:[node.getStart(file),node.end],source:kernel,meta:concrete(kernel)},copied:{source:copied,meta:concrete(copied),inverse,language,repository,trace:result.trace},inverse:original,authority:{namespace:false,unit:false,test:false,runtime:false},semanticChecksPassed:false};
}
function main(){const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))fail('use --emit or --check');const source=readFileSync(url,'utf8'),proposal=prepareExternalPackageDefaultSources(source);if(args[0]==='--check'){if(source!==proposal.text)fail('copied producer is not installed');console.log(JSON.stringify({fresh:true,path,sha256:proposal.sha256,compilerAuthority:false}));}else console.log(JSON.stringify(proposal));}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main();
