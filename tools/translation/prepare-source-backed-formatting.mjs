// Copy complete original producer functions; copied syntax grants no authority.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),FORMAT='tools/translation/migrate-core-formatting.mjs',CORPUS='tools/translation/propose-core-formatting-corpus.mjs',OUTPUT='tools/translation/source-backed-core-formatting.mjs';
const fail=message=>{throw new TypeError('Source-backed formatting preparation: '+message);};
function once(source,before,after){if(source.split(before).length!==2)fail('one complete original anchor required: '+before);return source.replace(before,()=>after);}
function native(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native syntax differs: '+path);return file;}
function statement(ts,file,name){const rows=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name||ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>ts.isIdentifier(row.name)&&row.name.text===name));if(rows.length!==1)fail('one complete original declaration required: '+name);return rows[0].getText(file);}
const rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]});
export function prepareSourceBackedFormatting({root=ROOT}={}){
 const formatter=readFileSync(resolve(root,FORMAT),'utf8'),corpus=readFileSync(resolve(root,CORPUS),'utf8'),ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const first=native(ts,FORMAT,formatter),second=native(ts,CORPUS,corpus),original=formatter+'\n'+corpus;
 const imports=[...first.statements.filter(ts.isImportDeclaration).filter(node=>['./repository-layout.mjs','node:fs','node:path','node:url'].every(path=>node.moduleSpecifier.text!==path)),...second.statements.filter(ts.isImportDeclaration).filter(node=>['./repository-layout.mjs','./project.mjs','./cfg-profile.mjs','./source-module-views.mjs','./router-core-formatting.mjs','./router-core-primitives.mjs'].includes(node.moduleSpecifier.text))].map(node=>node.getText(node.getSourceFile())).join('\n');
 const formatterNames=['hash','fail','attributeNames','attributes','sourceMap','binding','migrateCoreFormatting'],corpusNames=['samePath','inputFiles','context','proposeCoreFormattingCorpus'];
 let migrated=statement(ts,first,'migrateCoreFormatting');
 migrated=once(migrated,'export function migrateCoreFormatting(','function migrateOriginalProducerFormatting(');
 migrated=once(migrated,"rootSource='',macroUseSources={}","rootSource='',macroUseSources={},inspection");
 migrated=once(migrated,'scope=binding(source,rootSource,macroSources)','scope=binding(inspection.source,inspection.rootSource,sourceMap(inspection.macroUseSources))');
 let proposed=statement(ts,second,'proposeCoreFormattingCorpus');
 proposed=once(proposed,'proposeCoreFormattingCorpus','proposeOriginalProducerFormattingCorpus');
 proposed=once(proposed,'compilationProfile=PRODUCTION_PROFILE}={})','compilationProfile=PRODUCTION_PROFILE,dependencyInputs}={})');
 proposed=once(proposed,'compilationProfile}),rows=[];','compilationProfile}),rows=[],inspection=createSourceBackedFormattingInspection(graph,dependencyInputs);');
 proposed=once(proposed,'proposal=migrateCoreFormatting(original[path],{rootSource:scope.rootSource,macroUseSources:scope.macroUseSources})','proposal=migrateOriginalProducerFormatting(original[path],{rootSource:scope.rootSource,macroUseSources:scope.macroUseSources,inspection:inspection.forModule(path,scope)})');
 proposed=once(proposed,"schema:'router-owned-formatting-corpus-proposal-v1'","schema:'router-owned-source-backed-formatting-corpus-proposal-v1',...inspection.finish()");
 const declarations=formatterNames.map(name=>name==='migrateCoreFormatting'?migrated:statement(ts,first,name)).concat(corpusNames.map(name=>name==='proposeCoreFormattingCorpus'?proposed:statement(ts,second,name))).join('\n');
 const language='// Generated complete original formatting producers; prepare-source-backed-formatting.mjs owns this file.\n'+imports+"\nimport {createSourceBackedFormattingInspection} from './source-backed-formatting-support.mjs';\n"+declarations+'\n',after=once(language,'export function proposeOriginalProducerFormattingCorpus(','export function proposeSourceBackedCoreFormattingCorpus(');
 native(ts,OUTPUT,language);native(ts,OUTPUT,after);
 const before=transportConcreteSyntaxSource(original,{language:'JavaScript'}),run=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[rule(original,language,'javascript:copy-whole-original-formatting-producers-with-private-inspection')],repositoryRules:[rule(language,after,'router:name-source-backed-formatting-corpus-source-proposal')]}),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);if(last.source!==after)fail('complete generated CST differs');
 const inverse=applyConcreteSyntaxSubstitutions(last.document,{languageRules:[rule(after,original,'javascript:restore-complete-original-formatting-producer-sources')],repositoryRules:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==original)fail('complete original source inverse differs');
 let current=null;try{current=readFileSync(resolve(root,OUTPUT),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 return {schema:'source-backed-formatting-source-preparation-v1',typescriptVersion:ts.version,inputs:[{path:FORMAT,source:formatter,selectedDeclarations:formatterNames},{path:CORPUS,source:corpus,selectedDeclarations:corpusNames}],files:[{path:OUTPUT,current,original,language,after,beforeMeta:before.meta,afterMeta,inverse:original,trace:run.trace}],originalPublicAPIsUnchanged:true,semanticAuthority:false,executableAdmission:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check','--write'].includes(args[0]))fail('usage: prepare-source-backed-formatting.mjs --emit|--check|--write');const plan=prepareSourceBackedFormatting();
 if(args[0]==='--emit')console.log(JSON.stringify(plan));else if(args[0]==='--write'){for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);console.log('Prepared complete original source-backed formatting producers.');}else{if(plan.files.some(row=>row.current!==row.after))fail('generated source-backed formatting producer is stale');console.log('Source-backed formatting producer is current.');}
}
