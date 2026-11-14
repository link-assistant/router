// Derive a separate DATA transaction; the original private executor is unchanged.
import {readFileSync,writeFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const SELF='tools/translation/prepare-concrete-phased-equations.mjs';
const TARGET='tools/translation/private-parser-phased-equations.mjs';
const PROFILE='tools/translation/source-profiles/concrete-phased-equations/';
const MANIFEST='af732484ec3b0d586a1cbf99f290ffdb0803e0ef3195b98df2aaabd002971c2d';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Concrete phased equation producer: '+message);};
function one(rows,label){if(rows.length!==1)fail('one complete native selection required: '+label);return rows[0];}
function grammar(ts,path,source){
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length||source.split('\n').length>=1000)fail('complete native grammar or line budget differs');return file;
}
function physicalTarget(root){
 try{
  if(!lstatSync(resolve(root,TARGET)).isFile())fail('regular generated target required');
  return readFileSync(resolve(root,TARGET),'utf8');
 }catch(error){if(error.code==='ENOENT')return null;throw error;}
}
function nativeSyntax(source){
 if(process.versions.bun){
  if(typeof globalThis.Bun?.Transpiler!=='function')fail('native Bun scanner required');
  new globalThis.Bun.Transpiler({loader:'js',target:'bun'}).scan(source);
 }else{
  const checked=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8',maxBuffer:1048576});
  if(checked.status!==0)fail('native JavaScript syntax check failed: '+checked.stderr);
 }
}
function edit(source,edits){
 let after=source,last=source.length;
 for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){
  if(row.span[1]>last||source.slice(...row.span)!==row.expected)fail('complete native span differs');
  after=after.slice(0,row.span[0])+row.replacement+after.slice(row.span[1]);last=row.span[0];
 }
 let shift=0;const positions=[...edits].sort((a,b)=>a.span[0]-b.span[0]).map(row=>{
  const position=row.span[0]+shift;shift+=row.replacement.length-row.expected.length;return {...row,position};
 });
 let inverse=after;
 for(const row of positions.reverse()){
  if(inverse.slice(row.position,row.position+row.replacement.length)!==row.replacement)fail('complete native inverse span differs');
  inverse=inverse.slice(0,row.position)+row.expected+inverse.slice(row.position+row.replacement.length);
 }
 if(inverse!==source)fail('complete native inverse differs');return after;
}
function stage(before,after,phase){
 const input=transportConcreteSyntaxSource(before,{language:'JavaScript'});
 const rule={id:'concrete-phases:'+phase,edits:[{span:[0,before.length],expected:before,replacement:after}]};
 const sequence={languageRules:phase==='language'?[rule]:[],repositoryRules:phase==='repository'?[rule]:[]};
 const run=applyConcreteSyntaxSubstitutions(input.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),received=transportConcreteSyntaxMeta(afterMeta);
 if(received.source!==after)fail('complete serialized/reparsed stage differs');
 const reverse={id:'concrete-phases:complete-inverse',edits:[{span:[0,after.length],expected:after,replacement:before}]};
 const restored=applyConcreteSyntaxSubstitutions(received.document,{languageRules:phase==='language'?[reverse]:[],repositoryRules:phase==='repository'?[reverse]:[]});
 if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(restored.value)).source!==before)fail('complete CST inverse differs');
 return {phase,before,after,beforeMeta:input.meta,afterMeta,sequence,trace:run.trace,inverse:before};
}

// This complete actual function is native-selected and copied into the new
// private module. Only fresh original rows and captured operations reach it.
function originalPhasedEquationRows(rows,equationApply,equationSerialize,equationReceive){
 if(rows.length%3!==0)fail('complete before/middle/after triples required');
 const equations=[];
 for(let at=0;at<rows.length;at+=3){
  checked();const initial=rows[at],middle=rows[at+1],final=rows[at+2],language=initial.document.language;
  if(middle.document.language!==language||final.document.language!==language)fail('complete phase languages differ');
  const stages=[];let received=initial;
  for(const [phase,target]of [['language',middle],['repository',final]]){
   const source=received.source,after=target.source;
   const rule={id:'source-phases:complete-'+phase+'-edit',edits:[{span:[0,source.length],expected:source,replacement:after}]};
   const sequence={languageRules:phase==='language'?[rule]:[],repositoryRules:phase==='repository'?[rule]:[]};
   const run=equationApply(received.document,sequence),wire=equationSerialize(run.value),next=equationReceive(wire,language,true);
   checked();if(next.source!==after||next.meta!==target.meta||wire!==target.meta)fail('complete serialized/reparsed phase differs');
   const reverse={id:'source-phases:complete-'+phase+'-inverse',edits:[{span:[0,after.length],expected:after,replacement:source}]};
   const restored=equationApply(next.document,{languageRules:phase==='language'?[reverse]:[],repositoryRules:phase==='repository'?[reverse]:[]});
   const inverseWire=equationSerialize(restored.value),inverse=equationReceive(inverseWire,language,true);
   checked();if(inverse.source!==source||inverse.meta!==received.meta||inverseWire!==received.meta)fail('complete serialized/reparsed inverse differs');
   stages.push({phase,before:source,after,beforeMeta:received.meta,afterMeta:next.meta,sequence,trace:run.trace,inverse:source});received=next;
  }
  equations.push({before:initial.source,middle:middle.source,after:final.source,beforeMeta:initial.meta,middleMeta:middle.meta,afterMeta:final.meta,stages,trace:stages.flatMap(row=>row.trace),inverse:initial.source});checked();
 }
 return equations;
}

