// Propose one receiving fixture extension; never change a production compiler.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';

const path='tools/translation/js-to-rust/test/owned-json-string-folds.test.mjs';
const compilerPath='tools/translation/js-to-rust/owned-core-source.mjs';
const output=process.argv[2],hash=value=>createHash('sha256').update(value).digest('hex');
if(process.argv.length!==3||!/^ci-logs\/issue-784-restart-2\/[a-z0-9-]+\.json\.gz$/u.test(output??''))throw TypeError('One fresh task evidence path required');
const require=createRequire(resolve('js/package.json')),ts=require('typescript');
assert.equal(ts.version,'5.9.3');
function native(path,source){
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS);
 assert.equal(file.parseDiagnostics.length,0);return file;
}
function one(rows){assert.equal(rows.length,1);return rows[0];}
const before=readFileSync(path,'utf8'),actual=readFileSync(compilerPath,'utf8'),file=native(path,before),compiler=native(compilerPath,actual);
const declaration=one(file.statements.filter(ts.isVariableStatement).flatMap(statement=>[...statement.declarationList.declarations]).filter(node=>node.name.getText(file)==='SOURCE_RULES'));
assert.ok(ts.isArrayLiteralExpression(declaration.initializer));
const rules=JSON.parse(declaration.initializer.getText(file));
const first=rules[0];assert.equal(first.path,compilerPath);assert.equal(first.id,'actual-static-or-input-string-loan-meet');
const selected=[];function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='asciiStringLoan')selected.push(node);ts.forEachChild(node,visit);}visit(compiler);
const ascii=one(selected),start=ascii.getFullStart(),end=ascii.end;
assert.ok(ts.isBlock(ascii.parent));
const siblings=ascii.parent.statements,at=siblings.indexOf(ascii);
assert.ok(at>0);assert.equal(siblings[at-1].name?.text,'meetStringLoans');assert.equal(siblings[at+1].name?.text,'expression');
const insertion=actual.slice(start,end);
assert.ok(insertion.startsWith('\n  // This additional fact stays in the current native lexical environment.\n'));
const without=actual.slice(0,start)+actual.slice(end);
assert.equal(actual.split(first.after).length,1);assert.equal(without.split(first.after).length,2);
const firstStart=without.indexOf(first.after),offset=start-firstStart;
assert.ok(offset>0&&offset<first.after.length);
const current=first.after.slice(0,offset)+insertion+first.after.slice(offset);
assert.equal(actual.split(current).length,2);
const added={path:compilerPath,phase:'language',id:'retain-current-independent-ascii-string-loan-helper',before:first.after,after:current};
const position=declaration.initializer.end-1,payload=','+JSON.stringify(added);
const after=before.slice(0,position)+payload+before.slice(position);
assert.equal(after.slice(0,position)+after.slice(position+payload.length),before);
const next=native(path,after),tests=source=>source.statements.filter(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&node.expression.expression.getText(source)==='test').map(node=>node.getText(source));
assert.deepEqual(tests(next),tests(file));assert.equal(tests(file).length,8);
const replayRules=[...rules,added];
for(const sourcePath of new Set(replayRules.map(row=>row.path))){
 const source=readFileSync(sourcePath,'utf8'),rows=replayRules.filter(row=>row.path===sourcePath);let original=source;
 function replace(source,from,to){assert.equal(source.split(from).length,2);return source.replace(from,()=>to);}
 for(const row of [...rows].reverse())original=replace(original,row.after,row.before);
 let current=original;for(const phase of ['language','repository'])for(const row of rows.filter(row=>row.phase===phase))current=replace(current,row.before,row.after);
 assert.equal(current,source);
}
const [equation]=transportConcreteSourcePhases([{before,middle:after,after,language:'JavaScript'}]);
assert.equal(equation.inverse,before);assert.equal(equation.after,after);
assert.equal(readFileSync(path,'utf8'),before);assert.equal(readFileSync(compilerPath,'utf8'),actual);
const proposal={schema:'current-string-fold-receiving-equation-proposal-v1',path,before,after,added,
 actualCompiler:{path:compilerPath,source:actual,sha256:hash(actual)},nativeSelection:{span:[start,end],insertion,fullOriginalRules:rules,originalTests:tests(file)},
 nativeUndo:before,equation,originalCasesAndDeadlinesUnchanged:true,sourceInstalled:false,runtimeQualified:false,semanticAuthority:false};
const raw=Buffer.from(JSON.stringify(proposal));assert.ok(raw.length<=32*1024*1024);
const packed=gzipSync(raw);writeFileSync(output,packed,{flag:'wx'});
assert.ok(gunzipSync(readFileSync(output),{maxOutputLength:32*1024*1024}).equals(raw));
console.log(JSON.stringify({schema:proposal.schema,path,originalCases:tests(file).length,
 originalRules:rules.length,addedRules:1,completeInverse:true,sourceInstalled:false,
 packedBytes:packed.length,packedSha256:hash(packed),runtimeQualified:false}));
