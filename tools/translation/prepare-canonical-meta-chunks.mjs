// A separate serialized-input domain. Existing document readers remain exact.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-source-origin-phases.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const originalPath='tools/translation/private-parser-execution.mjs';
const targetPath='tools/translation/private-parser-canonical-meta-chunks.mjs';
const pin='bb93546dc3ae5f258cdfcf96e185ddc491c0de4078de845b40752f315a8cd0d1';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=reason=>{throw new TypeError('Canonical metadata producer: '+reason);};
const once=(source,before,after)=>{
 if(source.split(before).length!==2)fail('complete original anchor is not unique');
 return source.replace(before,()=>after);
};

// Both parsed objects are private results of the qualified native JSON parser.
// No caller object reaches this function. Exact canonical equality checks every
// field, key order, token, trivia, diagnostic, coordinate and authority flag.
// Two fresh builds and complete leaf reconstruction remain required per row.
const canonicalWorkflow=String.raw`
function originalCanonicalMetaTransport(input){
 checked();text(input,SERIAL_LIMIT,'serialized CST');serializedPreflight(input);
 function receive(wire){
  let parsed;try{parsed=parse(wire);}catch{fail('invalid serialized JSON');}
  const row=record(parsed,['schema','representationLevel','language','source','sourceEncoding','status','nodes','diagnostics','authority'],'document');
  text(row.source,SOURCE_LIMIT,'source');languageName(row.language);
  const document=build(row.source,row.language);
  if(stringify(document)!==wire)fail('noncanonical serialized CST');
  return document;
 }
 const first=receive(input),wire=stringify(first);
 if(wire.length>SERIAL_LIMIT)fail('serialized budget exceeded');
 serializedPreflight(wire);const document=receive(wire),pieces=[];
 for(let at=1;at<document.nodes.length;at++){
  const node=document.nodes[at];if(node[0]!=='group')pieces.push(document.source.slice(node[2],node[3]));
 }
 const source=pieces.join('');
 if(source!==document.source||source!==first.source)fail('leaf partition does not reconstruct source');
 const trace=[{phase:'language',rules:[]},{phase:'repository',rules:[]}];
 checked();return {source,document,meta:wire,trace};
}
`;

export function prepareCanonicalMetaChunks({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();
 if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const before=readFileSync(resolve(root,originalPath),'utf8');
 if(hash(before)!==pin)fail('complete original private reader differs');
 const parse=(path,source)=>{
  const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;
 };
 const file=parse(originalPath,before),selections=[];
 const one=(values,label)=>{if(values.length!==1)fail('one complete '+label+' required');return values[0];};
 const functionNode=name=>one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),name);
 const workflow=one(file.statements.flatMap(node=>ts.isVariableStatement(node)?[...node.declarationList.declarations]:[])
  .filter(node=>ts.isIdentifier(node.name)&&node.name.text==='workflow'),'private workflow');
 if(!workflow.initializer||!ts.isNoSubstitutionTemplateLiteral(workflow.initializer))fail('complete literal workflow required');
 const select=(node,replacement)=>selections.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement});
 select(workflow.initializer,'('+workflow.initializer.getText(file)+' + '+JSON.stringify(canonicalWorkflow)+')');
 const compile=functionNode('compile');
 select(compile,once(compile.getText(file),
  "exports.push('originalIdentityTransport:originalIdentityTransport','originalStandaloneSourceTransport:originalStandaloneSourceTransport')",
  "exports.push('originalIdentityTransport:originalIdentityTransport','originalStandaloneSourceTransport:originalStandaloneSourceTransport','originalCanonicalMetaTransport:originalCanonicalMetaTransport')"));
 const kernel=functionNode('transportPrivateConcreteMetaChunks');
 let replacement=once(kernel.getText(file),'transportPrivateConcreteMetaChunks(input)','transportPrivateConcreteCanonicalChunks(input)');
 replacement=replacement.replaceAll('modules.concrete.originalIdentityTransport','modules.concrete.originalCanonicalMetaTransport');
 select(kernel,replacement);
 const apply=(source,edits)=>{
  let result=source,last=source.length;
  for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){
   if(edit.span[1]>last||result.slice(...edit.span)!==edit.expected)fail('complete native selection differs');
   result=result.slice(0,edit.span[0])+edit.replacement+result.slice(edit.span[1]);last=edit.span[0];
  }return result;
 };
 const pipeline=createRulePipeline([
  {phase:'language',rules:[{id:'language:complete-canonical-rebuild-reader',apply:source=>apply(source,selections)}]},
  {phase:'repository',rules:[{id:'repository:separate-serialized-cst-domain',apply:source=>{
   parse(targetPath,source);if(source.split('\n').length>=1000)fail('generated source line budget');return source;
  }}]},
 ]);
 const result=pipeline.run(before),after=result.value;
 const equation=transportConcreteNamedSourcePhases([{before,middle:after,after,language:'JavaScript',
  rules:['language:complete-canonical-rebuild-reader','repository:separate-serialized-cst-domain',
   'language:restore-complete-original-reader','repository:restore-original-domain']}])[0];
 if(equation.inverse!==before)fail('complete source inverse differs');
 const target=resolve(root,targetPath),current=existsSync(target)?readFileSync(target,'utf8'):null;
 if(current!==null&&current!==after)fail('unknown complete generated target');
 if(readFileSync(resolve(root,originalPath),'utf8')!==before)fail('complete original reader changed');
 return {schema:'canonical-serialized-cst-chunks-source-v1',typescriptVersion:ts.version,
  files:[{path:targetPath,original:originalPath,before,after,current,beforeSha256:pin,
   afterSha256:hash(after),nativeSelections:selections,equation}],trace:result.trace,
  originalReadersUnchanged:true,freshBuildsPerRow:2,originalBoundsUnchanged:true,
  newAcrossInvocationCache:false,semanticAuthority:false,runtimeParity:false};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--write','--check'].includes(args[0]))fail('use --write|--check');
 const plan=prepareCanonicalMetaChunks();
 if(args[0]==='--write')for(const row of plan.files){
  const target=resolve(ROOT,row.path),current=existsSync(target)?readFileSync(target,'utf8'):null;
  if(current!==row.current)fail('complete target changed before installation');writeFileSync(target,row.after);
 }
 else if(plan.files.some(row=>row.current!==row.after))fail('complete generated reader is stale');
 console.log(JSON.stringify({schema:plan.schema,files:plan.files.map(({path,afterSha256})=>({path,afterSha256})),semanticAuthority:false}));
}
