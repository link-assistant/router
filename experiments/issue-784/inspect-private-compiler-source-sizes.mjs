// Draft static-source census only: no execution, equivalence, or parity proof.
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {posix,resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const require=createRequire(resolve('js/package.json')),ts=require('typescript');
if(ts.version!=='5.9.3')throw Error('lockfile compiler required');
const pending=['tools/translation/extensions/host-contracts.mjs','tools/translation/project.mjs',
 'tools/translation/translate.mjs','tools/translation/semantic-meta.mjs',
 ...['rust.js','check.js','emit-javascript.js'].map(name=>'tools/translation/vendor/meta-language/translation/'+name)];
const seen=new Map(),bodies=new Map(),literalGroups=new Map();let total=0;
while(pending.length){
 const path=pending.shift();if(seen.has(path))continue;
 if(seen.size>=512)throw Error('finite file bound');
 const raw=readFileSync(path),source=raw.toString('utf8');total+=raw.length;
 if(total>16777216)throw Error('finite inspection byte bound');
 if(!Buffer.from(source).equals(raw))throw Error('complete UTF8 required');
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS);
 const imports=[],literals=[],bindings=[],identifiers=new Map(),privateDeclarations=[];
 for(const node of file.statements){
  if(!(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)&&node.moduleSpecifier))continue;
  const spec=node.moduleSpecifier;if(!ts.isStringLiteral(spec))throw Error('literal static import required');
  if(ts.isImportDeclaration(node)&&node.importClause){
   const clause=node.importClause;
   if(clause.name)bindings.push({name:clause.name.text,specifier:spec.text});
   const named=clause.namedBindings;
   if(named){
    if(ts.isNamespaceImport(named))bindings.push({name:named.name.text,specifier:spec.text});
    else for(const binding of named.elements)bindings.push({name:binding.name.text,specifier:spec.text});
   }
  }
  if(spec.text.startsWith('.')){
   const target=posix.normalize(posix.join(posix.dirname(path),spec.text));
   if(target.startsWith('../')||target.startsWith('/'))throw Error('relative repository source required');
   imports.push(target);pending.push(target);
  }
 }
 function visit(node){
  if(ts.isIdentifier(node))identifiers.set(node.text,(identifiers.get(node.text)??0)+1);
  if(ts.isStringLiteralLike(node)&&node.end-node.getStart(file)>2048){
   const row={path,start:node.getStart(file),end:node.end,sourceBytes:Buffer.byteLength(node.getText(file)),decodedBytes:Buffer.byteLength(node.text)};
   const sha256=createHash('sha256').update(node.text).digest('hex'),rows=literalGroups.get(sha256)??[];
   rows.push(row);literalGroups.set(sha256,rows);literals.push(row);
  }
  if(ts.isFunctionDeclaration(node)&&node.body){
   const body=node.body.getText(file);
   if(body.length>=200){
    const key=createHash('sha256').update(body).digest('hex'),rows=bodies.get(key)??[];
    rows.push({path,name:node.name?.text??null,start:node.body.getStart(file),end:node.body.end,bytes:Buffer.byteLength(body)});
    bodies.set(key,rows);
   }
  }
  ts.forEachChild(node,visit);
 }
 visit(file);
 for(const node of file.statements){
  if(ts.isFunctionDeclaration(node)&&node.name&&!node.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword))
   privateDeclarations.push({name:node.name.text,identifierOccurrences:identifiers.get(node.name.text),start:node.getStart(file),end:node.end,bytes:Buffer.byteLength(node.getText(file))});
 }
 seen.set(path,{path,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),imports,literals,
  singleIdentifierPrivateFunctionCandidates:privateDeclarations.filter(row=>row.identifierOccurrences===1),
  singleIdentifierImportCandidates:bindings.filter(row=>identifiers.get(row.name)===1)});
}
const files=[...seen.values()].sort((a,b)=>b.bytes-a.bytes),report={schema:'draft-private-compiler-static-size-census-v1',
 typescriptVersion:ts.version,files,totalBytes:total,
 duplicateFunctionBodyCandidates:[...bodies.entries()].filter(([,rows])=>rows.length>1).map(([sha256,rows])=>({sha256,rows})),
 duplicateLiteralCandidates:[...literalGroups.entries()].filter(([,rows])=>rows.length>1).map(([sha256,rows])=>({sha256,rows})),
 candidateScope:'Lexical occurrences and complete text only; no unused-import, side-effect, closure or refactoring equivalence proof.',
 completeStaticGraphQualified:false,executionAuthority:false};
const raw=Buffer.from(JSON.stringify(report));
writeFileSync('ci-logs/issue-784-restart-2/private-compiler-source-size-census.json.gz',gzipSync(raw,{mtime:0}));
console.log(JSON.stringify({files:files.length,totalBytes:total,largest:files.slice(0,12).map(({path,bytes,literals})=>({path,bytes,literalBytes:literals.reduce((sum,row)=>sum+row.sourceBytes,0)})),
 singleIdentifierImportCandidates:files.flatMap(row=>row.singleIdentifierImportCandidates.map(binding=>({path:row.path,...binding}))),
 duplicateBodyGroups:report.duplicateFunctionBodyCandidates.length,
 duplicateLiteralGroups:report.duplicateLiteralCandidates.length,
 singleIdentifierPrivateFunctionCandidates:files.flatMap(row=>row.singleIdentifierPrivateFunctionCandidates.map(candidate=>({path:row.path,...candidate}))),qualified:false}));
