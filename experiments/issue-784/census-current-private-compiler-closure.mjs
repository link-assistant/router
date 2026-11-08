// Diagnostic only: discover the exact static routes, without producing a plan,
// transpiling code, raising production bounds or executing the compiler graph.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {posix,resolve} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
const label=process.argv[2];
if(!/^[a-z0-9-]{1,70}$/u.test(label??''))throw Error('A unique finite evidence label is required');
const output='ci-logs/issue-784-restart-2/'+label+'.json.gz';
if(existsSync(output))throw Error('Refusing to replace prior complete evidence');
const ts=createRequire(resolve('js/package.json'))('typescript');
if(ts.version!=='5.9.3')throw Error('Lockfile TypeScript 5.9.3 required');
const hash=source=>createHash('sha256').update(source).digest('hex');
const roots=['tools/translation/extensions/host-contracts.mjs','tools/translation/project.mjs',
  'tools/translation/translate.mjs','tools/translation/semantic-meta.mjs'];
const native=['node:fs','node:zlib','node:crypto','node:util','node:path','node:url'];
const rawNames=['rust.js','check.js','emit-javascript.js'];
const originals=new Map(),modules=new Map();
let diagnosticInputBytes=0;
function read(path){
  if(posix.normalize(path)!==path||path.startsWith('/')||path.split('/').includes('..'))throw Error('Noncanonical diagnostic input');
  if(!originals.has(path)){
    const bytes=readFileSync(path),source=bytes.toString('utf8');
    if(!bytes.equals(Buffer.from(source)))throw Error('Incomplete UTF8 input');
    diagnosticInputBytes+=bytes.length;
    if(originals.size>=512||diagnosticInputBytes>8*1024*1024)throw Error('Finite diagnostic input bound exceeded');
    originals.set(path,{path,source,bytes:bytes.length,sha256:hash(bytes)});
  }
  return originals.get(path);
}
function parse(path,source){
  const file=ts.createSourceFile(path,source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS);
  if(file.parseDiagnostics.length)throw Error('Actual complete native source is malformed: '+path);
  return file;
}
const sourceTool=read('tools/translation/prepare-private-rust-compiler.mjs');
const core=read('tools/translation/extensions/core.mjs'),coreFile=parse(core.path,core.source),routes=[];
function recipe(node){
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='exposed'){
    const [name,rules]=node.arguments;
    if(!name||!ts.isStringLiteral(name)||!rawNames.includes(name.text)||!rules||!ts.isArrayLiteralExpression(rules))throw Error('Original core recipe differs');
    const replacements=rules.elements.map(row=>{
      if(!ts.isArrayLiteralExpression(row)||row.elements.length!==3||!row.elements.every(ts.isStringLiteralLike))throw Error('Original full core substitution differs');
      return row.elements.map(value=>value.text);
    });
    routes.push({name:name.text,replacements});
  }
  ts.forEachChild(node,recipe);
}
recipe(coreFile);
if(routes.length!==3||routes.some((row,at)=>row.name!==rawNames[at]))throw Error('All three original core routes are required');
const pending=roots.map(path=>({id:path,path}));
for(const route of routes)pending.push({id:'core-exposed:'+route.name,path:'tools/translation/vendor/meta-language/translation/'+route.name,route});
let edges=0;
while(pending.length){
  const request=pending.shift();if(modules.has(request.id))continue;
  if(modules.size>=512)throw Error('Diagnostic module bound exceeded');
  const input=read(request.path);let source=input.source;
  for(const [id,before,after]of request.route?.replacements??[]){
    if(source.split(before).length!==2)throw Error('Actual complete core source equation differs: '+id);
    source=source.replace(before,after);
  }
  const file=parse(request.path,source),imports=[],literals=[];
  for(const statement of file.statements){
    if(ts.isImportDeclaration(statement)||ts.isExportDeclaration(statement)&&statement.moduleSpecifier){
      const value=statement.moduleSpecifier;
      if(!ts.isStringLiteral(value))throw Error('Nonliteral static edge');
      let target=value.text.startsWith('.')?posix.normalize(posix.join(posix.dirname(request.path),value.text)):null;
      if(request.route&&value.text==='./types.js')target='tools/translation/checked-types.mjs';
      if(!target&&!native.includes(value.text))throw Error('Unknown actual native input: '+value.text);
      imports.push({specifier:value.text,target});
      if(++edges>4096)throw Error('Diagnostic edge bound exceeded');
      if(target)pending.push({id:target,path:target});
    }
  }
  function literal(node){
    if(ts.isStringLiteralLike(node)&&node.end-node.getStart(file)>10000)literals.push({start:node.getStart(file),end:node.end,
      sourceBytes:Buffer.byteLength(source.slice(node.getStart(file),node.end)),decodedBytes:Buffer.byteLength(node.text),
      ownerKind:ts.SyntaxKind[node.parent.kind]});
    ts.forEachChild(node,literal);
  }
  literal(file);
  modules.set(request.id,{id:request.id,path:request.path,sourceBytes:Buffer.byteLength(source),sourceSha256:hash(source),imports,literals});
}
// The source tool itself is an observation input, outside its four entry roots.
const actualSources=[...originals.values()].filter(row=>row.path!==sourceTool.path);
for(const row of originals.values())if(readFileSync(row.path,'utf8')!==row.source)throw Error('Complete observation input changed');
const rawBytes=actualSources.reduce((sum,row)=>sum+row.bytes,0);
const report={schema:'current-private-compiler-static-census-diagnostic-v1',compiler:ts.version,
  sourceTool:{path:sourceTool.path,sha256:sourceTool.sha256},roots,routes,
  totals:{modules:modules.size,originalFiles:actualSources.length,rawBytes,edges},
  productionRawByteLimit:4194304,productionBoundPassed:rawBytes<=4194304,
  originalSources:actualSources.map(({source,...row})=>row),modules:[...modules.values()],
  largestOriginals:actualSources.map(({source,...row})=>row).sort((a,b)=>b.bytes-a.bytes),
  semanticAuthority:false,productionPlanProduced:false,compilerExecuted:false};
const bytes=Buffer.from(JSON.stringify(report));
if(bytes.length>4*1024*1024)throw Error('Finite diagnostic evidence bound exceeded');
writeFileSync(output,gzipSync(bytes),{flag:'wx'});
if(!gunzipSync(readFileSync(output),{maxOutputLength:4*1024*1024}).equals(bytes))throw Error('Complete evidence readback differs');
console.log(JSON.stringify({output,totals:report.totals,productionBoundPassed:report.productionBoundPassed,
  largestOriginals:report.largestOriginals.slice(0,15),productionPlanProduced:false}));
