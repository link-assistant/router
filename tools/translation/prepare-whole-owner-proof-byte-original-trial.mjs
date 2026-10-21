// Source-copy the COMPLETE current original-twelve harness, not its test bodies.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {prepareWholeOwnerOriginalTrial} from './prepare-whole-owner-original-trial.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/',INPUT=BASE+'whole-owner-resolver-original-derive-trial.mjs',OUTPUT=BASE+'whole-owner-proof-byte-original-derive-trial.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw TypeError('Whole owner proof byte original trial source: '+message);};
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native source grammar differs');return file;}
export function prepareWholeOwnerProofByteOriginalTrial({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3'||createRequire(resolve(root,'js/package.json'))('typescript')!==ts)fail('actual root installed TypeScript5.9.3 required');
 const birth=prepareWholeOwnerOriginalTrial({root,resolver:true});if(birth.files.some(row=>row.current!==row.after))fail('fresh complete existing original-twelve resolver harness required');
 const before=readFileSync(resolve(root,INPUT),'utf8');if(before!==birth.files[0].after)fail('actual complete current harness source equation differs');
 const file=parse(ts,INPUT,before),edits=[],schemaEdits=[],imports=[];
 for(const node of file.statements){
  if(!ts.isImportDeclaration(node)||node.moduleSpecifier.text!=='./whole-owner-resolver-trial-support.mjs')continue;
  if(!node.importClause?.namedBindings||!ts.isNamedImports(node.importClause.namedBindings))fail('complete genuine trial support imports required');
  const mapping=new Map([['proposeWholeOwnerResolverCanonicalTrial','proposeWholeOwnerProofByteCanonicalTrial'],['assertWholeOwnerResolverTrialInputs','assertWholeOwnerProofByteTrialInputs'],['wholeOwnerResolverTrialFilePacket','wholeOwnerProofByteTrialFilePacket'],['decodeWholeOwnerResolverTrialFilePacket','decodeWholeOwnerProofByteTrialFilePacket']]);
  if(node.importClause.namedBindings.elements.length!==mapping.size)fail('all four original complete support bindings required');
  const bindings=node.importClause.namedBindings.elements.map(binding=>{const old=(binding.propertyName??binding.name).text,replacement=mapping.get(old);if(!replacement)fail('unexpected original support binding');return replacement+' as '+binding.name.text;});
  imports.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement:'import {'+bindings.join(',')+"} from './whole-owner-proof-byte-trial-support.mjs';"});
 }
 if(imports.length!==1)fail('one complete original resolver support import required');
 function visit(node){if(ts.isStringLiteral(node)&&node.text.startsWith('isolated-original-derive-whole-owner-resolver-canonical-'))schemaEdits.push({span:[node.getStart(file),node.end],expected:node.getText(file),beforeValue:node.text,replacement:JSON.stringify(node.text.replace('isolated-original-derive-whole-owner-resolver-canonical-','isolated-original-derive-whole-owner-proof-byte-canonical-'))});ts.forEachChild(node,visit);}visit(file);
 if(!schemaEdits.length)fail('complete distinct trial schema substitutions required');edits.push(...imports,...schemaEdits);
 let after=before;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(after.slice(...edit.span)!==edit.expected)fail('native complete source span differs');after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);}
 if(after.split('\n').length>=1000)fail('complete source line budget');const native=parse(ts,OUTPUT,after),nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,OUTPUT),after),preserved=[];
 for(const node of file.statements.filter(ts.isFunctionDeclaration)){
  const candidates=native.statements.filter(item=>ts.isFunctionDeclaration(item)&&item.name?.text===node.name?.text);if(candidates.length!==1)fail('complete old harness function missing');let inverse=candidates[0].getText(native);
  for(const edit of schemaEdits)inverse=inverse.split(edit.replacement).join(edit.expected);
  if(inverse!==node.getText(file))fail('actual original whole harness function changed: '+node.name?.text);preserved.push({name:node.name?.text,original:node.getText(file),candidate:candidates[0].getText(native),inverse});
 }
 const rule=(old,value,id)=>({id,edits:[{span:[0,old.length],expected:old,replacement:value}]}),sequence={languageRules:[rule(before,before,'javascript:complete-original-twelve-current-harness-copy')],repositoryRules:[rule(before,after,'router:distinct-complete-proof-byte-closure-support-and-schema')]},first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),run=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);if(last.source!==after)fail('complete trial source CST equation differs');
 const inverseSequence={languageRules:[rule(after,before,'javascript:restore-complete-original-current-harness')],repositoryRules:[]},restored=applyConcreteSyntaxSubstitutions(last.document,inverseSequence);if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(restored.value)).source!==before)fail('whole original harness inverse differs');
 const paths=[INPUT,BASE+'prepare-whole-owner-proof-byte-original-trial.mjs',BASE+'whole-owner-proof-byte-trial-support.mjs'],inputs=paths.map(path=>{const source=readFileSync(resolve(root,path),'utf8');return {path,source,sha256:hash(source)};});for(const row of inputs)if(hash(readFileSync(resolve(root,row.path)))!==row.sha256)fail('complete current source input changed');
 return {schema:'whole-owner-proof-byte-original-twelve-trial-source-v1',typescriptVersion:ts.version,birthProducer:birth,inputs,files:[{path:OUTPUT,before,language:before,after,current:existsSync(resolve(root,OUTPUT))?readFileSync(resolve(root,OUTPUT),'utf8'):null,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:first.meta,afterMeta,sequence,inverseSequence,inverse:before,trace:run.trace,nativeBindings,imports,schemaEdits,preserved}],productionSelected:false,originalTestChanged:false,originalLimitsChanged:false,performanceQualified:false,runtimeExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);if(rest.length||!['--emit','--write','--check'].includes(mode))fail('use --emit|--write|--check');const plan=prepareWholeOwnerProofByteOriginalTrial();
 if(mode==='--write')for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);else if(mode==='--check'&&plan.files.some(row=>row.current!==row.after))fail('complete proof byte original-twelve harness stale or ungenerated');console.log(JSON.stringify(mode==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),runtimeExecuted:false,performanceQualified:false}));
}
