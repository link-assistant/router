// Actual source preparation; detached packet DATA never issues compiler authority.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PATH='tools/translation/migrate-core-literal-text.mjs',TEMPLATE='tools/translation/migrate-core-json-readers.mjs',MARKER='\n// Generated detached literal-text packet DATA; original materialized API unchanged.\n';
const fail=message=>{throw new TypeError('Literal packet source preparation: '+message);};
function once(source,before,after){if(source.split(before).length!==2)fail('unique complete source anchor required');return source.replace(before,()=>after);}
function native(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;}
function named(ts,file,name){const rows=file.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);if(rows.length!==1)fail('one complete original function required: '+name);return rows[0];}
function variable(ts,statements,name){const rows=statements.filter(ts.isVariableStatement).filter(n=>n.declarationList.declarations.some(d=>ts.isIdentifier(d.name)&&d.name.text===name));if(rows.length!==1)fail('one original variable required: '+name);return rows[0];}
const rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]});
export function prepareLiteralTextPacketStream({root=ROOT}={}){
 const before=readFileSync(resolve(root,PATH),'utf8'),original=before.includes(MARKER)?before.slice(0,before.indexOf(MARKER)):before,template=readFileSync(resolve(root,TEMPLATE),'utf8'),ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const file=native(ts,PATH,original),other=native(ts,TEMPLATE,template),fn=named(ts,file,'proposeCoreLiteralTextCorpus'),json=named(ts,other,'iterateCoreJsonReadersCorpusPackets'),loops=fn.body.statements.filter(ts.isForOfStatement);if(loops.length!==1)fail('one complete original file loop required');const loop=loops[0],start=fn.getStart(file),text=fn.getText(file),body=loop.statement;
 let prefix=text.slice(0,loop.getStart(file)-start),tail=text.slice(loop.end-start,fn.body.end-1-start),encoded=body.getText(file).slice(1,-1);
 prefix=once(prefix,'proposeCoreLiteralTextCorpus','iterateOwnedLiteralTextCorpusPacketData');
 prefix=once(prefix,"  const {entry='src/lib.rs'", "  const optionSnapshot=literalStreamRecord(options,['entry','files','compilationProfile','dependencyInputs'],4,'options');\n  const {entry='src/lib.rs'");
 prefix=once(prefix,'}=options,dependencyField=', '}=optionSnapshot.value,dependencyField=');
 prefix=once(prefix,'  const files=sourceMap(input),profile=',"  const inputSnapshot=literalStreamRecord(input,null,MAX_FILES,'files'),dependencySnapshot=dependencyInputs===undefined?null:literalStreamRecord(dependencyInputs,['manifest','lock'],2,'dependency inputs');\n  const files=sourceMap(inputSnapshot.value),profile=");
 encoded=once(encoded,'continue;','return null;');
 encoded=once(encoded,'proposals.push({file,module:origin.path,...result});after[file]=result.after.source;',String.raw`return {text:JSON.stringify({file,module:origin.path,...result})+'\n',source:result.after.source,selections:result.selections.length,edits:result.edits.length,changed:files[file]!==result.after.source};`);
 const packet=variable(ts,json.body.statements,'packet').getText(other),packets=json.body.statements.filter(ts.isFunctionDeclaration).filter(n=>n.name?.text==='packets');if(packets.length!==1)fail('one original packet generator required');
 const boundary=packets[0].body.statements.findIndex(n=>ts.isExpressionStatement(n)&&ts.isBinaryExpression(n.expression)&&ts.isIdentifier(n.expression.left)&&n.expression.left.text==='roleFor');if(boundary<1)fail('complete original graph prefix required');const graphPrefix=packets[0].body.statements.slice(0,boundary).map(n=>n.getText(other)).join('\n');
 tail=once(tail,'  return result;',String.raw`
  for(let at=0;at<result.inputs.length;at++)yield packet('inputs',at,result.inputs[at]);
  for(const [at,[path,source]]of Object.entries(after).entries())yield packet('after',at,{path,source});
  const keys=Object.keys(result),excluded=new Set(['before','after','inputs','moduleGraph','proposals']),values={};for(const key of keys)if(!excluded.has(key))values[key]=result[key];
  yield packet('metadata',0,{keys,values});verifyStreamInputs();finished=true;summary.skippedFiles=skipped.length;
  return {after,summary,counts:{modules:graph.modules.length,concreteSyntaxMeta:graph.concreteSyntaxMeta.length}};
`);
 const same=once(variable(ts,other.statements,'same').getText(other),'const same=','const literalStreamSame='),record=once(named(ts,other,'record').getText(other),'function record(','function literalStreamRecord(').replaceAll('!same(','!literalStreamSame(');
 const generated=same+'\n'+record+'\n'+prefix+String.raw`
  const summary={sourceFiles:Object.keys(files).length,proposals:0,selections:0,edits:0,changedFiles:0,skippedFiles:0};let finished=false;
  `+packet+String.raw`
  function verifyStreamInputs(){verifyLiteralTextImportRoles(roleFor);dependencySnapshot?.verify();inputSnapshot.verify();optionSnapshot.verify();}
  function encodedFile(file){`+encoded+String.raw`}
  function* packets(){
  `+graphPrefix+String.raw`
  for(const file of Object.keys(files)){
   const encoded=encodedFile(file);if(!encoded)continue;after[file]=encoded.source;summary.selections+=encoded.selections;summary.edits+=encoded.edits;if(encoded.changed)summary.changedFiles++;
   yield {section:'proposals',ordinal:summary.proposals++,text:encoded.text};
  }
  `+tail+String.raw`
  }
  const iterator=packets();return {next:()=>iterator.next(),return:()=>iterator.return(),verify(){if(!finished)fail('unfinished literal packet stream');verifyStreamInputs();}};
}
`;
 const language=original+MARKER+generated,previousAfter=once(language,'export function iterateOwnedLiteralTextCorpusPacketData(','export function iterateCoreLiteralTextCorpusPackets('),after=original+previousAfter.slice(original.length).replace(/^[ \t]+$/gm,'');native(ts,PATH,language);native(ts,PATH,after);if(before!==original&&before!==after&&before!==previousAfter)fail('unexpected complete installed source');
 const beforeMeta=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(original,{language:'JavaScript'}).document),first=transportConcreteSyntaxMeta(beforeMeta);if(first.source!==original)fail('whole original CST differs');const sequence={languageRules:[rule(original,language,'javascript:copy-complete-original-literal-producer-into-detached-packet-lifetimes')],repositoryRules:[rule(language,after,'router:name-explicit-owned-literal-packet-data-api-and-normalize-generated-trivia')]},run=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);if(last.source!==after)fail('whole proposed CST differs');const inverse=applyConcreteSyntaxSubstitutions(last.document,{languageRules:[rule(after,original,'javascript:restore-complete-original-materialized-literal-producer')],repositoryRules:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==original)fail('whole source inverse differs');
 return {schema:'literal-text-detached-packet-source-v1',files:[{path:PATH,before,original,language,after,beforeMeta,afterMeta,sequence,trace:run.trace,inverse:original}],templateInputs:[{path:TEMPLATE,source:template,selectedFunctions:['record','iterateCoreJsonReadersCorpusPackets']}],allOriginalMaterializedFunctionsUnchanged:true,newAcrossInvocationCache:false,sourceAuthority:false,runtimeAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))fail('Usage: prepare-literal-text-packet-stream.mjs --emit|--check');const plan=prepareLiteralTextPacketStream();if(args[0]==='--check'){if(plan.files.some(row=>row.before!==row.after))fail('complete installed source is stale');console.log('Literal packet source is current; no compiler authority.');}else console.log(JSON.stringify(plan));}
