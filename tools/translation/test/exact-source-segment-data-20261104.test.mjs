// Independent bounded segment/source algebra cases. SOURCE ONLY / UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {composeExactSourceSegmentData20261104 as compose} from '../exact-source-segment-data-20261104.mjs';
import {extendExactSourceIndexCompactData} from '../exact-source-index-builder-20261103.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const wanted='fixture/caller.mjs',a='export const value=0;\n',b='export const value=1;\n',c='export const value=2;\n';
const hash=value=>createHash('sha256').update(value).digest('hex');
const image=(name,source)=>({path:'tools/translation/source-profiles/segment-fixture/'+name+'.txt',bytes:Buffer.byteLength(source),sha256:hash(source)});
const edge=(id,path,before,after,language='JavaScript')=>({id,path,language,profileManifest:'tools/translation/source-profiles/segment-fixture/profile.json',before:image(id+'-before',before),after:image(id+'-after',after)});
const index=rows=>({schema:'fixed-reviewed-source-successor-index-20261103-v1',scope:'Source DATA only',rows,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'});
function segment(id,edges,images){return {id,indexText:JSON.stringify(index(edges))+'\n',images};}
function selected(id,before,after){const row=edge(id,wanted,before,after);return {row,images:[{path:row.before.path,source:before},{path:row.after.path,source:after}]};}
function sample(){const left=selected('left',a,b),right=selected('right',b,c);return {path:wanted,before:a,current:c,segments:[segment('one',[left.row],left.images),segment('two',[right.row],right.images)]};}
test('complete source histories compose across indexes with both full CST phases and inverse',()=>{
 const result=compose(sample());assert.equal(result.before,a);assert.equal(result.after,c);assert.equal(result.inverse,a);assert.equal(result.currentIsTerminal,true);assert.equal(result.stages.length,2);assert.equal(result.nativeBindingQualified,false);assert.equal(result.sourceInstalled,false);assert.deepEqual(result.segmentTrace.map(row=>row.phase),['language','repository']);for(const stage of result.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);assert.deepEqual(stage.trace.map(row=>row.phase),['language','repository']);}
});
test('513 logical rows can remain two bounded indexes while the old single-index builder retains its512-row refusal',()=>{
 const input=sample();for(let side=0;side<2;side++){const value=JSON.parse(input.segments[side].indexText);for(let at=0;at<(side===0?255:256);at++)value.rows.push(edge('unrelated-'+side+'-'+at,'fixture/unrelated-'+side+'-'+at+'.mjs',a,a));input.segments[side].indexText=JSON.stringify(value)+'\n';}
 const result=compose(input);assert.equal(result.after,c);assert.equal(result.stages.length,2);const rows=input.segments.flatMap(row=>JSON.parse(row.indexText).rows);assert.equal(rows.length,513);assert.throws(()=>extendExactSourceIndexCompactData({previous:index(rows),families:[]}),/index bound/);
});
test('no individual index may exceed512 rows or1MiB even when another segment has spare capacity',()=>{
 const input=sample(),data=JSON.parse(input.segments[0].indexText);for(let at=0;at<512;at++)data.rows.push(edge('extra-'+at,'fixture/extra-'+at+'.mjs',a,a));input.segments[0].indexText=JSON.stringify(data);assert.throws(()=>compose(input),/512/);const large=sample();large.segments[0].indexText+=' '.repeat(1048576);assert.throws(()=>compose(large),/bounded whole index/);
});
test('one path keeps the original64-edge bound across the complete segment union',()=>{
 const input={path:wanted,before:a,current:'export const value=64;\n',segments:[]};for(let part=0;part<2;part++){const rows=[],images=[];for(let at=part*32;at<(part+1)*32;at++){const next=selected('chain-'+at,'export const value='+at+';\n','export const value='+(at+1)+';\n');rows.push(next.row);images.push(...next.images);}input.segments.push(segment('part-'+part,rows,images));}assert.equal(compose(input).stages.length,64);const extra=selected('chain-64','export const value=64;\n','export const value=65;\n');input.segments.push(segment('part-two',[extra.row],extra.images));assert.throws(()=>compose(input),/64-edge/);
});
test('ambiguous, cyclic, duplicate-ID and conflicting-language histories remain refused',()=>{
 const ambiguous=sample(),branch=selected('branch',a,c);ambiguous.segments.push(segment('fork',[branch.row],branch.images));assert.throws(()=>compose(ambiguous),/ambiguous/);const cycle=sample(),back=selected('back',c,a);cycle.segments.push(segment('back',[back.row],back.images));assert.throws(()=>compose(cycle),/cyclic/);const duplicate=sample();duplicate.segments[1].indexText=duplicate.segments[0].indexText;assert.throws(()=>compose(duplicate),/unique complete index row/);const mixed=sample(),row=JSON.parse(mixed.segments[1].indexText);row.rows[0].language='TypeScript';mixed.segments[1].indexText=JSON.stringify(row);assert.throws(()=>compose(mixed),/one original language/);
});
test('unknown predecessor returns null, while a nonterminal current source remains nonauthoritative proposal DATA',()=>{
 const unknown=sample();unknown.before='unrecognized whole original source';assert.equal(compose(unknown),null);const prepared=sample();prepared.current=b;const result=compose(prepared);assert.equal(result.currentIsTerminal,false);assert.equal(result.currentInSelectedChain,true);assert.equal(result.semanticAuthority,false);assert.equal(result.sourceAuthority,false);const forged=sample();forged.current='saved public flags are not a source';assert.equal(compose(forged).currentInSelectedChain,false);
});
test('missing, edited, duplicate and unselected images refuse complete source composition',()=>{
 for(const kind of ['missing','edited','duplicate','unselected']){const input=sample();if(kind==='missing')input.segments[0].images.pop();if(kind==='edited')input.segments[0].images[0].source+=' ';if(kind==='duplicate')input.segments[0].images.push({...input.segments[0].images[0]});if(kind==='unselected')input.segments[0].images.push({path:'tools/translation/source-profiles/segment-fixture/unselected.txt',source:'ordinary unselected DATA'});assert.throws(()=>compose(input),TypeError);}
});
test('unsafe path coordinates, schema authority flags and inherited/accessor input fields cannot select a source',()=>{
 for(const path of ['../escape','/absolute','fixture//bad','fixture\\bad','fixture:x','fixture\u0000bad']){const input=sample();input.path=path;assert.throws(()=>compose(input));}const flagged=sample(),data=JSON.parse(flagged.segments[0].indexText);data.sourceAuthority=true;flagged.segments[0].indexText=JSON.stringify(data);assert.throws(()=>compose(flagged));let touched=0;const accessor=sample();Object.defineProperty(accessor,'current',{get(){touched++;return c;}});assert.throws(()=>compose(accessor));assert.equal(touched,0);const proxy=new Proxy(sample(),{get(){touched++;throw Error('must not execute');}});assert.throws(()=>compose(proxy));assert.equal(touched,0);
});
test('raw input plus every decoded index share one16MiB DATA budget',()=>{
 const input={path:wanted,before:a,current:a,segments:Array.from({length:34},(_,at)=>segment('large-'+at,[],[]))};for(const row of input.segments){const data=JSON.parse(row.indexText);data.scope='x'.repeat(250000);row.indexText=JSON.stringify(data);}assert.throws(()=>compose(input),/16MiB/);
});
test('a later invocation rechecks changed sources instead of retaining a positive graph or result',()=>{
 const input=sample();assert.equal(compose(input).after,c);input.segments[1].images[0].source+=' ';assert.throws(()=>compose(input));
});
