// Copies complete actual private checker/emitter/document sources. Explicit
// candidate only; no default module or generated artifact is hand edited.
import {readFileSync,writeFileSync,existsSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from '../source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/js-to-rust/';
const copies=[['owned-core-source.mjs','owned-vector-candidate-source.mjs'],['owned-core-operations.mjs','owned-vector-candidate-operations.mjs'],['owned-core-document.mjs','owned-vector-candidate-document.mjs']];
const fail=message=>{throw TypeError('Owned vector candidate source: '+message);},hash=source=>createHash('sha256').update(source).digest('hex');
const support='./owned-vector-candidate-support.mjs';
function read(root,path){const file=resolve(root,path),state=lstatSync(file);if(!state.isFile()||state.isSymbolicLink()||state.size>32*1024*1024)fail('bounded complete physical source required');return readFileSync(file,'utf8');}
function syntax(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native source grammar differs');return file;}
export function prepareOwnedVectorCandidateSources({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3'||createRequire(resolve(root,'js/package.json'))('typescript')!==ts)fail('this actual source root installed TypeScript5.9.3 required');const inputs=copies.map(([name])=>({path:BASE+name,source:read(root,BASE+name)})),helper=read(root,BASE+'owned-vector-candidate-support.mjs'),files=[];
 for(const [index,[originalName,candidateName]]of copies.entries()){
  const before=inputs[index].source,path=BASE+candidateName,edits=[];let language=before;
  function once(source,old,value,id){if(source.split(old).length!==2)fail('unique complete actual source anchor required: '+id);edits.push({id,before:old,after:value});return source.replace(old,()=>value);}
  function declaration(name,run){const parsed=syntax(ts,path,language),rows=parsed.statements.filter(row=>ts.isFunctionDeclaration(row)&&row.name?.text===name);if(rows.length!==1)fail('unique actual complete function required: '+name);const row=rows[0],body=row.getText(parsed),changed=run(body);language=language.slice(0,row.getStart(parsed))+changed+language.slice(row.end);}
  let imported='';
  if(index===0){
   declaration('createOwnedCoreSourceContext',body=>once(body,"exactKeys(data,['files','runtimeRoot','declarationRoot'])","exactKeys(data,['files','runtimeRoot','declarationRoot','vectorBindings'])",'candidate:explicit-source-binding-schema'));
   declaration('originalOwnedCoreModule',body=>once(body,'runtimeRoot:state.data.runtimeRoot};','runtimeRoot:state.data.runtimeRoot,vectorProfiles:captureOriginalOwnedVectorProfiles(state.data,path)};','candidate:fresh-complete-forward-carrier-per-native-traversal'));
   declaration('analyzeOriginalOwnedCoreSource',body=>{let value=once(body,' const functions=file.statements.filter(ts.isFunctionDeclaration);',' try{\n const functions=file.statements.filter(ts.isFunctionDeclaration);','candidate:invocation-local-profile-lifetime');return once(value,'requireOwnedCoreSourceCurrent(context);return {program,diagnostics,items,source,path};','requireOwnedCoreSourceCurrent(context);return {program,diagnostics,items,source,path};\n }finally{analysis.vectorProfiles?.clear();}','candidate:clear-all-private-forward-profiles-on-every-exit');});
   declaration('checkFunction',body=>once(body,' const tick=depth=>'," const vectorCandidate=checkOriginalOwnedVectorFunction(path,declaration,analysis,paired,name);if(vectorCandidate)return vectorCandidate;\n const tick=depth=>",'candidate:actual-private-original-function-dispatch'));
   imported="import {captureOriginalOwnedVectorProfiles,checkOriginalOwnedVectorFunction} from '"+support+"';\n";
  }else if(index===1){
   language=once(language,'const TS_TYPES={...ownedBase64TypeScriptTypes,','const TS_TYPES={...ownedVectorCandidateTypeScriptTypes,...ownedBase64TypeScriptTypes,','candidate:paired-primitive-vector-typescript-domain');
   language=once(language,'const RUST_TYPES={...ownedBase64RustTypes,','const RUST_TYPES={...ownedVectorCandidateRustTypes,...ownedBase64RustTypes,','candidate:genuine-primitive-vector-rust-domain');
   declaration('emitOwnedCoreProgram',body=>once(body,"  switch(value.kind){","  switch(value.kind){\n   case 'owned-vector-list':return emitOwnedVectorCandidateLiteral(value,rust);",'candidate:checked-owned-vector-emission'));
   declaration('evaluateOwnedCoreProgram',body=>once(body,"  switch(value.kind){","  switch(value.kind){\n   case 'owned-vector-list':return evaluateOwnedVectorCandidateLiteral(value);",'candidate:independent-fresh-list-evaluation'));
   imported="import {ownedVectorCandidateTypeScriptTypes,ownedVectorCandidateRustTypes,emitOwnedVectorCandidateLiteral,evaluateOwnedVectorCandidateLiteral} from '"+support+"';\n";
  }else{language=once(language,"const PROFILE='router-owned-core-source-document-v1'","const PROFILE='router-owned-vector-source-candidate-document-v1'",'candidate:distinct-checked-document-profile');}
  const parsed=syntax(ts,path,language),specifiers=parsed.statements.filter(ts.isImportDeclaration).filter(row=>ts.isStringLiteral(row.moduleSpecifier)&&copies.some(([old])=>row.moduleSpecifier.text==='./'+old)).map(row=>({node:row.moduleSpecifier,target:'./'+copies.find(([old])=>row.moduleSpecifier.text==='./'+old)[1]})),relocations=[];let after=language;
  for(const {node,target}of specifiers.sort((a,b)=>b.node.getStart(parsed)-a.node.getStart(parsed))){const old=node.getText(parsed),replacement=JSON.stringify(target);relocations.push({span:[node.getStart(parsed),node.end],before:old,after:replacement});after=after.slice(0,node.getStart(parsed))+replacement+after.slice(node.end);}
  after=imported+after;if(after.split('\n').length>=1000)fail('candidate module must remain below1000lines');syntax(ts,path,after);const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,path),after),rule=(old,value,id)=>({id,edits:[{span:[0,old.length],expected:old,replacement:value}]}),sequence={languageRules:[rule(before,language,'javascript:copy-actual-whole-private-checker-vector-extension')],repositoryRules:[rule(language,after,'router:distinct-vector-candidate-private-import-closure')]};
  const first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),applied=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(applied.value),last=transportConcreteSyntaxMeta(afterMeta);if(last.source!==after)fail('complete source/CST reparse differs');
  const inverse=applyConcreteSyntaxSubstitutions(last.document,{languageRules:[rule(after,before,'javascript:restore-whole-actual-original-module')],repositoryRules:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==before)fail('whole original source inverse differs');
  let restored=after.slice(imported.length);for(const row of [...relocations].reverse())restored=restored.replace(row.after,()=>row.before);for(const row of [...edits].reverse())restored=restored.replace(row.after,()=>row.before);if(restored!==before)fail('actual complete textual inverse differs');
  files.push({path,originalPath:BASE+originalName,before,beforeSha256:hash(before),language,after,afterSha256:hash(after),beforeMeta:first.meta,afterMeta,sequence,edits,relocations,trace:applied.trace,inverse:restored,nativeBindings,current:existsSync(resolve(root,path))?read(root,path):null});
 }
 for(const input of inputs)if(read(root,input.path)!==input.source)fail('actual original source changed during preparation');if(read(root,BASE+'owned-vector-candidate-support.mjs')!==helper)fail('actual candidate support changed');
 return {schema:'owned-vector-private-source-candidate-v1',typescriptVersion:ts.version,inputs:[...inputs,{path:BASE+'owned-vector-candidate-support.mjs',source:helper}],files,defaultAPIsUnchanged:true,productionSelected:false,sourceAuthority:false,runtimeParity:false,rustExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))fail('use --emit|--write|--check');const result=prepareCurrentOwnedVectorCandidateSources();if(args[0]==='--emit')console.log(JSON.stringify(result));else if(args[0]==='--write'){for(const row of result.compilerFiles)writeFileSync(resolve(ROOT,row.path),row.currentAfter??row.after);console.log('Prepared distinct vector candidate private source closure; defaults unchanged.');}else{if(result.compilerFiles.some(row=>row.current!==(row.currentAfter??row.after)))fail('actual candidate source closure is stale or ungenerated');console.log('Complete vector candidate source closure is current.');}}

import {prepareCurrentOwnedVectorCandidateSources} from './prepare-current-owned-vector-candidate.mjs';
export {prepareCurrentOwnedVectorCandidateSources};
