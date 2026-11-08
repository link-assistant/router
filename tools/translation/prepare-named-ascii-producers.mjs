// Whole original producer results; fresh named CST equations per operation.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-named-phases.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PROFILE='tools/translation/source-profiles/named-ascii-producers/';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Named ASCII producers: '+message);};
const names={
 reverse:['reverse-ascii:retain-full-native-program','router-core:bind-source-qualified-reverse-ascii','reverse-ascii:restore-language-source','router-core:restore-before-reverse-ascii'],
 retention:['javascript:retain-existing-private-analysis','router:preserve-complete-operations-source','javascript:restore-second-private-copy','router:restore-complete-operations-source'],
};
const once=(source,before,after)=>{if(source.split(before).length!==2)fail('unique complete native selection differs');return source.replace(before,()=>after);};
function originals(root){
 if(hash(readFileSync(resolve(root,PROFILE+'manifest.json')))!=='2601b3fde98d2a5cca742d16073287c7a7cda832b444bd968cfb109354ce307a')fail('complete original manifest differs');
 const packed=readFileSync(resolve(root,PROFILE+'originals.json.gz'));
 if(packed.length!==5405||hash(packed)!=='f6959302d4ae34317530b90d94aecacf671eb6aeec8d3897f689c6d9185c4e74')fail('complete original archive differs');
 const raw=gunzipSync(packed,{maxOutputLength:65536});
 if(raw.length!==18474||hash(raw)!=='7f472675d019c749c24afdad7625cab8cf5d8bffbe603313775b3fad709c72ac')fail('complete original bytes differ');
 const packet=JSON.parse(new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw));
 if(packet.schema!=='named-ascii-producers-originals-v1'||packet.files.length!==2||new Set(packet.files.map(row=>row.path)).size!==2)fail('complete source census differs');
 for(const row of packet.files)if(hash(row.source)!==row.sha256||Buffer.byteLength(row.source)!==row.bytes)fail('complete individual source differs');
 return packet.files;
}
function grammar(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;}
function stages(){return 'const beforeMeta=equation.beforeMeta,afterMeta=equation.afterMeta,stages=equation.stages.map(({phase,before,after,beforeMeta,afterMeta,trace})=>({phase,before,after,beforeMeta,afterMeta,trace,completeInverse:true}));\n ';}
function producer(ts,row){
 const before=row.source,file=grammar(ts,row.path,before),reverse=row.path.endsWith('prepare-core-ascii-reverse-sources.mjs'),kind=reverse?'reverse':'retention';
 const fn=name=>{const found=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);if(found.length!==1)fail('one whole native function required: '+name);return found[0];};
 const edits=[];
 if(reverse){
  const helper=fn('prepare'),text=helper.getText(file),at=text.indexOf(' let current=null;');if(at<0)fail('original current-source read required');
  const tail=once(text.slice(at),'afterMeta:serializeConcreteSyntaxMeta(document)','afterMeta');
  const replacement="function prepare(row,after,root,ts,equation){\n const before=row.source;if(equation.before!==before||equation.middle!==before||equation.after!==after||equation.inverse!==before)fail('complete named source equation differs');\n "+stages()+tail;
  edits.push([helper,replacement]);
  const entry=fn('prepareCoreAsciiReverseSources');let result=entry.getText(file);
  const equations='const equations=transportConcreteNamedSourcePhases(before.map((row,at)=>({before:row.source,middle:row.source,after:after[at].source,language:\'JavaScript\',rules:'+JSON.stringify(names[kind])+'})));';
  result=once(result,"return {schema:'router-owned-ascii-reverse-sources-v1'",equations+"return {schema:'router-owned-ascii-reverse-sources-v1'");
  result=once(result,'prepare(row,after[at].source,root,ts)','prepare(row,after[at].source,root,ts,equations[at])');edits.push([entry,result]);
 }else{
  const entry=fn('prepareOwnedCorePrivateAnalysisRetention'),text=entry.getText(file),start=text.indexOf(' const first=transportConcreteSyntaxSource('),end=text.indexOf(' const nativeCopies=');
  if(start<0||end<start)fail('complete original CST operation required');
  let result=text.slice(0,start)+' const [equation]=transportConcreteNamedSourcePhases([{before,middle:language,after,language:\'JavaScript\',rules:'+JSON.stringify(names[kind])+'}]);\n '+stages()+text.slice(end);
  result=once(result,'afterMeta:serializeConcreteSyntaxMeta(document)','afterMeta');edits.push([entry,result]);
 }
 const nativeEdits=edits.map(([node,replacement])=>({span:[node.getStart(file),node.end],expected:node.getText(file),replacement}));
 let middle=before;for(const edit of [...nativeEdits].sort((a,b)=>b.span[0]-a.span[0])){if(middle.slice(...edit.span)!==edit.expected)fail('whole native span changed');middle=middle.slice(0,edit.span[0])+edit.replacement+middle.slice(edit.span[1]);}
 const after=once(middle,"import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';","import {transportConcreteNamedSourcePhases} from './concrete-named-phases.mjs';");
 grammar(ts,row.path,middle);grammar(ts,row.path,after);return {path:row.path,before,middle,after,nativeEdits,rules:names[kind]};
}
export function prepareNamedAsciiProducers({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 const input=originals(root),files=input.map(row=>producer(ts,row));
 const equations=transportConcreteNamedSourcePhases(files.map(row=>({before:row.before,middle:row.middle,after:row.after,language:'JavaScript',rules:['language:batch-whole-original-ascii-source-equations','repository:import-named-ascii-source-transaction','language:restore-whole-original-ascii-producer','repository:restore-original-ascii-producer-imports']})));
 for(const [at,row]of files.entries()){
  row.equation=equations[at];row.current=readFileSync(resolve(root,row.path),'utf8');
  if(row.current!==row.before&&row.current!==row.after||row.equation.inverse!==row.before)fail('unknown complete physical source: '+row.path);
  if(row.after.split('\n').length>=1000)fail('whole producer exceeds line bound');
 }
 if(JSON.stringify(originals(root))!==JSON.stringify(input))fail('whole original source archive changed');
 return {schema:'named-ascii-source-producers-v1',files,typescriptVersion:ts.version,originalRuleNamesRetained:true,originalNativeCopiesAndBindingsRetained:true,newVerdictCaches:false,semanticAuthority:false};
}

// Receiving DATA: execute whole retained original modules through actual URLs.
export function originalNamedAsciiProducerSources({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler(),input=originals(root),files=input.map(row=>{
  const file=grammar(ts,row.path,row.source),url=pathToFileURL(resolve(root,row.path)),edits=[];
  for(const node of file.statements)if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text.startsWith('.'))edits.push({span:[node.moduleSpecifier.getStart(file),node.moduleSpecifier.end],expected:node.moduleSpecifier.getText(file),replacement:JSON.stringify(new URL(node.moduleSpecifier.text,url).href)});
  const visit=node=>{if(ts.isPropertyAccessExpression(node)&&node.name.text==='url'&&ts.isMetaProperty(node.expression)&&node.expression.keywordToken===ts.SyntaxKind.ImportKeyword)edits.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement:JSON.stringify(url.href)});ts.forEachChild(node,visit);};visit(file);
  let after=row.source;for(const edit of edits.sort((a,b)=>b.span[0]-a.span[0])){if(after.slice(...edit.span)!==edit.expected)fail('whole receiving native span differs');after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);}
  grammar(ts,row.path,after);return {...row,after,receivingEdits:edits};
 });
 const equations=transportConcreteNamedSourcePhases(files.map(row=>({before:row.source,middle:row.after,after:row.after,language:'JavaScript',rules:['language:retain-whole-original-ascii-source-with-actual-urls','repository:retain-whole-original-ascii-receiving-producer','language:restore-whole-original-ascii-source-urls','repository:restore-whole-original-ascii-receiving-source']})));
 if(JSON.stringify(originals(root))!==JSON.stringify(input))fail('whole receiving original archive changed');
 return files.map((row,at)=>({...row,equation:equations[at]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv.slice(2).join(' ');if(!['--write','--check'].includes(mode))fail('use --write|--check');const plan=prepareNamedAsciiProducers();
 if(mode==='--write'){for(const row of plan.files)if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)fail('physical source changed before installation');for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}
 else if(plan.files.some(row=>row.current!==row.after))fail('complete named ASCII producers are stale');
 console.log(JSON.stringify({files:plan.files.map(row=>({path:row.path,sha256:hash(row.after)})),semanticAuthority:false}));
}
