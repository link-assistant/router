import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {projectSemanticReviewMetadata} from '../../../scripts/project-concrete-review.mjs';
import {deriveProjectConcreteReviewSource} from '../../../scripts/prepare-project-concrete-review.mjs';
import {createConcreteSyntaxMeta,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
function fixture(){
 const source='\ufeff// complete Ω😀\r\npub fn value()->u8{7u8}\r\n',name='rust/src/lib.rs';
 const meta={sources:[{source:name,sha256:hash(source)}],concreteSyntaxMeta:[{source:name,document:JSON.parse(JSON.stringify(createConcreteSyntaxMeta(source,{language:'Rust'})))}],checkedSemanticProgram:{retained:['complete','checked']},targetSemanticProgram:{retained:['complete','target']},extra:{retained:true},semanticAuthority:false,runtimeParity:false};
 return {source,name,meta,readSource:path=>{assert.equal(path,name);return source;}};
}
test('stored review validates complete CST and preserves every semantic field without authority',{timeout:60000},()=>{
 const f=fixture(),before=JSON.stringify(f.meta),result=projectSemanticReviewMetadata(f.meta,{readSource:f.readSource});
 assert.equal(Object.getPrototypeOf(result.semanticMetadata),null);
 assert.deepEqual(Object.keys(result.semanticMetadata),Object.keys(f.meta).filter(key=>key!=='concreteSyntaxMeta'));
 for(const key of Object.keys(result.semanticMetadata))assert.equal(result.semanticMetadata[key],f.meta[key]);
 assert.equal(JSON.stringify(f.meta),before);assert.equal(result.concreteSyntaxReview.length,1);
 const [review]=result.concreteSyntaxReview;assert.equal(review.source,f.name);assert.equal(review.sha256,hash(f.source));assert.equal(review.bytes,Buffer.byteLength(f.source));assert.equal(review.wholeConcreteSourceChecked,true);assert.equal(review.semanticAuthority,false);assert.equal(review.runtimeParity,false);
 const legacy={checkedGeneratedMethods:[],unrelated:{complete:true}},old=projectSemanticReviewMetadata(legacy);assert.deepEqual(old.semanticMetadata,{...legacy,__proto__:null});assert.deepEqual(old.concreteSyntaxReview,[]);
});
test('forged concrete source tokens language hashes and incomplete source census refuse',{timeout:60000},()=>{
 for(const mutate of [f=>{f.meta.concreteSyntaxMeta[0].document.source+=' ';},f=>{f.meta.concreteSyntaxMeta[0].document.nodes[0][3]--;},f=>{f.meta.concreteSyntaxMeta[0].document.language='JavaScript';},f=>{f.meta.sources[0].sha256='0'.repeat(64);},f=>{f.meta.concreteSyntaxMeta=[];},f=>{f.meta.concreteSyntaxMeta.push(f.meta.concreteSyntaxMeta[0]);},f=>{f.meta.sources.push({source:'rust/src/missing.rs',sha256:hash('missing')});},f=>{f.meta.sources.push({...f.meta.sources[0],sha256:'f'.repeat(64)});},f=>{f.meta.sources[0].source='../escaping.rs';}]){
  const f=fixture();mutate(f);assert.throws(()=>projectSemanticReviewMetadata(f.meta,{readSource:f.readSource}));
 }
});
test('metadata proxy accessors hooks and late source callback mutations refuse',{timeout:60000},()=>{
 const f=fixture();let calls=0;assert.throws(()=>projectSemanticReviewMetadata(new Proxy(f.meta,{ownKeys(){calls++;return [];}}),{readSource:f.readSource}),/plain metadata/);assert.equal(calls,0);
 for(const mutate of [f=>Object.defineProperty(f.meta,'extra',{get(){throw Error('getter executed');}}),f=>Object.defineProperty(f.meta.concreteSyntaxMeta[0],'document',{get(){throw Error('getter executed');}}),f=>{f.meta.extra.toJSON=()=>{throw Error('hook executed');};}]){const f=fixture();mutate(f);assert.throws(()=>projectSemanticReviewMetadata(f.meta,{readSource:f.readSource}),/accessors|inert JSON/);}
 for(const mutate of [f=>{f.meta.concreteSyntaxMeta[0].source='rust/src/changed.rs';},f=>{f.meta.sources[0].sha256='f'.repeat(64);},f=>{f.meta.extra={changed:true};},f=>{f.meta.newField=true;}]){const f=fixture();assert.throws(()=>projectSemanticReviewMetadata(f.meta,{readSource:path=>{mutate(f);return f.readSource(path);}}),/changed|differs/);}
});
test('both representation guards retain the original two-million object bound',{timeout:60000},()=>{
 const large=Array(2_000_001).fill({});let calls=0;
 assert.throws(()=>projectSemanticReviewMetadata({semantic:large}),/bounded non-proxy/);
 assert.throws(()=>projectSemanticReviewMetadata({sources:[],concreteSyntaxMeta:large},{readSource(){calls++;return '';}}),/bounded non-proxy/);assert.equal(calls,0);
});
test('actual producer copies the complete unchanged guard through CST and both rule sequences',{timeout:60000},()=>{
 const source=readFileSync(new URL('../../../scripts/review-translation-draft.mjs',import.meta.url),'utf8'),proposal=deriveProjectConcreteReviewSource(source);
 assert.equal(readFileSync(new URL('../../../scripts/project-concrete-review.mjs',import.meta.url),'utf8'),proposal.text);
 assert.equal(transportConcreteSyntaxMeta(proposal.meta).source,proposal.text);assert.equal(transportConcreteSyntaxMeta(proposal.kernel.meta).source,proposal.kernel.source);
 assert.equal(source.slice(...proposal.kernel.span),proposal.inverse);assert.equal(proposal.inverse,proposal.kernel.source);assert.equal(proposal.originalGuardUnchanged,true);assert.equal(proposal.semanticAuthority,false);
 assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);
 assert.throws(()=>deriveProjectConcreteReviewSource(source.replace('function assertGeneratedReviewData(', 'function renamedGuard(')),/complete data guard/);
 assert.notEqual(deriveProjectConcreteReviewSource(source.replace('++nodes>2_000_000','++nodes>1_999_999')).text,proposal.text);
});
