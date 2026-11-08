// Exact original-input preparation; installation and receiving evidence are
// recorded separately in current-native-ci-repair.md.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {substituteRepositoryGitSourceReads} from '../../tools/translation/repository-path-substitutions.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';

const root=new URL('../../',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex');
const cases=[
  {path:'tools/translation/test/serde-deserialize-unit-enum.test.mjs',
    beforeSha256:'97f393f415ad8bfe10a6144f36ac406e78c485e264cb3901ed0fd21feb22a42a',
    rootAlreadyDeclared:true,expectedReads:2},
  {path:'tools/translation/test/toml-value-namespace.test.mjs',
    beforeSha256:'b485d0826e5d4b92c0c3d510be61502c0dcbed407dd44072ac2cc52fb01f6a5d',
    rootAlreadyDeclared:false,expectedReads:1},
];

export function prepareCurrentGitFixturePaths() {
  const ts=ownershipCompiler();
  const rows=cases.map(spec=>{
    const before=readFileSync(new URL(spec.path,root),'utf8');
    if(hash(before)!==spec.beforeSha256)throw Error('Complete original Git fixture differs: '+spec.path);
    const file=ts.createSourceFile(spec.path,before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    if(file.parseDiagnostics.length)throw Error('Original complete fixture syntax is invalid');
    const edits=[];
    const visit=node=>{
      if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='execFileSync'&&node.arguments.length===3){
        const [command,args,options]=node.arguments;
        if(ts.isStringLiteral(command)&&command.text==='git'&&ts.isArrayLiteralExpression(args)&&args.elements.length===2&&ts.isStringLiteral(args.elements[0])&&args.elements[0].text==='show'&&ts.isObjectLiteralExpression(options)){
          const value=args.elements[1];
          const current=ts.isStringLiteral(value)&&value.text.startsWith('HEAD:')||ts.isBinaryExpression(value)&&value.operatorToken.kind===ts.SyntaxKind.PlusToken&&ts.isStringLiteral(value.left)&&value.left.text==='HEAD:';
          if(current){
            if(options.properties.some(row=>row.name?.getText(file)==='cwd'))throw Error('Expected original inherited Git working directory');
            const at=options.getStart(file)+1;edits.push({at,text:'cwd:root,'});
          }
        }
      }
      ts.forEachChild(node,visit);
    };
    visit(file);
    if(edits.length!==spec.expectedReads)throw Error('Complete original Git-read census differs');
    let middle=before;
    for(const edit of edits.sort((a,b)=>b.at-a.at))middle=middle.slice(0,edit.at)+edit.text+middle.slice(edit.at);
    if(!spec.rootAlreadyDeclared)middle="const root=new URL('../../../',import.meta.url);\n"+middle;
    const proposal=substituteRepositoryGitSourceReads(middle,'./fixtures/repository-paths.mjs');
    if(!proposal.changed||proposal.edits.length!==spec.expectedReads||!proposal.wholeInverse)throw Error('Complete Git source migration differs');
    const after=proposal.source;
    if(ts.createSourceFile(spec.path,after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)throw Error('Proposed complete fixture syntax is invalid');
    return {...spec,before,middle,after,afterSha256:hash(after),proposal,
      pendingReceiving:true,originalCaseBodiesChanged:false};
  });
  const equations=transportConcreteSourcePhases(rows.map(({before,middle,after})=>({before,middle,after,language:'JavaScript'})));
  return {schema:'current-implicit-git-fixture-path-proposal-v1',
    rows:rows.map((row,index)=>({...row,equation:equations[index]})),
    semanticAuthority:false,receivingQualified:false};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const output=process.argv[2];
  if(!output||!output.startsWith('ci-logs/issue-784-restart-2/')||!output.endsWith('.json.gz'))throw Error('Unique ignored evidence packet required');
  const plan=prepareCurrentGitFixturePaths(),raw=Buffer.from(JSON.stringify(plan)+'\n');
  if(raw.length>4*1024*1024)throw Error('Finite complete fixture proposal bound exceeded');
  const packed=gzipSync(raw,{mtime:0});writeFileSync(output,packed,{flag:'wx'});
  if(!gunzipSync(readFileSync(output),{maxOutputLength:4*1024*1024}).equals(raw))throw Error('Complete proposal readback differs');
  console.log(JSON.stringify({output,rawBytes:raw.length,packedBytes:packed.length,
    rows:plan.rows.map(({path,beforeSha256,afterSha256})=>({path,beforeSha256,afterSha256})),
    receivingQualified:false,productionFilesWritten:false}));
}
