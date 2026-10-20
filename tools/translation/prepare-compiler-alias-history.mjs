// Receiving source-comparison DATA only. No source or executable authority.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const FIXTURE='tools/translation/test/fixtures/compiler-data-alias-history.mjs';
const FILES=['private-walk-scalar-results','builtin-json-equality-hint','completed-json-eligibility','private-frozen-json-measurement','packed-frozen-json-eligibility','private-frozen-json-cache-policy','private-frozen-json-owner-memo','private-frozen-json-cohorts','native-descriptor-guard-batching','builtin-proof-json-composition','native-descriptor-kind-discriminator','private-frozen-json-subtrees','native-string-quotation','builtin-plan-json-composition','immutable-json-continuations','private-primitive-native-quotation','derive-bang-carrier-json','private-frozen-json'];
const sha=text=>createHash('sha256').update(text).digest('hex');
const fail=message=>{throw new TypeError('Compiler alias receiving history: '+message);};
function whole(path,before,after){
 const ts=ownershipCompiler();for(const text of [before,after])if(ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)fail('complete native grammar');
 const first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),sequence={languageRules:[{id:'javascript:complete-native-source-comparison-binding',edits:[]}],repositoryRules:[{id:'receiving:whole-alias-history-source-and-inverse',edits:[{span:[0,before.length],expected:before,replacement:after}]}]},run=applyConcreteSyntaxSubstitutions(first.document,sequence),beforeMeta=serializeConcreteSyntaxMeta(first.document),afterMeta=serializeConcreteSyntaxMeta(run.value);
 if(transportConcreteSyntaxMeta(afterMeta).source!==after)fail('reparsed complete source');
 const inverse=applyConcreteSyntaxSubstitutions(run.value,{languageRules:[],repositoryRules:[{id:'receiving:restore-complete-original',edits:[{span:[0,after.length],expected:after,replacement:before}]}]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==before)fail('whole inverse');
 return {path,before,after,beforeMeta,afterMeta,sequence,trace:run.trace,inverse:before,sourceSha256:sha(before),sha256:sha(after)};
}
function historyRows(root){
 const paths=['private-frozen-json.mjs','derive-bang-context.mjs','derive-enclosing-namespace-context.mjs','builtin-derive-bang-footprints.mjs'],rows=[];
 for(const name of paths){
  const path='tools/translation/'+name,source=readFileSync(resolve(root,path),'utf8');let before=source,edits=[];
  if(name==='private-frozen-json.mjs'){
   const marker='\n// Optional JSON equality only; source, owner and body checks remain mandatory.\n',at=source.indexOf(marker);if(at<0||source.indexOf(marker,at+1)!==-1)fail('unique actual alias append required');
   const suffix=source.slice(at),ts=ownershipCompiler(),file=ts.createSourceFile(path,suffix,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),functions=file.statements.filter(ts.isFunctionDeclaration);
   if(file.parseDiagnostics.length||functions.length!==2||functions[0].name?.text!=='privateFrozenJsonOwnFieldsAliasHint'||functions[1].name?.text!=='sameImmutableArrayCells'||file.statements.length!==2)fail('actual complete alias-only declarations required');
   edits=[{expected:suffix,replacement:''}];before=source.slice(0,at);
  }else if(name==='builtin-derive-bang-footprints.mjs'){
   const imported="import {createPrivateFrozenJsonCache,privateFrozenJsonEqualHint} from './private-frozen-json.mjs';\nimport {createScopedPrivateNativeProofJsonSerializer as createPrivateFrozenJsonComposer} from './private-native-proof-json.mjs';",original="import {createPrivateFrozenJsonCache,createPrivateFrozenJsonComposer} from './private-frozen-json.mjs';",hint='privateFrozenJsonEqualHint(fresh,proof)!==true&&';edits=[{expected:imported,replacement:original},{expected:hint,replacement:''}];for(const edit of edits){if(before.split(edit.expected).length!==2)fail('unique original builtin plan equality evolution');before=before.replace(edit.expected,()=>edit.replacement);}
  }else{
   const imported="import {createPrivateFrozenJsonCache,privateFrozenJsonOwnFieldsAliasHint} from './private-frozen-json.mjs';",original="import {createPrivateFrozenJsonCache} from './private-frozen-json.mjs';",call="  if(privateFrozenJsonOwnFieldsAliasHint(module,original,['items','allItems'])===true)return;\n";
   edits=[{expected:call,replacement:''},{expected:imported,replacement:original}];for(const edit of edits){if(before.split(edit.expected).length!==2)fail('unique actual consumer alias equation');before=before.replace(edit.expected,()=>edit.replacement);}
  }
  let inverse=before;for(const edit of [...edits].reverse())if(edit.replacement){if(inverse.split(edit.replacement).length!==2)fail('inverse import uniqueness');inverse=inverse.replace(edit.replacement,()=>edit.expected);}else if(name==='private-frozen-json.mjs')inverse+=edit.expected;else if(name==='builtin-derive-bang-footprints.mjs'){const anchor="if(composeJson(fresh)!==(proof.schema==='builtin-debug-data-bang-output-v1'?composeJson(proof):originalJson(proof)))";if(inverse.split(anchor).length!==2)fail('inverse builtin plan uniqueness');inverse=inverse.replace(anchor,()=>anchor.replace('if(','if('+edit.expected));}else{const anchor='function validateItemCarrier(module,original){\n';if(inverse.split(anchor).length!==2)fail('inverse function uniqueness');inverse=inverse.replace(anchor,()=>anchor+edit.expected);}
  if(inverse!==source)fail('complete actual production inverse');rows.push({name,path,currentSha256:sha(source),historicalSha256:sha(before),edits,completeCurrent:source,completeHistorical:before});
 }
 return rows;
}
function renderFixture(rows){
 const records=rows.map(({name,path,currentSha256,historicalSha256,edits})=>({name,path,currentSha256,historicalSha256,edits}));
 return `// Generated by prepare-compiler-alias-history.mjs. Historical comparison DATA only.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../../concrete-syntax-meta.mjs';
const RECORDS=${JSON.stringify(records)};
const hash=text=>createHash('sha256').update(text).digest('hex');
const fail=message=>{throw new TypeError('Compiler alias source history: '+message);};
export function restoreCompilerDataAliasHistory(source,name,retain=()=>{}){
 const matches=RECORDS.filter(row=>row.name===name);if(typeof source!=='string'||matches.length!==1)fail('complete registered source required');const row=matches[0];if(hash(source)!==row.currentSha256)fail('complete actual current source changed');let historical=source;
 for(const edit of row.edits){if(historical.split(edit.expected).length!==2)fail('actual whole substitution is absent or ambiguous');historical=historical.replace(edit.expected,()=>edit.replacement);}
 if(hash(historical)!==row.historicalSha256)fail('complete historical source differs');
 const first=transportConcreteSyntaxSource(source,{language:'JavaScript'}),run=applyConcreteSyntaxSubstitutions(first.document,{languageRules:[{id:'javascript:retain-all-original-comparison-bodies',edits:[]}],repositoryRules:[{id:'receiving:restore-complete-pre-alias-comparison-DATA',edits:[{span:[0,source.length],expected:source,replacement:historical}]}]}),afterMeta=serializeConcreteSyntaxMeta(run.value);if(transportConcreteSyntaxMeta(afterMeta).source!==historical)fail('complete source reparse differs');
 const reverse=applyConcreteSyntaxSubstitutions(run.value,{languageRules:[],repositoryRules:[{id:'receiving:replay-complete-actual-source',edits:[{span:[0,historical.length],expected:historical,replacement:source}]}]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(reverse.value)).source!==source)fail('whole current inverse differs');
 retain('complete-actual-and-historical-alias-source',{source,historical,row,beforeMeta:serializeConcreteSyntaxMeta(first.document),afterMeta,trace:run.trace,inverse:source,compilerAuthority:false});return historical;
}
// Invoke the native filesystem read first, with its original complete arguments.
// Only these four exact physical compiler inputs have historical DATA views.
export function readCompilerAliasHistory(...args){
 const source=readFileSync(...args);if(typeof source!=='string')return source;const input=args[0];let path;if(input instanceof URL)path=fileURLToPath(input);else if(typeof input==='string')path=resolve(input);else return source;
 const rows=RECORDS.filter(row=>row.name!=='builtin-derive-bang-footprints.mjs'&&path===fileURLToPath(new URL('../../'+row.name,import.meta.url)));return rows.length?restoreCompilerDataAliasHistory(source,rows[0].name):source;
}
// The earlier frozen-plan suite retains its independently pinned pre-hint
// comparison. Other historical suites still exercise the later equality hint.
export function readOriginalBuiltinPlanHistory(...args){
 const source=readCompilerAliasHistory(...args);if(typeof source!=='string')return source;const input=args[0],path=input instanceof URL?fileURLToPath(input):typeof input==='string'?resolve(input):null;
 return path===fileURLToPath(new URL('../../builtin-derive-bang-footprints.mjs',import.meta.url))?restoreCompilerDataAliasHistory(source,'builtin-derive-bang-footprints.mjs'):source;
}
`;
}
export function prepareCompilerAliasHistory({root=fileURLToPath(new URL('../../',import.meta.url))}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');const records=historyRows(root),fixture=renderFixture(records),files=[whole(FIXTURE,(()=>{try{return readFileSync(resolve(root,FIXTURE),'utf8');}catch(e){if(e.code==='ENOENT')return '';throw e;}})(),fixture)];
 for(const name of FILES){
  const path='tools/translation/test/'+name+'.test.mjs',source=readFileSync(resolve(root,path),'utf8'),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete test grammar');
  const existing=file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./fixtures/compiler-data-alias-history.mjs');
  if(existing.length){if(existing.length!==1)fail('unique actual historical reader import');if(name==='private-frozen-json'){const node=existing[0],replacement="import {readOriginalBuiltinPlanHistory as readFileSync} from './fixtures/compiler-data-alias-history.mjs';",after=source.slice(0,node.getStart(file))+replacement+source.slice(node.end);if(after!==source)files.push(whole(path,source,after));}continue;}
  const selected=file.statements.filter(node=>ts.isImportDeclaration(node)&&['node:fs','fs'].includes(node.moduleSpecifier.text)&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(el=>!el.propertyName&&el.name.text==='readFileSync'));
  if(selected.length!==1)fail('unique original native reader binding required: '+path);const node=selected[0],clause=node.importClause,rest=clause.namedBindings.elements.filter(el=>el.name.text!=='readFileSync').map(el=>el.getText(file));
  const reader=name==='private-frozen-json'?'readOriginalBuiltinPlanHistory':'readCompilerAliasHistory',replacement='import '+(clause.name?clause.name.text+(rest.length?',':''):'')+(rest.length?'{'+rest.join(',')+'}':'')+' from '+node.moduleSpecifier.getText(file)+';\nimport {'+reader+' as readFileSync} from \'./fixtures/compiler-data-alias-history.mjs\';';
  if(!clause.name&&!rest.length)fail('retained native import members required');const after=source.slice(0,node.getStart(file))+replacement+source.slice(node.end);files.push(whole(path,source,after));
 }
 return {schema:'complete-compiler-alias-history-reader-proposal-v1',files,records,sourceAuthority:false,runtimeAuthority:false,originalCaseNamesBodiesAndDeadlinesUnchanged:true,sourceInstalled:false,rustExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))fail('Usage: prepare-compiler-alias-history.mjs --emit|--check');const result=prepareCompilerAliasHistory();if(args[0]==='--check'){if(result.files.some(row=>row.before!==row.after))fail('complete historical readers are stale');console.log('Complete alias receiving source histories are current; no compiler authority.');}else console.log(JSON.stringify(result));
}
