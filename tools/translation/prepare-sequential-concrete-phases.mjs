// A separate whole-source transaction; the original named transaction stays exact.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-named-phases.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/';
const ORIGINAL=BASE+'private-parser-named-phases.mjs',TARGET=BASE+'private-parser-sequential-phases.mjs';
const WRAPPER=BASE+'concrete-named-phases.mjs',RECEIVER=BASE+'concrete-sequential-phases.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Sequential phase producer: '+message);};
const one=(rows,label)=>{if(rows.length!==1)fail('one complete native selection required: '+label);return rows[0];};
const once=(source,before,after)=>{if(source.split(before).length!==2)fail('one complete original source span required');return source.replace(before,()=>after);};

// This full declaration is copied into the original private lexical closure.
// Receive every target through its actual serialized phase, then independently
// receive the complete inverse. No prior verdict or public document is reused.
function sequentialNamedPhasedEquationRows(input,equationApply,equationSerialize,equationReceive,identifiers){
 if(input.length%3!==0)fail('complete before/middle/after triples required');
 const equations=[],rows=[];let nodes=0,canonicalUnits=0;
 function retain(result){
  nodes+=result.document.nodes.length;canonicalUnits+=result.meta.length;
  if(nodes>BATCH_NODES||canonicalUnits>BATCH_SERIAL)fail('batch aggregate node/canonical budget');
  rows.push(result);
 }
 for(let at=0;at<input.length;at+=3){
  checked();const language=input[at].language;
  if(input[at+1].language!==language||input[at+2].language!==language)fail('complete phase languages differ');
  const initial=equationReceive(input[at].source,language,false);
  checked();if(initial.source!==input[at].source||initial.document.language!==language)fail('batch source association differs');retain(initial);
  const stages=[];let received=initial;
  for(const [index,phase]of ['language','repository'].entries()){
   checked();const target=input[at+index+1],source=received.source,after=target.source;
   const rule={id:identifiers[at/3][index],edits:[{span:[0,source.length],expected:source,replacement:after}]};
   const sequence={languageRules:phase==='language'?[rule]:[],repositoryRules:phase==='repository'?[rule]:[]};
   const run=equationApply(received.document,sequence),wire=equationSerialize(run.value),next=equationReceive(wire,language,true);
   checked();if(next.source!==after||next.document.language!==language||wire!==next.meta)fail('complete serialized/reparsed phase differs');retain(next);
   const reverse={id:identifiers[at/3][index+2],edits:[{span:[0,after.length],expected:after,replacement:source}]};
   const restored=equationApply(next.document,{languageRules:phase==='language'?[reverse]:[],repositoryRules:phase==='repository'?[reverse]:[]});
   const inverseWire=equationSerialize(restored.value),inverse=equationReceive(inverseWire,language,true);
   checked();if(inverse.source!==source||inverse.meta!==received.meta||inverseWire!==received.meta)fail('complete serialized/reparsed inverse differs');
   stages.push({phase,before:source,after,beforeMeta:received.meta,afterMeta:next.meta,sequence,trace:run.trace,inverse:source});received=next;
  }
  equations.push({before:initial.source,middle:input[at+1].source,after:received.source,beforeMeta:initial.meta,middleMeta:stages[0].afterMeta,afterMeta:received.meta,stages,trace:stages.flatMap(row=>row.trace),inverse:initial.source});checked();
 }
 return {equations,rows,nodes,canonicalUnits};
}