export function prepareConcretePhasedEquations({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 const manifestBytes=readFileSync(resolve(root,PROFILE+'manifest.json'));if(hash(manifestBytes)!==MANIFEST)fail('complete original manifest differs');
 const manifest=JSON.parse(manifestBytes),packed=readFileSync(resolve(root,PROFILE+manifest.archive));
 if(manifest.schema!=='concrete-phased-equations-original-v1'||manifest.path!=='tools/translation/private-parser-execution.mjs'||packed.length!==manifest.archiveBytes||hash(packed)!==manifest.archiveSha256)fail('complete original archive differs');
 const raw=gunzipSync(packed,{maxOutputLength:131072});if(raw.length!==manifest.bytes||hash(raw)!==manifest.sha256)fail('complete original bytes differ');
 const before=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw);
 if(hash(before)!==manifest.sha256||readFileSync(resolve(root,manifest.path),'utf8')!==before)fail('fresh complete original executor differs');
 const self=readFileSync(resolve(root,SELF),'utf8'),selfFile=grammar(ts,SELF,self),originalFile=grammar(ts,manifest.path,before);
 const factory=one(selfFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='originalPhasedEquationRows'),'complete actual factory');
 const original=one(originalFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='transportPrivateConcreteSources'),'complete original transaction');
 const kernel=original.getText(originalFile),kernelFile=grammar(ts,'kernel.mjs',kernel),fn=one(kernelFile.statements.filter(ts.isFunctionDeclaration),'complete original kernel');
 const transaction=one(fn.body.statements.filter(ts.isTryStatement),'complete original transaction body');
 const result=one(transaction.tryBlock.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>row.name.getText(kernelFile)==='result')),'complete original result');
 const declaration=one(result.declarationList.declarations.filter(node=>node.name.getText(kernelFile)==='result'),'result object');
 if(!ts.isObjectLiteralExpression(declaration.initializer))fail('complete result object differs');
 const returned=one(transaction.tryBlock.statements.filter(ts.isReturnStatement),'complete final return');
 const edits=[
  {span:[fn.name.getStart(kernelFile),fn.name.end],expected:fn.name.text,replacement:'transportPrivateConcretePhases'},
  {span:[result.getStart(kernelFile),result.getStart(kernelFile)],expected:'',replacement:'const equationApply=modules.concrete.applyConcreteSyntaxSubstitutions,equationSerialize=modules.concrete.serializeConcreteSyntaxMeta,equations=originalPhasedEquationRows(rows,equationApply,equationSerialize,transport);\n    '},
  {span:[declaration.initializer.getStart(kernelFile)+1,declaration.initializer.getStart(kernelFile)+1],expected:'',replacement:'equations,'},
  {span:[returned.getStart(kernelFile),returned.getStart(kernelFile)],expected:'',replacement:"if(modules.concrete.applyConcreteSyntaxSubstitutions!==equationApply||modules.concrete.serializeConcreteSyntaxMeta!==equationSerialize)fail('complete phased function association changed');"},
 ];
 const copied=edit(kernel,edits),factorySource=factory.getText(selfFile),marker='\n// Begin generated separate complete phased source transaction.\n';
 const language=before+marker+factorySource+'\n'+edit(kernel,edits.slice(0,1))+'\n',after=before+marker+factorySource+'\n'+copied+'\n';
 grammar(ts,TARGET,language);grammar(ts,TARGET,after);
 const current=physicalTarget(root);
 if(current!==null&&current!==after)fail('unregistered complete generated target');
 const stages=[stage(before,language,'language'),stage(language,after,'repository')];
 if(readFileSync(resolve(root,SELF),'utf8')!==self||!readFileSync(resolve(root,PROFILE+'manifest.json')).equals(manifestBytes)||!readFileSync(resolve(root,PROFILE+manifest.archive)).equals(packed)||readFileSync(resolve(root,manifest.path),'utf8')!==before||physicalTarget(root)!==current)fail('complete producer inputs changed');
 return {schema:'complete-phased-source-equation-proposal-v1',file:{path:TARGET,before,language,after,current,beforeSha256:hash(before),afterSha256:hash(after),inverse:before,stages,nativeKernel:{source:kernel,span:[original.getStart(originalFile),original.end],copied,edits},nativeFactory:{source:factorySource,span:[factory.getStart(selfFile),factory.end],inverse:factorySource}},existingExecutorUnchanged:true,newResultCaches:false,semanticAuthority:false,performanceQualified:false};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);if(rest.length||!['--emit','--write','--check'].includes(mode))fail('use --emit|--write|--check');
 const plan=prepareConcretePhasedEquations(),row=plan.file;
 if(mode==='--emit')console.log(JSON.stringify(plan));
 else if(mode==='--check'){if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.after)fail('complete generated transaction is stale');console.log('Complete phased transaction is current; no semantic authority.');}
 else{
  nativeSyntax(row.after);
  if(physicalTarget(ROOT)!==row.current)fail('complete target changed before installation');
  writeFileSync(resolve(ROOT,row.path),row.after);console.log(JSON.stringify({path:row.path,sha256:row.afterSha256,semanticAuthority:false}));
 }
}
