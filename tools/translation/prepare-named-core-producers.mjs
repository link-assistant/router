// Batch complete CST equations while retaining every original producer result.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-named-phases.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PROFILE='tools/translation/source-profiles/named-core-producers/';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Named core producers: '+message);};
const names={
 unit:['language:copy-checked-unit-matches-and-original-source-custody','router:bind-separate-owned-unit-matches-operation','language:restore-complete-unit-input','router:restore-original-unit-operation-input'],
 unicode:['owned-unicode-predicates:retain-complete-inputs','router-core:explicit-unicode-predicates','owned-unicode-predicates:restore-language-input','router-core:restore-complete-before-unicode-predicates'],
};
const once=(source,before,after)=>{if(source.split(before).length!==2)fail('unique complete native source selection differs');return source.replace(before,()=>after);};
function originals(root){
 const manifest=readFileSync(resolve(root,PROFILE+'manifest.json'));if(hash(manifest)!=='333600d475b52fffdde25879258486ad3b0943a018145ad0b76f4cffd9300ba5')fail('complete original producer manifest differs');
 const packed=readFileSync(resolve(root,PROFILE+'originals.json.gz'));
 if(packed.length!==8954||hash(packed)!=='b01ea4c263830574db79c862aa91fa571cc1e9c1aa8445d772654f9959d75f6e')fail('complete original source archive differs');
 const raw=gunzipSync(packed,{maxOutputLength:65536});
 if(raw.length!==31021||hash(raw)!=='80431f90646136d06abc160f489f3e5e3e2f23d6eaeb52fab9b992f382d077a9')fail('complete original producer bytes differ');
 const packet=JSON.parse(new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw));
 if(packet.schema!=='named-core-producers-originals-v1'||packet.files.length!==2||new Set(packet.files.map(row=>row.path)).size!==2)fail('complete producer census differs');
 for(const row of packet.files)if(hash(row.source)!==row.sha256||Buffer.byteLength(row.source)!==row.bytes)fail('complete individual producer source differs');
 return packet.files;
}
function grammar(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;}
function stageFields(){return "const stages=equation.stages.map(({phase,before,after,beforeMeta,afterMeta,trace})=>({phase,before,after,beforeMeta,afterMeta,trace,completeInverse:true})),beforeMeta=equation.beforeMeta,afterMeta=equation.afterMeta;\n ";}
function prepareSource(ts,row){
 const before=row.source,file=grammar(ts,row.path,before),unit=row.path.endsWith('prepare-core-unit-matches.mjs'),kind=unit?'unit':'unicode';
 const fn=name=>{const rows=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);if(rows.length!==1)fail('one complete native producer function required');return rows[0];};
 const helper=fn(unit?'rowPlan':'prepare'),original=helper.getText(file),marker=" let current=null;",at=original.indexOf(marker);
 if(at<0)fail('complete current-source read required');
 let tail=once(original.slice(at),'afterMeta:serializeConcreteSyntaxMeta(document)','afterMeta');
 const head=unit?
  "function rowPlan(ts,path,before,after,root,originalNativeFile,equation){\n const language=path.endsWith('.rs')?'Rust':'JavaScript',languageSource=[MATCHES,CONST,ORDERED,LINKS].includes(path)?after:before;\n if(equation.before!==before||equation.middle!==languageSource||equation.after!==after||equation.inverse!==before)fail('complete named source equation differs');\n ":
  "function prepare(row,after,root,ts,equation){\n const before=row.source,language=row.path.endsWith('.rs')?'Rust':'JavaScript';\n if(equation.before!==before||equation.middle!==before||equation.after!==after||equation.inverse!==before)fail('complete named source equation differs');\n ";
 const helperAfter=head+stageFields()+tail,entry=fn(unit?'prepareCoreUnitMatches':'prepareCoreUnicodePredicates');let entryAfter=entry.getText(file);
 if(unit){
  const cst="\n const cst=transportConcreteNamedSourcePhases(paths.map(path=>({before:result.source[path],middle:[MATCHES,CONST,ORDERED,LINKS].includes(path)?result.after[path]:result.source[path],after:result.after[path],language:path.endsWith('.rs')?'Rust':'JavaScript',rules:"+JSON.stringify(names[kind])+"})));";
  entryAfter=once(entryAfter,'files=[];','files=[];'+cst);
  entryAfter=once(entryAfter,'for(const path of paths)files.push(rowPlan(ts,path,result.source[path],result.after[path],root,result.originalNativeFiles.get(path)))','for(const [at,path]of paths.entries())files.push(rowPlan(ts,path,result.source[path],result.after[path],root,result.originalNativeFiles.get(path),cst[at]))');
 }else{
  const cst="\n const cst=transportConcreteNamedSourcePhases(rows.map(row=>({before:row.source,middle:row.source,after:after[row.path],language:row.path.endsWith('.rs')?'Rust':'JavaScript',rules:"+JSON.stringify(names[kind])+"})));";
  entryAfter=once(entryAfter,'after=afterSources(rows);','after=afterSources(rows);'+cst);
  entryAfter=once(entryAfter,'rows.map(row=>prepare(row,after[row.path],root,ts))','rows.map((row,at)=>prepare(row,after[row.path],root,ts,cst[at]))');
 }
 const edits=[[helper,helperAfter],[entry,entryAfter]].map(([node,replacement])=>({span:[node.getStart(file),node.end],expected:node.getText(file),replacement}));
 let middle=before;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(middle.slice(...edit.span)!==edit.expected)fail('complete native producer span changed');middle=middle.slice(0,edit.span[0])+edit.replacement+middle.slice(edit.span[1]);}
 const after=once(middle,"import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';","import {transportConcreteNamedSourcePhases} from './concrete-named-phases.mjs';");
 grammar(ts,row.path,middle);grammar(ts,row.path,after);
 return {path:row.path,before,middle,after,nativeEdits:edits,rules:[...names[kind]]};
}
export function prepareNamedCoreProducers({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const input=originals(root),files=input.map(row=>prepareSource(ts,row));
 const equations=transportConcreteNamedSourcePhases(files.map(row=>({before:row.before,middle:row.middle,after:row.after,language:'JavaScript',rules:['language:batch-complete-original-core-equations','repository:import-named-core-equation-transaction','language:restore-complete-original-core-producer','repository:restore-complete-original-core-imports']})));
 for(const [at,row]of files.entries()){
  row.equation=equations[at];row.current=readFileSync(resolve(root,row.path),'utf8');
  if(row.equation.inverse!==row.before||row.current!==row.before&&row.current!==row.after)fail('unknown complete physical source: '+row.path);
  if(row.after.split('\n').length>=1000)fail('complete output exceeds line bound');
 }
 if(JSON.stringify(originals(root))!==JSON.stringify(input))fail('complete original archive changed');
 return {schema:'named-core-source-producers-v1',files,typescriptVersion:ts.version,originalRuleNamesRetained:true,originalNativeCopiesAndBindingsRetained:true,newVerdictCaches:false,semanticAuthority:false};
}

// Receiving only: retain complete old operations and qualify their import URLs.
export function originalNamedCoreProducerSources({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler(),input=originals(root),files=input.map(row=>{
  const file=grammar(ts,row.path,row.source),url=pathToFileURL(resolve(root,row.path)),edits=[];
  for(const node of file.statements)if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text.startsWith('.'))edits.push({span:[node.moduleSpecifier.getStart(file),node.moduleSpecifier.end],expected:node.moduleSpecifier.getText(file),replacement:JSON.stringify(new URL(node.moduleSpecifier.text,url).href)});
  const visit=node=>{if(ts.isPropertyAccessExpression(node)&&node.name.text==='url'&&ts.isMetaProperty(node.expression)&&node.expression.keywordToken===ts.SyntaxKind.ImportKeyword)edits.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement:JSON.stringify(url.href)});ts.forEachChild(node,visit);};visit(file);
  let after=row.source;for(const edit of edits.sort((a,b)=>b.span[0]-a.span[0])){if(after.slice(...edit.span)!==edit.expected)fail('complete receiving native span differs');after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);}
  grammar(ts,row.path,after);return {...row,after,receivingEdits:edits};
 });
 const equations=transportConcreteNamedSourcePhases(files.map(row=>({before:row.source,middle:row.after,after:row.after,language:'JavaScript',rules:['language:retain-complete-original-producer-with-actual-import-urls','repository:retain-complete-original-receiving-producer','language:restore-complete-original-source-urls','repository:restore-complete-receiving-source']})));
 if(JSON.stringify(originals(root))!==JSON.stringify(input))fail('complete receiving original source changed');
 return files.map((row,at)=>({...row,equation:equations[at]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv.slice(2).join(' ');if(!['--write','--check'].includes(mode))fail('use --write|--check');const plan=prepareNamedCoreProducers();
 if(mode==='--write'){for(const row of plan.files)if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)fail('physical source changed before installation');for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}
 else if(plan.files.some(row=>row.current!==row.after))fail('complete named core producers are stale');
 console.log(JSON.stringify({files:plan.files.map(row=>({path:row.path,sha256:hash(row.after)})),semanticAuthority:false}));
}
