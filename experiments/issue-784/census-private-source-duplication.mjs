// Bounded diagnostic over the complete previously observed physical closure.
// No proposed source, compiler execution, or semantic authority is produced.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const ts=createRequire(new URL('../../js/package.json',import.meta.url))('typescript');
if(ts.version!=='5.9.3')throw Error('Installed TypeScript 5.9.3 required');
const census=JSON.parse(gunzipSync(readFileSync('ci-logs/issue-784-restart-2/current-private-closure-census-2.json.gz'),{maxOutputLength:4*1024*1024}));
if(census.originalSources.length>512)throw Error('Finite physical module bound');
const bodies=new Map(),files=[],largeLiterals=[];
const hash=text=>createHash('sha256').update(text).digest('hex');
for(const row of census.originalSources){
 const source=readFileSync(row.path,'utf8');
 if(Buffer.byteLength(source)>1024*1024)throw Error('Finite whole-file bound: '+row.path);
 const file=ts.createSourceFile(row.path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)throw Error('Complete native source parse failed: '+row.path);
 let comments=0;const scanner=ts.createScanner(ts.ScriptTarget.Latest,false,ts.LanguageVariant.Standard,source);
 for(let kind=scanner.scan();kind!==ts.SyntaxKind.EndOfFileToken;kind=scanner.scan())if(kind===ts.SyntaxKind.SingleLineCommentTrivia||kind===ts.SyntaxKind.MultiLineCommentTrivia)comments+=scanner.getTextPos()-scanner.getTokenPos();
 const printed=ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed}).printFile(file);
 files.push({path:row.path,bytes:Buffer.byteLength(source),sha256:hash(source),priorCensusSha256:row.sha256,commentCodeUnits:comments,nativePrintedBytes:Buffer.byteLength(printed)});
 function literals(node){
  if((ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))&&node.end-node.getStart(file)>4096){
   const text=node.getText(file);largeLiterals.push({path:row.path,span:[node.getStart(file),node.end],bytes:Buffer.byteLength(text),parent:ts.SyntaxKind[node.parent.kind],name:ts.isVariableDeclaration(node.parent)&&ts.isIdentifier(node.parent.name)?node.parent.name.text:null,sha256:hash(text)});
  }
  ts.forEachChild(node,literals);
 }
 literals(file);
 for(const statement of file.statements){
  if(!ts.isFunctionDeclaration(statement)||!statement.body)continue;
  const text=statement.body.getText(file);if(text.length<160)continue;
  const key=hash(text),group=bodies.get(key)??{sha256:key,bodyBytes:Buffer.byteLength(text),functions:[]};
  group.functions.push({path:row.path,name:statement.name?.text??null,span:[statement.getStart(file),statement.end]});bodies.set(key,group);
 }
}
const repeated=[...bodies.values()].filter(row=>row.functions.length>1).sort((a,b)=>b.bodyBytes*(b.functions.length-1)-a.bodyBytes*(a.functions.length-1));
const result={schema:'prior-physical-private-source-duplication-diagnostic-v1',typescript:ts.version,files,repeated,largeLiterals:largeLiterals.sort((a,b)=>b.bytes-a.bytes),currentImportGraphRecomputed:false,semanticAuthority:false};
const raw=Buffer.from(JSON.stringify(result)+'\n'),packed=gzipSync(raw,{mtime:0});
if(!gunzipSync(packed).equals(raw))throw Error('Complete compressed readback differs');
const output=process.argv[2]??'ci-logs/issue-784-restart-2/current-private-source-duplication.json.gz';
if(!/^ci-logs\/issue-784-restart-2\/[a-z0-9-]+\.json\.gz$/u.test(output))throw Error('Diagnostic output path required');
writeFileSync(output,packed,{flag:'wx'});
console.log(JSON.stringify({modules:files.length,bytes:files.reduce((sum,row)=>sum+row.bytes,0),commentCodeUnits:files.reduce((sum,row)=>sum+row.commentCodeUnits,0),duplicateBodyBytes:repeated.reduce((sum,row)=>sum+row.bodyBytes*(row.functions.length-1),0),largestDuplicates:repeated.slice(0,18)}));
