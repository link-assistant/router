import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createCaseDeadlineAudit,readCaseSource} from '../node-case-deadlines.mjs';
import {nodeTestArguments} from '../run-node-tests.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
function fixture(source){
 const directory=fs.mkdtempSync(path.join(root,'packages/javascript/node_modules/node-deadline-fixture-'));
 const file=path.join(directory,'whole.test.mjs');fs.writeFileSync(file,source);
 return {directory,file,dispose:()=>fs.rmSync(directory,{recursive:true,force:true})};
}
function eventAt(file,source,needle,name,durationMs,extra={}){
 const offset=source.indexOf(needle);assert.ok(offset>=0);const prefix=source.slice(0,offset),lines=prefix.split('\n');
 return {type:'test:pass',data:{file,line:lines.length,column:lines.at(-1).length+1,name,nesting:0,testNumber:1,details:{duration_ms:durationMs},...extra}};
}
function auditSource(source,observations){const f=fixture(source);try{const audit=createCaseDeadlineAudit({root,files:[f.file]});for(const event of observations(f))audit.observe(event);return audit.finish();}finally{f.dispose();}}
test('exact source spans enforce zero and exact boundaries without rounding or guessed default limits',()=>{
 const source="import test from 'node:test';\ntest('finite',{timeout:10},()=>{});\ntest('zero',{timeout:0},()=>{});\ntest('default',()=>{});\ntest('unobserved',{timeout:11},()=>{});\n";
 const report=auditSource(source,f=>[eventAt(f.file,source,"test('finite'",'finite',10),eventAt(f.file,source,"test('zero'",'zero',0),eventAt(f.file,source,"test('default'",'default',900000)]);
 assert.equal(report.passed,true);assert.equal(report.unobservedFiniteSourceDeadlines.length,1);assert.equal(report.defaultDeadlinesInferred,false);
 assert.equal(report.records[0].deadline.milliseconds,10);assert.equal(report.sourceRecords[0].source,source);
 const breach=auditSource(source,f=>[eventAt(f.file,source,"test('finite'",'finite',10.000001)]);assert.equal(breach.passed,false);assert.equal(breach.records[0].durationBreach,true);
 const wrongLine=auditSource(source,f=>{const event=eventAt(f.file,source,"test('finite'",'finite',1);event.data.line=1;event.data.column=source.indexOf("test('finite'")+1;return [event];});assert.equal(wrongLine.passed,false);assert.match(wrongLine.errors.join('\n'),/outside exact source line/u);
});
test('duplicate names and nested reports join source positions and preserve every independent observed duration',()=>{
 const source="import test from 'node:test';\ntest('same',{timeout:20},()=>{});\ntest('same',{timeout:2},()=>{});\ntest('parent',async context=>{await context.test('nested',{timeout:3},()=>{});});\n";
 const report=auditSource(source,f=>[eventAt(f.file,source,"test('same',{timeout:20}",'same',19),eventAt(f.file,source,"test('same',{timeout:2}",'same',2.1,{nesting:1,testNumber:1}),eventAt(f.file,source,"context.test('nested'",'nested',3,{nesting:2,testNumber:1})]);
 assert.equal(report.records.length,3);assert.equal(report.passed,false);assert.equal(report.records[1].durationBreach,true);assert.notEqual(report.records[0].sourceCallSpan.start,report.records[1].sourceCallSpan.start);assert.equal(report.records[2].deadline.milliseconds,3);
});
test('lexical numeric constants and unescaped const options work; writes, escape, spread, duplicate or dynamic deadlines refuse',()=>{
 const valid="import test from 'node:test';const SECOND=1000;const options={timeout:2*SECOND};test('constant',options,()=>{});";
 assert.equal(auditSource(valid,f=>[eventAt(f.file,valid,"test('constant'",'constant',2000)]).passed,true);
 const computed="import test from 'node:test';test('literal',{['timeout']:10},()=>{});";
 assert.equal(auditSource(computed,f=>[eventAt(f.file,computed,"test('literal'",'literal',10)]).passed,true);
 for(const source of [
  "import test from 'node:test';const options={timeout:10};options.timeout=1;test('bad',options,()=>{});",
  "import test from 'node:test';const options={timeout:10};unknown(options);test('bad',options,()=>{});",
  "import test from 'node:test';const options={timeout:10};const alias=options;alias.timeout=1;test('bad',options,()=>{});",
  "import test from 'node:test';export const options={timeout:10};test('bad',options,()=>{});",
  "import test from 'node:test';test('bad',{timeout:10,...unknown},()=>{});",
  "import test from 'node:test';test('bad',{timeout:10,timeout:20},()=>{});",
  "import test from 'node:test';test('bad',{timeout:unknown},()=>{});",
  "import test from 'node:test';test('bad',{timeout:Infinity},()=>{});",
  "import test from 'node:test';const key='timeout';test('bad',{[key]:1},()=>{});",
  "import test from 'node:test';test('bad',{__proto__:{timeout:1}},()=>{});",
  "import test from 'node:test';const options=unknown;test(options,()=>{});",
 ]){const report=auditSource(source,f=>[eventAt(f.file,source,source.includes("test('bad'")?"test('bad'":"test(options",'bad',0)]);assert.equal(report.passed,false,source);assert.ok(report.errors.length);}
});
test('ambiguous locations names and durations fail closed while original failures and later observations remain recorded',()=>{
 const source="import test from 'node:test';test('first',{timeout:10},()=>{});test('later',{timeout:10},()=>{});";
 const report=auditSource(source,f=>{
  const missing=eventAt(f.file,source,"test('first'",'first',2);delete missing.data.line;
  const failed=eventAt(f.file,source,"test('first'",'first',20);failed.type='test:fail';
  return [missing,failed,eventAt(f.file,source,"test('later'",'later',3),eventAt(f.file,source,"test('first'",'wrong name',2),eventAt(f.file,source,"test('first'",'first',NaN)];
 });
 assert.equal(report.passed,false);assert.equal(report.records.length,5);assert.equal(report.records[1].type,'test:fail');assert.equal(report.records[2].name,'later');
});
test('complete source identity changes invalid syntax links and forbidden runner filtering cannot yield success',()=>{
 const f=fixture("import test from 'node:test';test('x',{timeout:10},()=>{});");
 try{const audit=createCaseDeadlineAudit({root,files:[f.file]});fs.writeFileSync(f.file,fs.readFileSync(f.file,'utf8')+'\n');assert.equal(audit.finish().passed,false);
 const alias=path.join(f.directory,'alias.test.mjs');fs.symlinkSync(f.file,alias);assert.equal(createCaseDeadlineAudit({root,files:[alias]}).finish().passed,false);
 fs.writeFileSync(f.file,"import test from 'node:test';test('invalid',{");assert.equal(createCaseDeadlineAudit({root,files:[f.file]}).finish().passed,false);
 fs.writeFileSync(f.file,'// initially bounded source\n');const initial=fs.statSync(f.file),originalRead=fs.readSync;let grew=false,largestRequested=0;
 assert.throws(()=>readCaseSource(f.file,initial.size-1),/Bounded regular/u);
 try{fs.readSync=function(fd,buffer,offset,length,position){const state=fs.fstatSync(fd);if(state.dev===initial.dev&&state.ino===initial.ino){largestRequested=Math.max(largestRequested,length);if(!grew){grew=true;fs.appendFileSync(f.file,'extra'.repeat(8192));}}return originalRead(fd,buffer,offset,length,position);};assert.throws(()=>readCaseSource(f.file,initial.size),/changed during read/u);}
 finally{fs.readSync=originalRead;}assert.equal(grew,true);assert.ok(largestRequested<=initial.size);assert.ok(fs.statSync(f.file).size>initial.size);
 }finally{f.dispose();}
 assert.throws(()=>nodeTestArguments(['--test-name-pattern=x','whole.test.mjs']),/whole source/u);assert.throws(()=>nodeTestArguments([]),/explicit/u);assert.deepEqual(nodeTestArguments(['--test-concurrency=2','a.test.mjs','b.test.mjs']),{files:['a.test.mjs','b.test.mjs'],flags:['--test-concurrency=2']});
});
function runWhole(f){
 const env={...process.env};delete env.NODE_TEST_CONTEXT; // Independent nested Node test process, as in existing runner fixtures.
 const result=spawnSync('node',[path.join(root,'scripts/run-node-tests.mjs'),'--outer-timeout-ms=20000',f.file],{cwd:root,env,encoding:'utf8',timeout:25000,maxBuffer:16*1024*1024});
 const match=result.stderr.match(/Complete Node deadline evidence: (.+)\n/u);assert.ok(match,result.stderr);
 const output=match[1],terminal=JSON.parse(fs.readFileSync(path.join(output,'terminal.json'),'utf8')),audit=JSON.parse(fs.readFileSync(path.join(output,'case-deadlines.json'),'utf8'));
 return {result,terminal,audit,output};
}
test('actual complete synchronous Node pass is independently rejected after all later cases and TAP finish',{timeout:60000},()=>{
 for(const [setup,options,breach] of [['','{timeout:10}',true],["const key='timeout';",'{[key]:1}',false],['','{__proto__:{timeout:1}}',false]]){
 const f=fixture(`import test from 'node:test';${setup}test('synchronous overdue',${options},()=>{const until=Date.now()+80;while(Date.now()<until){}});test('later whole case',()=>{});\n`);
 try{
  const {result,terminal,audit,output}=runWhole(f);assert.equal(result.status,1,result.stderr);assert.equal(terminal.exitCode,1);assert.ok(audit.records.some(row=>row.name==='synchronous overdue'&&(breach?row.durationBreach:row.auditError)));assert.ok(audit.records.some(row=>row.name==='later whole case'));assert.equal(audit.allEventsForwardedToBuiltinTap,true);
  const raw=fs.readFileSync(path.join(output,'stdout.raw.tap'),'utf8');assert.match(raw,/synchronous overdue/u);assert.match(raw,/later whole case/u);assert.match(raw,/# tests 2/u);assert.equal(result.stdout,raw);
 }finally{f.dispose();}
 }
});
test('actual large complete TAP and original failed case are retained beyond small-buffer limits',{timeout:60000},()=>{
 const f=fixture("import test from 'node:test';test('large complete output',()=>{process.stdout.write('a'.repeat(2*1024*1024));});test('actual original failure',()=>{throw new Error('preserved original failure');});test('final whole case',()=>{});\n");
 try{const {result,terminal,audit,output}=runWhole(f);assert.equal(result.status,1);assert.equal(audit.allEventsForwardedToBuiltinTap,true);assert.equal(audit.records.length,3);assert.ok(terminal.logs.find(row=>row.path==='stdout.raw.tap').bytes>2*1024*1024);const raw=fs.readFileSync(path.join(output,'stdout.raw.tap'),'utf8');assert.equal(raw,result.stdout);assert.match(raw,/preserved original failure/u);assert.match(raw,/final whole case/u);}finally{f.dispose();}
});

test('actual complete positive cohort preserves duplicate names nested cases default cases and successful audit',{timeout:60000},()=>{
 const f=fixture("import test from 'node:test';const LIMIT=2000;const options={timeout:LIMIT};test('same',options,()=>{});test('same',{timeout:LIMIT},async context=>{await context.test('nested',{timeout:LIMIT},()=>{});});test('default whole case',()=>{});const cases=[{name:'dynamic template whole case'}];for(const fixture of cases)test(`${fixture.name}`,()=>{});for(const label of ['left'])test(label+' binary right',()=>{});for(const label of ['right'])test('binary left '+label,()=>{});const suffix=' recursive';test(('nested '+unknownLabel())+suffix,()=>{});function unknownLabel(){return 'binary';}\n");
 try{const {result,terminal,audit,output}=runWhole(f);assert.equal(result.status,0,result.stdout+result.stderr);assert.equal(terminal.exitCode,0);assert.equal(audit.passed,true);assert.equal(audit.allEventsForwardedToBuiltinTap,true);assert.equal(audit.records.filter(row=>row.name==='same').length,2);assert.equal(audit.records.find(row=>row.name==='nested').deadline.milliseconds,2000);assert.equal(audit.records.find(row=>row.name==='default whole case').deadline.kind,'default-no-source-deadline');for(const name of ['dynamic template whole case','left binary right','binary left right','nested binary recursive'])assert.equal(audit.records.find(row=>row.name===name).deadline.kind,'default-no-source-deadline',name);assert.equal(audit.records.length,8);assert.equal(fs.readFileSync(path.join(output,'stdout.raw.tap'),'utf8'),result.stdout);}finally{f.dispose();}
});
