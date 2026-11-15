// Actual source producers; complete proposals precede each installation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,lstatSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareClassBirthEntrySource} from '../../tools/translation/prepare-class-birth-entry.mjs';
import {prepareOriginalClassBirthPlan} from '../../tools/translation/prepare-original-class-birth.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
function bytes(path){return readdirSync(path,{withFileTypes:true}).reduce((sum,entry)=>{
 const file=path+'/'+entry.name;if(entry.isSymbolicLink()||file==='experiments/issue-784/toolchain')return sum;
 return sum+(entry.isDirectory()?bytes(file):lstatSync(file).size);
},0);}
function capture(name,plan){
 const target='docs/case-studies/issue-784/evidence/'+name+'.json.gz';
 const raw=Buffer.from(JSON.stringify({schema:'complete-class-birth-source-evidence-v1',engine:process.versions,plan,fullGateQualified:false})+'\n');
 const packed=gzipSync(raw,{level:9,mtime:0});
 const census=['ci-logs','docs/case-studies/issue-784','experiments/issue-784','js/node_modules/.node-case-deadlines'].reduce((sum,path)=>sum+bytes(path),0);
 console.log(JSON.stringify({path:target,bytes:packed.length,sha256:sha(packed),decodedBytes:raw.length,decodedSha256:sha(raw),censusBeforeBytes:census}));
 assert.ok(census+packed.length<500000000,'complete evidence allocation remains mandatory');
 writeFileSync(target,packed,{flag:'wx'});assert.deepEqual(readFileSync(target),packed);
 assert.deepEqual(gunzipSync(readFileSync(target)),raw);assert.deepEqual(JSON.parse(raw).plan,plan);
}
const mode=process.argv[2];assert.ok(['entry','classes'].includes(mode));
if(mode==='entry'){
 const plan=prepareClassBirthEntrySource();assert.equal(plan.inverse,plan.before);
 assert.equal(transportConcreteSyntaxMeta(plan.beforeMeta).source,plan.before);
 assert.equal(transportConcreteSyntaxMeta(plan.afterMeta).source,plan.after);
 assert.deepEqual(plan.trace.map(row=>row.phase),['language','repository']);
 assert.equal(plan.classDefinitionsChanged,false);assert.equal(plan.registeredClassDomainExpanded,false);
 assert.equal(plan.runtimeAuthority,false);assert.notEqual(plan.entry.prior.sha256,plan.entry.pin.sha256);
 capture('current-class-birth-entry-source',plan);
 assert.equal(readFileSync(plan.path,'utf8'),plan.before);assert.equal(readFileSync(plan.entry.path,'utf8'),plan.entry.source);
 writeFileSync(plan.path,plan.after);assert.equal(readFileSync(plan.path,'utf8'),plan.after);
}else{
 const plan=prepareOriginalClassBirthPlan();assert.equal(plan.files.length,13);assert.equal(plan.selections.length,24);
 for(const row of plan.files)assert.equal(row.afterSource,readFileSync('tools/translation/'+row.path,'utf8'));
 assert.deepEqual(plan.authority,{type:false,owner:false,executable:false});
 capture('current-class-birth-program-source',plan);
 assert.equal(readFileSync(plan.leaf.path,'utf8'),plan.leaf.beforeSource);
 writeFileSync(plan.leaf.path,plan.leaf.afterSource);assert.equal(readFileSync(plan.leaf.path,'utf8'),plan.leaf.afterSource);
}
