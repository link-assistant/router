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
const seen=new Map();let total=0;
while(pending.length){
 const path=pending.shift();if(seen.has(path))continue;
 if(seen.size>=512)throw Error('finite file bound');
 const raw=readFileSync(path),source=raw.toString('utf8');total+=raw.length;
 if(total>16777216)throw Error('finite inspection byte bound');
 if(!Buffer.from(source).equals(raw))throw Error('complete UTF8 required');
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS);
 const imports=[],literals=[];
 for(const node of file.statements){
  if(!(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)&&node.moduleSpecifier))continue;
  const spec=node.moduleSpecifier;if(!ts.isStringLiteral(spec))throw Error('literal static import required');
  if(spec.text.startsWith('.')){
   const target=posix.normalize(posix.join(posix.dirname(path),spec.text));
   if(target.startsWith('../')||target.startsWith('/'))throw Error('relative repository source required');
   imports.push(target);pending.push(target);
  }
 }
 function visit(node){
  if(ts.isStringLiteralLike(node)&&node.end-node.getStart(file)>2048)
   literals.push({start:node.getStart(file),end:node.end,sourceBytes:Buffer.byteLength(node.getText(file)),decodedBytes:Buffer.byteLength(node.text)});
  ts.forEachChild(node,visit);
 }
 visit(file);seen.set(path,{path,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),imports,literals});
}
const files=[...seen.values()].sort((a,b)=>b.bytes-a.bytes),report={schema:'draft-private-compiler-static-size-census-v1',
 typescriptVersion:ts.version,files,totalBytes:total,completeStaticGraphQualified:false,executionAuthority:false};
const raw=Buffer.from(JSON.stringify(report));
writeFileSync('ci-logs/issue-784-restart-2/private-compiler-source-size-census.json.gz',gzipSync(raw,{mtime:0}));
console.log(JSON.stringify({files:files.length,totalBytes:total,largest:files.slice(0,30).map(({path,bytes,literals})=>({path,bytes,literalBytes:literals.reduce((sum,row)=>sum+row.sourceBytes,0)})),qualified:false}));
