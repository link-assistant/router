#!/usr/bin/env node
// Source proposal only. A source check cannot qualify the complete forward run.
import {readFileSync,lstatSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,relative,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {ownershipCompiler} from '../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from '../tools/translation/rule-pipeline.mjs';
import {transportConcreteSyntaxSource,serializeConcreteSyntaxMeta,transportConcreteSyntaxMeta} from '../tools/translation/concrete-syntax-meta.mjs';
const require=createRequire(new URL('./ci/package.json',import.meta.url)),yaml=require('yaml');
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw TypeError('Owned-field gate adoption: '+message);};
const oldCli='scripts/translate-router.mjs',newCli='scripts/translate-router-owned-field-meta.mjs';
const commands=['node '+oldCli+' --check','node '+oldCli+' --profile-matrix --check'];
const changed=value=>value.replace(oldCli,newCli),original=value=>value.replace(newCli,oldCli);
const targets=['.github/workflows/javascript-first.yml','scripts/check-js-first-local.mjs','scripts/check-js-first-workflows.mjs','scripts/check-router-parity.mjs','scripts/test/check-js-first-workflows.test.mjs','scripts/test/check-js-first-local.test.mjs'];
const localTest=`\n\ntest('complete canonical and profile checks select owned-field storage while owned definitions remain independent',()=>{
 const commands=stages.find(([id])=>id==='translation')[1];
 assert.deepEqual(commands,[
  'node scripts/run-node-tests.mjs --outer-timeout-ms=3600000 --test-concurrency=2 tools/translation/test/*.test.mjs tools/translation/serialization-schema/*.test.mjs',
  'node scripts/translate-router-owned-field-meta.mjs --check',
  'node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --check',
  'node scripts/translate-router-owned-field-meta.mjs --profile-matrix --check',
  'node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --profile-matrix --check',
 ]);
 assert.equal(stages.length,7);
 for(const legacy of ['node scripts/translate-router.mjs --check','node scripts/translate-router.mjs --profile-matrix --check'])assert.equal(commands.includes(legacy),false);
});\n`;
function one(rows,label){if(rows.length!==1)fail('one native '+label+' required');return rows[0];}
function native(source,path){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('TypeScript 5.9.3 required');const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar: '+path);const nodes=[];function walk(node){nodes.push(node);ts.forEachChild(node,walk);}walk(file);return {ts,file,nodes};
}
function ancestor(node,predicate){for(let parent=node.parent;parent;parent=parent.parent)if(predicate(parent))return parent;return null;}
function owned(node,parent){return ancestor(node,value=>value===parent)!==null;}
function sourceEdit(source,start,end,after,id,selection){return {id,start,end,before:source.slice(start,end),after,selection};}
function nodeEdit(syntax,node,value,id){const raw=node.getText(syntax.file),quote=raw[0];if(!['"',"'"].includes(quote)||/['"\\\r\n]/u.test(value))fail('known plain command literal required');return sourceEdit(syntax.file.text,node.getStart(syntax.file),node.end,quote+value+quote,id,{kind:syntax.ts.SyntaxKind[node.kind],start:node.getStart(syntax.file),end:node.end,value:node.text});}
function commandNodes(syntax,path){
 const {ts,nodes}=syntax,strings=nodes.filter(ts.isStringLiteral),isCommand=node=>commands.includes(original(node.text));let selected;
 if(path==='scripts/check-js-first-local.mjs'){
  const declaration=one(nodes.filter(node=>ts.isVariableDeclaration(node)&&node.name.text==='stages'),'local stages declaration');
  selected=strings.filter(node=>isCommand(node)&&owned(node,declaration));
  for(const node of selected){const row=ancestor(node,value=>ts.isArrayLiteralExpression(value)&&value.elements[0]?.text==='translation');if(!row)fail('command outside actual translation stage');}
 }else if(path==='scripts/check-js-first-workflows.mjs'){
  const declaration=one(nodes.filter(node=>ts.isVariableDeclaration(node)&&node.name.text==='required'&&ancestor(node,value=>ts.isFunctionDeclaration(value)&&value.name?.text==='auditWorkflows')),'auditor required commands');
  selected=strings.filter(node=>isCommand(node)&&owned(node,declaration));
  for(const node of selected){const property=ancestor(node,ts.isPropertyAssignment);if(!property||!['translation','profile-matrix'].includes(property.name.text))fail('command outside original mandatory stage');}
 }else if(path==='scripts/test/check-js-first-workflows.test.mjs'){
  selected=strings.filter(isCommand);for(const node of selected)if(!ancestor(node,value=>ts.isCallExpression(value)&&ts.isIdentifier(value.expression)&&value.expression.text==='test'))fail('workflow expectation outside original whole test');
 }else fail('unknown command owner');
 const counts=commands.map(command=>selected.filter(node=>original(node.text)===command).length),expected=path.endsWith('/check-js-first-workflows.test.mjs')?[2,1]:[1,1];if(JSON.stringify(counts)!==JSON.stringify(expected))fail('complete native command census differs: '+path);return selected;
}
function parityNode(syntax){
 const {ts,nodes}=syntax,call=one(nodes.filter(node=>ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='exec'&&node.arguments.length===3&&node.arguments[0].getText(syntax.file)==='process.execPath'&&ts.isArrayLiteralExpression(node.arguments[1])&&[oldCli,newCli].includes(node.arguments[1].elements[0]?.text)),'nested deterministic parity call');
 if(call.arguments[1].elements.length!==2||call.arguments[1].elements[1]?.text!=='--check'||call.arguments[2].getText(syntax.file)!=='{ cwd: root, timeout: translationTimeoutMs, maxBuffer: 4_194_304 }')fail('original complete parity argv/budget differs');return call.arguments[1].elements[0];
}
function document(source){const value=yaml.parseDocument(source,{version:'1.2',uniqueKeys:true,keepSourceTokens:true});if(value.errors.length)fail('complete native YAML grammar');return value;}
function yamlNodes(source){
 const parsed=document(source),result=[];for(const [stage,command]of [['translation',commands[0]],['profile-matrix',commands[1]]]){
  const steps=parsed.getIn(['jobs',stage,'steps'],true);if(!steps||!Array.isArray(steps.items))fail('actual YAML stage missing');const candidates=steps.items.map(step=>step.get('run',true)).filter(node=>node&&[command,changed(command)].includes(node.value)),node=one(candidates,'YAML '+stage+' run scalar');if(!node.range||source.slice(node.range[0],node.range[1])!==node.value)fail('original plain run scalar differs');result.push({node,stage,command});
 }return result;
}
function concrete(source,path){
 if(path.endsWith('.yml')){document(source);const tokens=[...new yaml.Parser().parse(source)],wire=JSON.stringify({schema:'owned-field-native-YAML-CST-v1',source,tokens}),parsed=JSON.parse(wire);if(wire.length>32*1024*1024||parsed.source!==source||parsed.tokens.map(token=>yaml.CST.stringify(token)).join('')!==source)fail('complete native YAML CST inverse');return wire;}
 native(source,path);const wire=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document);if(transportConcreteSyntaxMeta(wire).source!==source)fail('complete JS CST inverse');return wire;
}
function apply(source,path,phase,edits){
 edits.sort((a,b)=>a.start-b.start);let end=0,delta=0;for(const row of edits){if(row.start<end||source.slice(row.start,row.end)!==row.before)fail('native source span changed/overlapped');row.afterStart=row.start+delta;row.afterEnd=row.afterStart+row.after.length;delta+=row.after.length-row.before.length;end=row.end;}
 let text=source;for(const row of [...edits].reverse())text=text.slice(0,row.start)+row.after+text.slice(row.end);let inverse=text;
 const after=path.endsWith('.yml')?yamlNodes(text):native(text,path);
 for(const row of [...edits].reverse()){
  if(inverse.slice(row.afterStart,row.afterEnd)!==row.after)fail('complete native inverse bytes differ');
  if(row.id==='local:complete-selection-control'){const statements=after.nodes.filter(node=>after.ts.isExpressionStatement(node)&&node.getStart(after.file)===row.afterStart+2&&node.end===row.afterEnd-1);if(!text.endsWith(localTest)||statements.length!==1)fail('whole native appended test differs');}
  else if(path.endsWith('.yml')){if(!after.some(({node})=>node.range[0]===row.afterStart&&node.range[1]===row.afterEnd&&node.value===row.after))fail('independent native YAML inverse differs');}
  else if(!after.nodes.some(node=>node.getStart(after.file)===row.afterStart&&node.end===row.afterEnd&&node.getText(after.file)===row.after))fail('independent native JS inverse differs');
  inverse=inverse.slice(0,row.afterStart)+row.before+inverse.slice(row.afterEnd);
 }if(inverse!==source)fail('complete phase inverse differs');return {phase,source,text,edits,inverse,beforeMeta:concrete(source,path),afterMeta:concrete(text,path)};
}
function selections(source,path,toCurrent){
 if(path.endsWith('.yml'))return yamlNodes(source).map(({node,stage,command})=>sourceEdit(source,node.range[0],node.range[1],toCurrent?changed(command):command,'gate:'+stage,{stage,start:node.range[0],end:node.range[1],value:node.value}));
 const syntax=native(source,path);if(path==='scripts/check-router-parity.mjs')return [nodeEdit(syntax,parityNode(syntax),toCurrent?newCli:oldCli,'parity:complete-deterministic-argv')];
 if(path==='scripts/test/check-js-first-local.test.mjs')return toCurrent?[sourceEdit(source,source.length,source.length,localTest,'local:complete-selection-control',{nativeAppendOffset:source.length})]:[];
 return commandNodes(syntax,path).map(node=>nodeEdit(syntax,node,toCurrent?changed(original(node.text)):original(node.text),'commands:complete-'+original(node.text)));
}
function baseline(current,path){
 if(path==='scripts/test/check-js-first-local.test.mjs'){
  const syntax=native(current,path),tests=syntax.nodes.filter(node=>syntax.ts.isCallExpression(node)&&node.expression.getText(syntax.file)==='test'&&node.arguments[0]?.text==='complete canonical and profile checks select owned-field storage while owned definitions remain independent');if(tests.length>1||tests.length&&!current.endsWith(localTest))fail('known local test composition differs');return tests.length?current.slice(0,-localTest.length):current;
 }
 const edits=selections(current,path,false);let source=current;for(const row of [...edits].reverse())source=source.slice(0,row.start)+row.after+source.slice(row.end);return source;
}
function derive(current,path){
 const source=baseline(current,path),stages=[],phaseFor=path==='scripts/check-js-first-workflows.mjs'||path.includes('/test/')?'repository':'language';
 const result=createRulePipeline(['language','repository'].map(phase=>({phase,rules:[{id:'owned-field-gate:'+phase,apply:value=>{const stage=apply(value,path,phase,phase===phaseFor?selections(value,path,true):[]);stages.push(stage);return stage.text;}}]}))).run(source);
 let inverse=result.value;for(const stage of [...stages].reverse()){if(inverse!==stage.text)fail('whole inverse stage differs');inverse=stage.inverse;}if(inverse!==source||current!==source&&current!==result.value)fail('physical source is not exact complete before/after equation');
 return {path,current,source,text:result.value,sourceSha256:hash(source),sha256:hash(result.value),currentSha256:hash(current),stages,trace:result.trace,inverse,semanticAuthority:false};
}
const protectedPaths=['scripts/translate-router.mjs','tools/translation/bulk.mjs','tools/translation/retained-bulk.mjs','tools/translation/matrix-bulk.mjs','tools/translation/retained-matrix-bulk.mjs','scripts/parity-check-budgets.mjs','scripts/sync-router.mjs'];
const candidatePaths=['scripts/translate-router-owned-field-meta.mjs',...['owned-field-bulk.mjs','retained-owned-field-bulk.mjs','owned-field-matrix-bulk.mjs','retained-owned-field-matrix-bulk.mjs','isolated-owned-field-matrix-bulk.mjs','isolated-retained-owned-field-matrix-bulk.mjs','owned-field-isolated-matrix-session.mjs','owned-field-isolated-matrix-profile.mjs','prepare-owned-field-bulk.mjs'].map(name=>'tools/translation/'+name)];
export function prepareOwnedFieldGateAdoption({root=resolve(dirname(fileURLToPath(import.meta.url)),'..')}={}){
 root=resolve(root);const inputs=[],read=path=>{const physical=resolve(root,path),stat=lstatSync(physical);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1048576)fail('ordinary complete bounded source required');const bytes=readFileSync(physical),source=bytes.toString('utf8');if(!Buffer.from(source).equals(bytes))fail('source UTF8 differs');inputs.push({path,source,bytes:bytes.length,sha256:hash(bytes)});return source;};
 const files=targets.map(path=>derive(read(path),path));for(const path of [...protectedPaths,...candidatePaths,'scripts/prepare-owned-field-gate-adoption.mjs'])read(path);
 const workflowDirectory=resolve(root,'.github/workflows'),callerPaths=require('node:fs').readdirSync(workflowDirectory).filter(name=>/\.ya?ml$/u.test(name)&&name!=='javascript-first.yml').sort().map(name=>'.github/workflows/'+name);for(const path of callerPaths)read(path);
 assertOwnedFieldGateInputsFresh({root,inputs});return {schema:'owned-field-gate-adoption-source-proposal-v1',root,files,inputs,protectedPaths,callerPaths,originalCliUnchanged:true,ownedDefinitionsUnchanged:true,budgetsUnchanged:true,fullForwardQualified:false,installed:false,sourceAuthority:false,fixedNineDraftPolicyRequired:false};
}
export function assertOwnedFieldGateInputsFresh({root,inputs}){for(const row of inputs){const path=resolve(root,row.path),stat=lstatSync(path),bytes=readFileSync(path);if(!stat.isFile()||stat.isSymbolicLink()||bytes.length!==row.bytes||hash(bytes)!==row.sha256||bytes.toString('utf8')!==row.source)fail('complete physical input changed: '+row.path);}return true;}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(!(args.length===1&&args[0]==='--check'||args.length===2&&args[0]==='--emit'))fail('Use --check | --emit FRESH_OUTSIDE_DIRECTORY');const proposal=prepareOwnedFieldGateAdoption();
 if(args[0]==='--check'){if(proposal.files.some(row=>row.current!==row.text))fail('exact gate adoption is not installed');assertOwnedFieldGateInputsFresh(proposal);console.log(JSON.stringify({sourceFresh:true,fullForwardQualified:false,budgetsUnchanged:true}));}
 else{const output=resolve(args[1]);if(!relative(proposal.root,output).startsWith('..'+sep)||!relative(output,proposal.root).startsWith('..'+sep))fail('fresh outside directory required');mkdirSync(output);const bytes=Buffer.from(JSON.stringify(proposal)+'\n');if(bytes.length>64*1024*1024)fail('complete proposal bound');assertOwnedFieldGateInputsFresh(proposal);const path=resolve(output,'complete-gate-adoption-and-inverses.json.gz');writeFileSync(path,gzipSync(bytes),{flag:'wx'});if(!gunzipSync(readFileSync(path),{maxOutputLength:64*1024*1024}).equals(bytes))fail('complete proposal byte readback differs');assertOwnedFieldGateInputsFresh(proposal);console.log(JSON.stringify({proposal:path,installed:false,fullForwardQualified:false,files:proposal.files.map(({path,sha256})=>({path,sha256}))}));}
}
