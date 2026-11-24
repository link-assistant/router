// Reuse the independently checked native-span fixture loader. Source DATA only.
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ORIGINAL='tools/translation/source-profiles/receiving-relocator/original-function.mjs';
const IMPORT="import {relocateSourceModule} from './relocate-source-module.mjs';\n";
const CURRENT=`function relocate(source,original,overrides={}){
 const result=relocateSourceModule(source,original.href,new Map(Object.entries(overrides)));
 assert.equal(result.inverse,source);
 return {text:result.text,edits:result.mapping};
}`;
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Receiving module relocator source: '+message);};
function grammar(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar: '+path);return file;}
export function prepareReceivingModuleRelocators({root=ROOT}={}){
 const original=readFileSync(resolve(root,ORIGINAL),'utf8');
 if(original.length!==755||hash(original)!=='07fa137c6cca3ada168c27620e14cfdcea7f141054995dab3911717b0052143d')fail('complete copied original function differs');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');const files=[];
 for(const name of readdirSync(resolve(root,'tools/translation/test')).sort()){
  if(!name.endsWith('.test.mjs'))continue;const path='tools/translation/test/'+name,source=readFileSync(resolve(root,path),'utf8');
  if(!source.includes(original)&&!source.includes(CURRENT))continue;
  const syntax=grammar(ts,path,source),functions=syntax.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='relocate');
  if(functions.length!==1)fail('unique original receiving function required');const node=functions[0],body=node.getText(syntax);
  if(body!==original&&body!==CURRENT)fail('unexpected complete relocator');
  let before,after;
  if(body===original){
   if(source.includes(IMPORT))fail('mixed receiving formats');before=source;after=IMPORT+source.slice(0,node.getStart(syntax))+CURRENT+source.slice(node.end);
  }else{
   if(!source.startsWith(IMPORT)||source.indexOf(IMPORT,IMPORT.length)!==-1)fail('complete current native loader import required');
   after=source;before=(source.slice(0,node.getStart(syntax))+original+source.slice(node.end)).slice(IMPORT.length);
  }
  grammar(ts,path,before);grammar(ts,path,after);
  if(before.split(original).length!==2)fail('unique complete original declaration required');
  const language=before.replace(original,()=>CURRENT);if(IMPORT+language!==after)fail('separate language and repository equations differ');
  const first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),sequence={languageRules:[{id:'javascript:replace-ambiguous-regex-import-inverse-with-native-spans',edits:[{span:[0,before.length],expected:before,replacement:language}]}],repositoryRules:[{id:'receiving:reuse-qualified-module-relocation-helper',edits:[{span:[0,language.length],expected:language,replacement:after}]}]};
  const run=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value);if(transportConcreteSyntaxMeta(afterMeta).source!==after)fail('whole output CST differs');
  const inverse=applyConcreteSyntaxSubstitutions(run.value,{languageRules:[{id:'javascript:restore-complete-original-receiving-source',edits:[{span:[0,after.length],expected:after,replacement:before}]}],repositoryRules:[]});
  if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==before)fail('complete original inverse differs');
  files.push({path,before:source,original:before,after,originalSha256:hash(before),afterSha256:hash(after),nativeFunctionSpan:[node.getStart(syntax),node.end],beforeMeta:serializeConcreteSyntaxMeta(first.document),afterMeta,sequence,trace:run.trace,inverse:before});
 }
 if(!files.length||files.length>64)fail('bounded nonempty source family required');
 return {schema:'complete-native-receiving-relocator-source-v1',files,originalFunction:original,copiedHelper:'tools/translation/test/relocate-source-module.mjs',originalCaseBodiesAndDeadlinesUnchanged:true,sourceAuthority:false,runtimeAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))fail('Usage: prepare-receiving-module-relocators.mjs --emit|--check');
 const result=prepareReceivingModuleRelocators();if(args[0]==='--check'){if(result.files.some(row=>row.before!==row.after))fail('receiving relocators are stale');console.log('Complete receiving relocators reproduce the native-span loader; no compiler authority.');}else console.log(JSON.stringify(result));
}
