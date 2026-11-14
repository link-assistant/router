// Source inventory only: no completion events, test execution or audit success.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createCaseDeadlineAudit,installedDeadlineCompiler} from '../../scripts/node-case-deadlines.mjs';
const root=process.cwd(),directory='js/node_modules/.node-case-deadlines/complete-0j8QH2';
const command=JSON.parse(readFileSync(directory+'/command.json','utf8'));
const files=command.originalSources.map(row=>row.path);
const inventory=createCaseDeadlineAudit({root,files}).finish();
assert.equal(inventory.observedCompletedCases,0);
assert.deepEqual(inventory.errors,[]);
for(const row of inventory.sourceRecords){
 const original=command.originalSources.find(old=>old.path===row.path);
 assert.deepEqual(row,original);
}
const {ts}=installedDeadlineCompiler(root),cases=[];
for(const row of inventory.unobservedFiniteSourceDeadlines){
 const source=inventory.sourceRecords.find(input=>input.path===row.file);
 const file=ts.createSourceFile(row.file,source.source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const matches=[];
 function visit(node){
  if(ts.isCallExpression(node)&&node.getStart(file)===row.span.start&&node.end===row.span.end)
   matches.push(node);
  ts.forEachChild(node,visit);
 }
 visit(file);assert.equal(matches.length,1);
 const name=matches[0].arguments[0];
 cases.push({file:row.file,literalName:ts.isStringLiteral(name)?name.text:null,
  nameExpression:name.getText(file),deadline:row.deadline,
  sourceSha256:source.sha256,sourceCallSpan:row.span,completionObserved:false});
}
// A registration wrapper and dynamic names make source call count distinct
// from the number of completed runtime cases. Do not infer missing names.
assert.equal(cases.length,33);
const output='ci-logs/issue-784-restart-2/project-ingress-source-deadlines.json';
writeFileSync(output,JSON.stringify({schema:'source-only-deadline-inventory-v1',
 sourceCalls:cases,sourceRecords:inventory.sourceRecords,typescript:inventory.typescript,
 receivingQualified:false,completeAudit:false,originalLimitsChanged:false})+'\n',{flag:'wx'});
console.log(JSON.stringify({output,sourceCalls:cases.length,sourceOnly:true,
 completeAudit:false,receivingQualified:false}));
