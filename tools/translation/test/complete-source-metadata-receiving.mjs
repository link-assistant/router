// Test receiving DATA only. Every original metadata assertion gets its own
// complete two-build import; batching shares only source authentication.
import assert from 'node:assert/strict';
import {transportConcreteSyntaxMetaChunks,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

export function receiveCompleteSourceMetadata(rows){
 const metas=rows.flatMap(row=>[row.beforeMeta,row.afterMeta,...row.stages.flatMap(stage=>[stage.beforeMeta,stage.afterMeta])]);
 assert.ok(metas.length>0&&metas.length<=256);
 assert.ok(metas.every(meta=>typeof meta==='string'));
 // Preserve the existing aggregate budgets. Canonical node cells each occupy
 // more than ten code units; this smaller wire cap also bounds source/UTF8.
 // Large individual documents keep the complete original single import.
 let offset=0,end=0,received=[],batchOffset=0;
 const importNextBatch=()=>{
  assert.equal(batchOffset,received.length);
  received=[];batchOffset=0;
  if(metas[offset].length>2000000){end=offset+1;received=[transportConcreteSyntaxMeta(metas[offset])];return;}
  let units=0;end=offset;
  while(end<metas.length&&units+metas[end].length<=2000000){units+=metas[end].length;end++;}
  const packet=transportConcreteSyntaxMetaChunks([metas.slice(offset,end)]);
  assert.equal(packet.totals.rows,end-offset);received=packet.chunks[0].rows.slice();
 };
 return {
  next(meta){assert.ok(offset<metas.length,'each original metadata import is consumed once');assert.equal(meta,metas[offset]);if(offset===end)importNextBatch();const result=received[batchOffset];received[batchOffset++]=undefined;offset++;assert.equal(result.meta,meta);return result;},
  finish(){assert.equal(offset,metas.length,'every original metadata import remains asserted');},
 };
}
