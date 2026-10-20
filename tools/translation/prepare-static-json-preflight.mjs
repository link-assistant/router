// Source preparation only. The preflight can reject; every accepted packet
// still receives the original full metadata, canonical CST and boundary checks.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Static JSON preflight source: '+message);};
function once(source,before,after){if(source.split(before).length!==2)fail('unique complete source anchor required');return source.replace(before,()=>after);}
const WRAPPER=`
// A bounded selection optimization only. Noncanonical/deep JSON declines;
// the caller retains its complete original native operation in that case.
export function projectCanonicalJsonStringFields(source,patterns){
 if(typeof source!=='string'||source.length>268435456||!Array.isArray(patterns)||patterns.length>16||Object.keys(patterns).length!==patterns.length)throw TypeError('Bounded complete JSON and string-field paths required');
 for(const pattern of patterns)if(!Array.isArray(pattern)||pattern.length<1||pattern.length>16||Object.keys(pattern).length!==pattern.length||pattern.some(part=>typeof part!=='string'||part.length>256))throw TypeError('Bounded string-field paths required');
 const suffix=source.endsWith('\\n')?'\\n':'',body=suffix?source.slice(0,-1):source,omissions=[];
 const select=path=>patterns.some(pattern=>pattern.length===path.length&&pattern.every((part,index)=>part==='*'||part===path[index]));
 if(!scanCanonicalJsonProjection(body,omissions,select))return null;
 const parts=[];let at=0;
 for(const row of omissions){const [start,end]=row.span;parts.push(body.slice(at,start),'null');at=end;}
 parts.push(body.slice(at),suffix);return {source:parts.join(''),omissions};
}
`;
function grammar(ts,path,source){const sf=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(sf.parseDiagnostics.length)fail('complete native grammar: '+path);return sf;}
function proposal(ts,path,original,language,after,before){
 for(const text of [original,language,after])grammar(ts,path,text);
 const stage=(a,b,id)=>({id,edits:[{span:[0,a.length],expected:a,replacement:b}]}),beforeMeta=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(original,{language:'JavaScript'}).document),first=transportConcreteSyntaxMeta(beforeMeta);
 if(first.source!==original)fail('complete original CST differs');
 const sequence={languageRules:[stage(original,language,'javascript:copy-complete-original-JSON-or-metadata-checker')],repositoryRules:[stage(language,after,'router:attach-bounded-reject-only-source-bank-preflight')]},run=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);
 if(last.source!==after)fail('complete proposed CST differs');
 const inverse=applyConcreteSyntaxSubstitutions(last.document,{languageRules:[stage(after,original,'javascript:restore-complete-original-source')],repositoryRules:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==original)fail('complete inverse differs');
 return {path,before,original,language,after,beforeMeta,afterMeta,sequence,trace:run.trace,inverse:original,originalSha256:hash(original),afterSha256:hash(after)};
}
export function prepareStaticJsonPreflight({root=ROOT}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 const parserPath='tools/translation/canonical-json-text.mjs',parserSource=readFileSync(resolve(root,parserPath),'utf8'),parserFile=grammar(ts,parserPath,parserSource),found=parserFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='canonicalSyntax');if(found.length!==1)fail('one complete original JSON scanner required');
 const originalScanner=found[0].getText(parserFile);let scanner=originalScanner;
 const scannerRules=[
  ['function canonicalSyntax(source,syntaxOnly=false){','function scanCanonicalJsonProjection(source,omissions,select){\n const syntaxOnly=false;'],
  ['function value(depth){','function value(depth,path){'],
  ['if(code===34){string();return;}','if(code===34){const begin=at;string();if(select(path))omissions.push({path:[...path],span:[begin,at]});return;}'],
  ['white();if(source.charCodeAt(at++)!==58)stop();value(depth+1);white();','white();if(source.charCodeAt(at++)!==58)stop();value(depth+1,[...path,name]);white();'],
  ['while(at<source.length){value(depth+1);white();const separator=source.charCodeAt(at++);','let index=0;\n   while(at<source.length){value(depth+1,[...path,index++]);white();const separator=source.charCodeAt(at++);'],
  ['try{value(0);white();','try{value(0,[]);white();'],
 ];for(const [before,after]of scannerRules)scanner=once(scanner,before,after);
 const projectionPath='tools/translation/canonical-json-projection.mjs',projection='// Generated by prepare-static-json-preflight.mjs from the complete original scanner.\n// DATA projection only; no source, canonical-CST or semantic authority.\n'+scanner+'\n'+WRAPPER;
 let projectionBefore='';try{projectionBefore=readFileSync(resolve(root,projectionPath),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 const readerPath='tools/translation/test/real-source-fixtures.mjs',current=readFileSync(resolve(root,readerPath),'utf8'),imported="import {projectCanonicalJsonStringFields} from '../canonical-json-projection.mjs';\nimport {originalBatchedNamespaceTraversalIntrinsicsUnchanged,originalPrivateParserIngressUnchanged} from '../original-json-intrinsics.mjs';\nimport {originalBatchedLexingIntrinsicsUnchanged} from '../original-lexing-intrinsics.mjs';\n",marker='\n// Generated explicit preflight DATA reader; every original public reader stays unchanged.\n';
 let original=current;
 if(original.includes(marker)){
  original=original.slice(0,original.indexOf(marker));original=once(original,imported,'');
 }
 const originalFile=grammar(ts,readerPath,original),readers=originalFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='readStaticSourceLifecycle');if(readers.length!==1)fail('one complete original reader required');
 const body=readers[0].getText(originalFile),start=body.indexOf('  if(bundle.schema'),end=body.indexOf('  // Reject malformed complete metadata/source equations');if(start<0||end<=start)fail('complete original metadata prefix required');
 const originalMetadata=body.slice(start,end),canonicalCheck="if(typeof original.canonical!=='string'||typeof latest.canonical!=='string')staticError('both changed-parent canonical documents required');",metadata=once(originalMetadata,canonicalCheck,"if(!canonicalRows.has(before.sourceId)||!canonicalRows.has(after.sourceId))staticError('both changed-parent canonical documents required');");
 const preflight=marker+`// This separate reader permits additional metadata hash/JSON calls. It stores
// no verdicts and never substitutes for original source or semantic authority.
function preflightStaticArchiveData(raw,index){
  if(Object.hasOwn(index,'storage')||!originalBatchedNamespaceTraversalIntrinsicsUnchanged()||!originalBatchedLexingIntrinsicsUnchanged()||!originalPrivateParserIngressUnchanged())return;
  const projection=projectCanonicalJsonStringFields(text(raw),[['sources','*','canonical']]);
  if(projection===null)return;
  const bundle=JSON.parse(projection.source),canonicalRows=new Set(projection.omissions.map(row=>row.path[1]));
`+metadata+'}\n';
 const archiveNodes=originalFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='readStaticArchiveData');if(archiveNodes.length!==1)fail('one complete original archive reader required');
 let archive=once(archiveNodes[0].getText(originalFile),'function readStaticArchiveData(folder){','function readStaticArchiveDataPreflight(folder){');
 archive=once(archive,'  const bundle=decodeStaticSourceStorage(raw,index);return {index,bundle};','  preflightStaticArchiveData(raw,index);\n  const bundle=decodeStaticSourceStorage(raw,index);return {index,bundle};');
 const copiedReader=once(once(body,'export function readStaticSourceLifecycle(','export function readStaticSourceLifecyclePreflight('),'readStaticArchiveData(folder)','readStaticArchiveDataPreflight(folder)');
 const language=original+preflight+archive+'\n'+copiedReader+'\n',after=imported+language;
 if(current!==original&&current!==after)fail('unexpected complete current reader');
 const consumerPath='tools/translation/test/static-source-lifecycle.test.mjs',consumer=readFileSync(resolve(root,consumerPath),'utf8'),consumerFile=grammar(ts,consumerPath,consumer),imports=consumerFile.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./real-source-fixtures.mjs');if(imports.length!==1)fail('one complete receiving reader import required');
 const elements=imports[0].importClause?.namedBindings?.elements?.filter(node=>node.name.text==='readStaticSourceLifecycle');if(elements?.length!==1)fail('one receiving reader binding required');
 const element=elements[0],selected=element.getText(consumerFile),plain='readStaticSourceLifecycle',adapted='readStaticSourceLifecyclePreflight as readStaticSourceLifecycle';if(selected!==plain&&selected!==adapted)fail('unexpected receiving reader binding');
 const replace=text=>consumer.slice(0,element.getStart(consumerFile))+text+consumer.slice(element.end),consumerOriginal=replace(plain),consumerAfter=replace(adapted);
 const files=[proposal(ts,projectionPath,originalScanner,scanner,projection,projectionBefore),proposal(ts,readerPath,original,language,after,current),proposal(ts,consumerPath,consumerOriginal,consumerOriginal,consumerAfter,consumer)];
 return {schema:'static-canonical-string-preflight-source-v1',files,originalScanner:{path:parserPath,source:parserSource,declaration:originalScanner},originalMetadata,metadata,scannerRules,existingCompleteReaderBodyUnchanged:true,allOriginalPublicReaderBodiesUnchanged:true,additionalMetadataCallbackContract:true,originalLimitsUnchanged:true,newCaches:false,sourceAuthority:false,runtimeAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))fail('Usage: prepare-static-json-preflight.mjs --emit|--check');
 const result=prepareStaticJsonPreflight();if(args[0]==='--check'){if(result.files.some(row=>row.before!==row.after))fail('complete installed preflight sources are stale');console.log('Complete static JSON preflight source producer is current; no compiler authority.');}else console.log(JSON.stringify(result));
}
