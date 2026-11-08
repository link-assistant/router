// Separate complete-source substitution domain. Stored/edited CST APIs remain exact.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-named-phases.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/';
const hash=source=>createHash('sha256').update(source).digest('hex');
const fail=message=>{throw TypeError('Source-origin concrete phase producer: '+message);};
const one=(rows,label)=>{if(rows.length!==1)fail('one complete native '+label+' required');return rows[0];};
const once=(source,before,after)=>{if(source.split(before).length!==2)fail('one complete original source anchor required');return source.replace(before,()=>after);};

// Copied into the authenticated private closure. Each real substitution and its
// inverse receives two fresh builds, canonical JSON parsing and reconstruction.
// No caller document, stored node array or completed verdict enters this domain.
function sourceOriginNamedPhasedEquationRows(input,equationReceive,identifiers){
 if(input.length%3!==0)fail('complete before/middle/after triples required');
 const equations=[],rows=[];let nodes=0,canonicalUnits=0;
 function retain(result){nodes+=result.document.nodes.length;canonicalUnits+=result.meta.length;if(nodes>BATCH_NODES||canonicalUnits>BATCH_SERIAL)fail('batch aggregate node/canonical budget');rows.push(result);}
 function substitute(received,after,language,id,phase){
  checked();const source=received.source,root=received.document.nodes[0];
  const rule={id,edits:[{span:[0,source.length],expected:source,replacement:after}]},edit=rule.edits[0];
  const sequence={languageRules:phase==='language'?[rule]:[],repositoryRules:phase==='repository'?[rule]:[]};
  if(received.document.source!==source||received.document.language!==language||root[0]!=='root'||root[2]!==edit.span[0]||root[3]!==edit.span[1]||source.slice(...edit.span)!==edit.expected)fail('complete exact source edit association differs');
  const changed=source.slice(0,edit.span[0])+edit.replacement+source.slice(edit.span[1]),next=equationReceive(changed,language);
  if(next.source!==after||next.document.language!==language)fail('complete serialized/reparsed phase differs');
  const applied={id,edits:[[...edit.span]],beforeCodeUnits:source.length,afterCodeUnits:next.source.length};
  const trace=[{phase:'language',rules:phase==='language'?[applied]:[]},{phase:'repository',rules:phase==='repository'?[applied]:[]}];checked();
  return {next,sequence,trace};
 }
 for(let at=0;at<input.length;at+=3){
  checked();const language=input[at].language;if(input[at+1].language!==language||input[at+2].language!==language)fail('complete phase languages differ');
  const initial=equationReceive(input[at].source,language);
  if(initial.source!==input[at].source||initial.document.language!==language)fail('batch source association differs');retain(initial);
  const stages=[];let received=initial;
  for(const [index,phase]of ['language','repository'].entries()){
   const source=received.source,after=input[at+index+1].source,run=substitute(received,after,language,identifiers[at/3][index],phase),next=run.next;retain(next);
   const inverse=substitute(next,source,language,identifiers[at/3][index+2],phase).next;
   if(inverse.source!==source||inverse.meta!==received.meta)fail('complete serialized/reparsed inverse differs');
   stages.push({phase,before:source,after,beforeMeta:received.meta,afterMeta:next.meta,sequence:run.sequence,trace:run.trace,inverse:source});received=next;
  }
  equations.push({before:initial.source,middle:input[at+1].source,after:received.source,beforeMeta:initial.meta,middleMeta:stages[0].afterMeta,afterMeta:received.meta,stages,trace:stages.flatMap(row=>row.trace),inverse:initial.source});checked();
 }
 return {equations,rows,nodes,canonicalUnits};
}

