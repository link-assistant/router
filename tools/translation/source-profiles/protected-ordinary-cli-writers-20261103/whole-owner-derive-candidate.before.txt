// Complete actual source copies; this never installs a default creator.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),BASE='tools/translation/',PROFILE=BASE+'source-profiles/attribute-owner-bulk/node-v20.19.4/';
const names=['derive-bang-context.mjs','builtin-derive-bang-footprints.mjs','serde-bang-footprints.mjs','serde-deserialize-bang-footprints.mjs','clap-args-bang-footprints.mjs','clap-value-enum-bang-footprints.mjs','schemars-bang-footprints.mjs'],copies=names.map(name=>[name,'whole-owner-'+name.replace(/\.mjs$/u,'-candidate.mjs')]);
const pins={'crypto.js':'9a6dc75b3111a4d9926a58d977da58b80769010287ee5cd5ed9c558d6921615c','hash.js':'59b744195f7fec218207f7083ff420350534ebdd1a9674fc4998334c0704f191','LICENSE.gz':'42f4c42dcd1d51c0d1283df6178ac66f99e157639a6171e5e77676634c425c35'};
const fail=message=>{throw TypeError('Whole owner candidate source: '+message);},hash=source=>createHash('sha256').update(source).digest('hex');
function unique(rows,message){if(rows.length!==1)fail(message);return rows[0];}
function once(source,before,after){if(source.split(before).length!==2)fail('one complete original source anchor required: '+before);return source.replace(before,()=>after);}
function syntax(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('actual complete native source grammar differs: '+path);return file;}
function fn(ts,file,name){return unique(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),'one actual complete function required: '+name);}
export function prepareWholeOwnerDeriveCandidate({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3'||createRequire(resolve(root,'js/package.json'))('typescript')!==ts)fail('actual source root installed TypeScript5.9.3 required');const inputs=[],files=[],raw=new Map();
 for(const name of Object.keys(pins)){const bytes=readFileSync(resolve(root,PROFILE+name));if(bytes.length>524288||hash(bytes)!==pins[name])fail('complete official source/license pin differs');raw.set(name,bytes);inputs.push({path:PROFILE+name,bytes:bytes.length,sha256:hash(bytes),base64:bytes.toString('base64')});}
 const license=gunzipSync(raw.get('LICENSE.gz'),{maxOutputLength:524288});if(hash(license)!=='3716cab1c1ca53b1be9481b6d20bd8e00a4b9561d1b77427fd95e17aad6fc17e')fail('complete upstream license transport differs');
 for(const [name]of copies){const source=readFileSync(resolve(root,BASE+name),'utf8');inputs.push({path:BASE+name,source,sha256:hash(source)});raw.set(name,source);}
 for(const name of ['attribute-owner-bulk-operation.mjs','attribute-owner-bulk-crypto.mjs']){const source=readFileSync(resolve(root,BASE+name),'utf8');inputs.push({path:BASE+name,source,sha256:hash(source)});}
 const cryptoFile=syntax(ts,PROFILE+'crypto.js',raw.get('crypto.js').toString('utf8')),hashFile=syntax(ts,PROFILE+'hash.js',raw.get('hash.js').toString('utf8')),functionSources={createHash:fn(ts,cryptoFile,'createHash').getText(cryptoFile),Hash:fn(ts,hashFile,'Hash').getText(hashFile)},nativeProfiles=[];
 for(const name of ['copy','_transform','_flush','update','digest']){const rows=[];function visit(node){if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.EqualsToken&&node.left.getText(hashFile)==='Hash.prototype.'+name&&ts.isFunctionExpression(node.right))rows.push(node.right);ts.forEachChild(node,visit);}visit(hashFile);const node=unique(rows,'actual complete original Hash member required: '+name);functionSources[name]=node.getText(hashFile);nativeProfiles.push({name,source:node.getText(hashFile),span:[node.getStart(hashFile),node.end]});}
 const profileSource='// Generated from complete pinned official Node v20.19.4 sources; immutable primitive DATA only.\n'+Object.entries(functionSources).map(([name,source])=>'export const '+name+'='+JSON.stringify(source)+';').join('\n')+'\n';
 function whole(path,before,language,after,changes){
  if(after.split('\n').length>=1000)fail('candidate source must remain below1000lines');syntax(ts,path,after);const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,path),after),rule=(old,value,id)=>({id,edits:[{span:[0,old.length],expected:old,replacement:value}]}),sequence={languageRules:[rule(before,language,'javascript:complete-source-whole-owner-operation')],repositoryRules:[rule(language,after,'router:separate-whole-owner-private-module-closure')]},first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),run=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);if(last.source!==after)fail('whole source CST serialization/reparse differs');const restored=applyConcreteSyntaxSubstitutions(last.document,{languageRules:[rule(after,before,'javascript:restore-complete-original-owner-module')],repositoryRules:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(restored.value)).source!==before)fail('whole original source inverse differs');files.push({path,before,language,after,current:existsSync(resolve(root,path))?readFileSync(resolve(root,path),'utf8'):null,beforeMeta:first.meta,afterMeta,sequence,trace:run.trace,inverse:before,nativeBindings,changes});
 }
 for(const [index,[name,target]]of copies.entries()){
  const before=raw.get(name),path=BASE+target,parsed=syntax(ts,BASE+name,before),changes=[];let language=before;
  if(name==='serde-bang-footprints.mjs'){
   const attribute=fn(ts,parsed,'attributeOwners'),source=attribute.getText(parsed),statements=[...attribute.body.statements],cached=statements.slice(1,4);if(cached.length!==3||cached[0].declarationList?.declarations[0]?.name.getText(parsed)!=='cached'||!ts.isIfStatement(cached[1])||cached[2].declarationList?.declarations[0]?.name.getText(parsed)!=='{bindings}')fail('actual original binding-program capture layout differs');
   const cacheStart=cached[0].getStart(parsed)-attribute.getStart(parsed),cacheEnd=cached[2].end-attribute.getStart(parsed);let batch=source.slice(0,cacheStart)+'const current=wholeOwnerOperation.current(original.context);\n  const {bindings}=current;'+source.slice(cacheEnd);
   batch=once(once(once(batch,'function attributeOwners(','function attributeOwnersForWholeSourceOperation('),'  original=assertDeriveFootprintOriginalSelection(original,certificate);','  if(!wholeOwnerOperation.active())return attributeOwners(original,certificate,names);\n  original=assertDeriveFootprintOriginalSelection(original,certificate);'),'hash(cached.canonical!==null&&originalJsonIntrinsicsUnchanged()?cached.canonical:JSON.stringify(bindings))','current.digest');
   const calls=[];function visit(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='attributeOwners'&&!(node.getStart(parsed)>=attribute.getStart(parsed)&&node.end<=attribute.end))calls.push(node.expression);ts.forEachChild(node,visit);}visit(parsed);
   for(const node of calls.sort((a,b)=>b.getStart(parsed)-a.getStart(parsed)))language=language.slice(0,node.getStart(parsed))+'attributeOwnersForWholeSourceOperation'+language.slice(node.end);
   language+='\nconst wholeOwnerOperation=createOriginalAttributeOwnerBulkOperation();\n'+batch+'\nexport function withWholeOriginalAttributeOwnerOperation(context,run,fallback){return wholeOwnerOperation.run(context,run,fallback);}\n';changes.push({originalAttributeOwnerSource:source,batchSource:batch,legacySingleOwnerUnchanged:true});
  }
  if(index===0){
   const creator=fn(ts,parsed,'createUnscopedDeriveBangContext'),source=creator.getText(parsed);let fresh=once(once(once(source,'export function createUnscopedDeriveBangContext(','function createWholeOwnerUnscopedDeriveBangContext('),'  if(cachedContexts.has(deriveContext))return cachedContexts.get(deriveContext);\n',''),'cachedContexts.set(deriveContext,context);return context;','return context;');
   language+='\n'+fresh+'\nexport function createWholeOwnerDeriveBangContext({deriveContext}={}){return withRetainedPrivateNativeProofCostScope(()=>withWholeOriginalAttributeOwnerOperation(deriveContext,()=>createWholeOwnerUnscopedDeriveBangContext({deriveContext}),()=>createUnscopedDeriveBangContext({deriveContext})));}\n';changes.push({originalCreatorSource:source,freshCreatorSource:fresh,oldCreatorsUnchanged:true,newContextCache:false});
  }
  const current=syntax(ts,path,language),edits=[];
  for(const statement of current.statements)if(ts.isImportDeclaration(statement)&&ts.isStringLiteral(statement.moduleSpecifier)){
   const pair=copies.find(([old])=>statement.moduleSpecifier.text==='./'+old);if(!pair)continue;let replacement=statement.getText(current).replace(statement.moduleSpecifier.getText(current),()=>JSON.stringify('./'+pair[1]));
   if(pair[0]==='serde-bang-footprints.mjs'&&statement.importClause?.namedBindings&&ts.isNamedImports(statement.importClause.namedBindings))for(const specifier of statement.importClause.namedBindings.elements)if((specifier.propertyName??specifier.name).text==='attributeOwners')replacement=replacement.replace(specifier.getText(current),()=>'attributeOwnersForWholeSourceOperation as '+specifier.name.text);
   edits.push({span:[statement.getStart(current),statement.end],expected:statement.getText(current),replacement});
  }
  let after=language;for(const edit of edits.sort((a,b)=>b.span[0]-a.span[0]))after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);
  if(name==='serde-bang-footprints.mjs')after="import {createOriginalAttributeOwnerBulkOperation} from './attribute-owner-bulk-operation.mjs';\n"+after;
  if(index===0)after="import {withWholeOriginalAttributeOwnerOperation} from './whole-owner-serde-bang-footprints-candidate.mjs';\n"+after;
  whole(path,before,language,after,{semantic:changes,imports:edits});
 }
 whole(BASE+'attribute-owner-bulk-crypto-source.mjs',raw.get('hash.js').toString('utf8'),profileSource,profileSource,{nativeProfiles,createHash:{source:functionSources.createHash,sourcePath:PROFILE+'crypto.js'},Hash:{source:functionSources.Hash,sourcePath:PROFILE+'hash.js'},license:{path:PROFILE+'LICENSE.gz',originalSha256:hash(license)}});
 for(const input of inputs){const actual=readFileSync(resolve(root,input.path));if(hash(actual)!==input.sha256)fail('complete actual source input changed');}
 return {schema:'whole-owner-derive-source-candidate-v1',typescriptVersion:ts.version,inputs,files,originalDefaultsUnchanged:true,originalSingleOwnerAPIsUnchanged:true,newAcrossInvocationSourceOrOwnerCache:false,scope:'one complete synchronous original owner-list operation',performanceQualified:false,sourceAuthority:false,runtimeAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))fail('use --emit|--write|--check');const result=prepareWholeOwnerDeriveCandidate();if(args[0]==='--emit')console.log(JSON.stringify(result));else if(args[0]==='--write'){for(const row of result.files)writeFileSync(resolve(ROOT,row.path),row.after);console.log('Prepared separate whole-owner source closure; old defaults unchanged.');}else{if(result.files.some(row=>row.current!==row.after))fail('complete whole-owner source closure is stale or ungenerated');console.log('Complete whole-owner source equations are current.');}}