export function prepareSequentialConcretePhases({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 const before=readFileSync(resolve(root,ORIGINAL),'utf8'),wrapper=readFileSync(resolve(root,WRAPPER),'utf8'),self=readFileSync(fileURLToPath(import.meta.url),'utf8');
 if(hash(before)!=='d66a022d1db4da39e2a8d247835d88f1f7c5313b104e1a8d998f7bbbd69fc997')fail('complete original named transaction differs');
 const parse=(path,source)=>{const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;};
 const file=parse(ORIGINAL,before),declaration=(file,name)=>one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),name);
 const factory=declaration(file,'originalNamedPhasedEquationRows'),kernel=declaration(file,'transportPrivateConcreteNamedPhases'),selfFile=parse('prepare-sequential-concrete-phases.mjs',self),replacement=declaration(selfFile,'sequentialNamedPhasedEquationRows').getText(selfFile);
 let next=once(kernel.getText(file),'transportPrivateConcreteNamedPhases(input,identifiers)','transportPrivateConcreteSequentialPhases(input,identifiers)');
 const start=next.indexOf('    const rows=[];let nodes=0,canonicalUnits=0;'),end=next.indexOf('    const result={equations,rows,totals:');
 if(start<0||end<start)fail('complete original parse/equation operation differs');
 const operation=`    const equationApply=modules.concrete.applyConcreteSyntaxSubstitutions,equationSerialize=modules.concrete.serializeConcreteSyntaxMeta;
    let received;
    try{received=sequentialNamedPhasedEquationRows(request.rows,equationApply,equationSerialize,transport,named.rows);}catch(error){
      checked();const message=error!==null&&typeof error==='object'&&!proxy(error)?descriptor(error,'message'):null;
      throwOriginalCapturedTypeError(message&&own(message,'value')&&typeof message.value==='string'?message.value:'Private original grammar refused');
    }
    const {equations,rows,nodes,canonicalUnits}=received;
`;
 next=next.slice(0,start)+operation+next.slice(end);
 const apply=(source,edits)=>{let result=source;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(result.slice(...row.span)!==row.expected)fail('complete native span changed');result=result.slice(0,row.span[0])+row.replacement+result.slice(row.span[1]);}return result;};
 const selected=[[factory,replacement],[kernel,next]].map(([node,replacement])=>({span:[node.getStart(file),node.end],expected:node.getText(file),replacement})),middle=apply(before,selected);
 const wrapperFile=parse(WRAPPER,wrapper),imports=wrapperFile.statements.filter(ts.isImportDeclaration),owner=one(imports.filter(node=>node.moduleSpecifier.text==='./private-parser-named-phases.mjs'),'private import'),identifiers=[];
 const visit=node=>{if(ts.isIdentifier(node)&&node.text==='transportPrivateConcreteNamedPhases')identifiers.push(node);ts.forEachChild(node,visit);};visit(wrapperFile);if(identifiers.length!==2)fail('actual imported function and complete call required');
 const wrapperEdits=[{span:[owner.moduleSpecifier.getStart(wrapperFile),owner.moduleSpecifier.end],expected:owner.moduleSpecifier.getText(wrapperFile),replacement:"'./private-parser-sequential-phases.mjs'"},...identifiers.map(node=>({span:[node.getStart(wrapperFile),node.end],expected:node.getText(wrapperFile),replacement:'transportPrivateConcreteSequentialPhases'}))],afterWrapper=apply(wrapper,wrapperEdits);
 const descriptions=[{path:TARGET,original:ORIGINAL,before,middle,after:middle,nativeEdits:selected},{path:RECEIVER,original:WRAPPER,before:wrapper,middle:wrapper,after:afterWrapper,nativeEdits:wrapperEdits}];
 for(const row of descriptions){parse(row.path,row.middle);parse(row.path,row.after);if(row.after.split('\n').length>=1000)fail('complete source exceeds line bound');}
 const equations=transportConcreteNamedSourcePhases(descriptions.map(row=>({before:row.before,middle:row.middle,after:row.after,language:'JavaScript',rules:['language:receive-complete-target-from-actual-phase','repository:bind-separate-sequential-phase-receiver','language:restore-complete-original-named-transaction','repository:restore-original-named-phase-import']})));
 const files=descriptions.map((row,at)=>{let current=null;try{current=readFileSync(resolve(root,row.path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}if(current!==null&&current!==row.after||equations[at].inverse!==row.before)fail('unknown complete current source or inverse');return {...row,equation:equations[at],current,beforeSha256:hash(row.before),afterSha256:hash(row.after)};});
 if(readFileSync(resolve(root,ORIGINAL),'utf8')!==before||readFileSync(resolve(root,WRAPPER),'utf8')!==wrapper||readFileSync(fileURLToPath(import.meta.url),'utf8')!==self)fail('complete original source changed during proposal');
 return {schema:'sequential-concrete-source-phases-v1',files,originalNamedTransactionUnchanged:true,originalBudgetsUnchanged:true,newVerdictCache:false,semanticAuthority:false,performanceQualified:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv.slice(2).join(' ');if(!['--write','--check'].includes(mode))fail('use --write|--check');const plan=prepareSequentialConcretePhases();
 if(mode==='--write'){for(const row of plan.files){let current=null;try{current=readFileSync(resolve(ROOT,row.path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}if(current!==row.current)fail('complete target changed before installation');}for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}
 else if(plan.files.some(row=>row.current!==row.after))fail('complete generated sequential phase source is stale');
 console.log(JSON.stringify({files:plan.files.map(({path,beforeSha256,afterSha256})=>({path,beforeSha256,afterSha256})),semanticAuthority:false,performanceQualified:false}));
}