export function prepareSourceOriginConcretePhases({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 const specifications=[
  ['private-parser-sequential-phases.mjs','private-parser-source-origin-phases.mjs','6f31fac1d8be5f34f19e2a1c035830a9fa34b297e0f682d576b315c5ff3f5129'],
  ['concrete-sequential-phases.mjs','concrete-source-origin-phases.mjs','fd40bc7124e7be166b75dc5932b61516ffedbc0ccd9d82c941920104a91a4766'],
  ['concrete-sequential-equations.mjs','concrete-source-origin-equations.mjs','ecd68a80d497c0464e15f2c65c421412b147b681a2c64a5a9107638a8f0e5599'],
 ];
 const self=readFileSync(fileURLToPath(import.meta.url),'utf8');
 const parse=(path,source)=>{const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;};
 const declaration=(file,name)=>one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),name);
 const selfFile=parse('prepare-source-origin-concrete-phases.mjs',self),replacement=declaration(selfFile,'sourceOriginNamedPhasedEquationRows').getText(selfFile),files=[];
 const apply=(source,edits)=>{let result=source,last=source.length;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(edit.span[1]>last||result.slice(...edit.span)!==edit.expected)fail('complete native source span changed');result=result.slice(0,edit.span[0])+edit.replacement+result.slice(edit.span[1]);last=edit.span[0];}return result;};
 for(const [original,target,pin]of specifications){
  const before=readFileSync(resolve(root,BASE+original),'utf8');if(hash(before)!==pin)fail('whole original source differs: '+original);
  const file=parse(original,before),edits=[];
  const select=(node,replacement)=>edits.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement});
  if(original.startsWith('private-')){
   const factory=declaration(file,'sequentialNamedPhasedEquationRows'),kernel=declaration(file,'transportPrivateConcreteSequentialPhases');select(factory,replacement);
   let next=once(kernel.getText(file),'transportPrivateConcreteSequentialPhases(input,identifiers)','transportPrivateConcreteSourceOriginPhases(input,identifiers)');
   next=next.replaceAll('modules.concrete.originalIdentityTransport','modules.concrete.originalStandaloneSourceTransport');
   next=once(next,'sequentialNamedPhasedEquationRows(request.rows,equationApply,equationSerialize,transport,named.rows)','sourceOriginNamedPhasedEquationRows(request.rows,transport,named.rows)');select(kernel,next);
  }else{
   const visit=node=>{
    if(ts.isStringLiteral(node)&&node.text==='./private-parser-sequential-phases.mjs')select(node,"'./private-parser-source-origin-phases.mjs'");
    if(ts.isStringLiteral(node)&&node.text==='./concrete-sequential-phases.mjs')select(node,"'./concrete-source-origin-phases.mjs'");
    if(ts.isIdentifier(node)&&node.text==='transportPrivateConcreteSequentialPhases')select(node,'transportPrivateConcreteSourceOriginPhases');
    ts.forEachChild(node,visit);
   };visit(file);
   if(edits.length!==(original==='concrete-sequential-phases.mjs'?3:2))fail('whole receiving import domain differs');
  }
  const middle=original.startsWith('private-')?apply(before,edits):before,after=apply(before,edits);parse(target,after);
  if(after.split('\n').length>=1000)fail('complete generated source exceeds line bound');
  files.push({path:BASE+target,original:BASE+original,before,middle,after,nativeSelections:edits,beforeSha256:pin,afterSha256:hash(after)});
 }
 const equations=transportConcreteNamedSourcePhases(files.map(row=>({before:row.before,middle:row.middle,after:row.after,language:'JavaScript',rules:['language:whole-private-source-origin-substitutions','repository:separate-source-origin-domain','language:restore-original-sequential-source','repository:restore-original-sequential-imports']})));
 for(const [at,row]of files.entries()){
  row.equation=equations[at];if(row.equation.inverse!==row.before)fail('complete original source inverse differs');
  row.current=existsSync(resolve(root,row.path))?readFileSync(resolve(root,row.path),'utf8'):null;
  if(row.current!==null&&row.current!==row.after)fail('unknown complete generated source: '+row.path);
  if(readFileSync(resolve(root,row.original),'utf8')!==row.before)fail('complete original source changed');
 }
 if(readFileSync(fileURLToPath(import.meta.url),'utf8')!==self)fail('complete owning source changed');
 return {schema:'source-origin-complete-concrete-phases-v1',files,typescriptVersion:ts.version,
  originalPublicTransactionsUnchanged:true,untrustedDocumentsAccepted:false,freshBuildsPerSourceTransport:2,
  originalSourceBudgetsUnchanged:true,semanticAuthority:false,runtimeParity:false,performanceQualified:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv.slice(2).join(' ');if(!['--write','--check'].includes(mode))fail('use --write|--check');const plan=prepareSourceOriginConcretePhases();
 if(mode==='--write')for(const row of plan.files){const current=existsSync(resolve(ROOT,row.path))?readFileSync(resolve(ROOT,row.path),'utf8'):null;if(current!==row.current)fail('complete target changed before installation');writeFileSync(resolve(ROOT,row.path),row.after);}
 else if(plan.files.some(row=>row.current!==row.after))fail('complete generated source is stale');
 console.log(JSON.stringify({files:plan.files.map(({path,beforeSha256,afterSha256})=>({path,beforeSha256,afterSha256})),semanticAuthority:false,performanceQualified:false}));
}
