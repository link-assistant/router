// Finite diagnostic source proposal; no installed compiler source is changed.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';

const path='tools/translation/project.mjs',output='ci-logs/issue-784-restart-2/namespace-progress-diagnostic.json.gz';
const before=readFileSync(path,'utf8'),ts=ownershipCompiler();
if(ts.version!=='5.9.3')throw Error('Installed TypeScript5.9.3 required');
const file=ts.createSourceFile(path,before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
if(file.parseDiagnostics.length)throw Error('Complete original grammar differs');
const functions=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='compileProjectLanguage');
if(functions.length!==1)throw Error('One complete original project function required');
const bindings=functions[0].body.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).filter(node=>node.name.getText(file)==='namespaceProgress');
if(bindings.length!==1||!ts.isArrowFunction(bindings[0].initializer))throw Error('One original namespace reporter required');
const body=bindings[0].initializer.body;
if(!ts.isBlock(body)||body.statements.length!==1||!ts.isIfStatement(body.statements[0]))throw Error('Original complete reporter grammar differs');
const selected=body.statements[0];
if(selected.expression.getText(file)!=='enclosingNamespace'||selected.elseStatement||!ts.isExpressionStatement(selected.thenStatement))throw Error('Exact enclosing-only diagnostic guard required');
const edit={span:[selected.getStart(file),selected.end],expected:selected.getText(file),replacement:selected.thenStatement.getText(file)};
const after=before.slice(0,edit.span[0])+edit.replacement+before.slice(edit.span[1]);
const fresh=ts.createSourceFile(path,after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
if(fresh.parseDiagnostics.length||after.slice(0,edit.span[0])+edit.expected+after.slice(edit.span[0]+edit.replacement.length)!==before)throw Error('Complete diagnostic grammar/inverse differs');
const [equation]=transportConcreteSourcePhases([{before,middle:after,after,language:'JavaScript'}]);
if(readFileSync(path,'utf8')!==before)throw Error('Complete original physical source changed');
const hash=value=>createHash('sha256').update(value).digest('hex');
const plan={schema:'complete-namespace-progress-diagnostic-v1',path,before,after,beforeSha256:hash(before),afterSha256:hash(after),edit,equation,
 diagnosticOnly:true,ordinaryPlannerChanged:false,semanticAuthority:false,runtimeParity:false};
const raw=Buffer.from(JSON.stringify(plan));if(raw.length>32*1024*1024)throw Error('Finite complete diagnostic evidence bound');
const packed=gzipSync(raw);writeFileSync(output,packed,{flag:'wx'});
if(!gunzipSync(readFileSync(output),{maxOutputLength:32*1024*1024}).equals(raw))throw Error('Complete proposal readback differs');
console.log(JSON.stringify({schema:plan.schema,path,beforeSha256:plan.beforeSha256,afterSha256:plan.afterSha256,bytes:raw.length,packedBytes:packed.length,diagnosticOnly:true,semanticAuthority:false}));
