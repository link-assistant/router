import {undoPrivateParserHostAppend645,currentPrivateParserPacketPins645} from './private-parser-host-append-645.mjs';
// Test-only immutable before graph. No source/type/owner/runtime authority.
// Complete original notices/licenses are materialized with every registered row.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,realpathSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const hash=value=>createHash('sha256').update(value).digest('hex');
const archiveURL=new URL('./fixtures/private-parser-historical-288/registered-inputs.json.gz',import.meta.url);
const archiveHash='71749f6d1f886f369e8e957a80e9b0dd12eade75fd03ede705b204368f7abc15';
const expected=[{"path":"source-profiles/private-parser-execution/manifest.json","bytes":20304,"sha256":"bf1da3f38f01835b3c612b6ecd9da3d51f0b18d8a84363b319efc1320a11d5f0"},{"path":"vendor/formal-ai/lexer.mjs","bytes":9236,"sha256":"de63554d12ba030a9a8cf82b3d950d8baa07f55dd20623e711b4a292a6d8f94d"},{"path":"rust-item-boundaries.mjs","bytes":2795,"sha256":"4487a37155041881c9519b1cd0fa8f141199189497835cf5be8524c9170156f6"},{"path":"rust-structure.mjs","bytes":3853,"sha256":"ea09bde0452ff0e8021454e2c0040b6bdd8493163b0ab48cea496353e6b92261"},{"path":"vendor/meta-language/translation/diagnostics.js","bytes":907,"sha256":"a5d8ddf02252f016b8568373248b67165b37ce747442a21a7bef3c63e2a385ab"},{"path":"vendor/meta-language/translation/frontend-rules.js","bytes":19004,"sha256":"8b4a1a0f3a6180d4b98591206946fb05422f65869c939f3b263da1f8bfded1ed"},{"path":"vendor/meta-language/translation/lexer.js","bytes":16109,"sha256":"70dbe490cd5162661a665bdffd5b506093bebc5a515f6fc1d36ecc347b705fdc"},{"path":"private-parser-inputs/concrete-syntax-original.mjs","bytes":22540,"sha256":"127226ca4dc71123bb96a45a9a91fc120914f1464ac4fec05634fa54a61421b3"},{"path":"vendor/formal-ai/LICENSE","bytes":1211,"sha256":"6b0382b16279f26ff69014300541967a356a666eb0b91b422f6862f6b7dad17e"},{"path":"vendor/meta-language/LICENSE","bytes":1211,"sha256":"6b0382b16279f26ff69014300541967a356a666eb0b91b422f6862f6b7dad17e"},{"path":"vendor/NOTICE.md","bytes":2076,"sha256":"827d7d26ecc3da802b161c955fb78bec7ba1845969d28461d3ef951b6e70d34e"},{"path":"vendor/upstream-lock.json","bytes":3043,"sha256":"ee126e234437d23b62fefa4f4c6b59baa09f89918613412570d32bfd652a50c1"},{"path":"source-profiles/private-parser-execution/NOTICE","bytes":814,"sha256":"1f2c0c47d5612e4358ce860ed7a4d1c9234a1193cd5475b9186f23fdd066e8ac"},{"path":"original-json-intrinsics.mjs","bytes":42398,"sha256":"220c7bc992a8e18d48ad4bc1af7b6a05555a29cc2fc29da1ade67d7af63d72d0"},{"path":"private-parser-sha256.mjs","bytes":5106,"sha256":"1b61d3a76ec55522314cc1354c78e74f9c08e34fa64ec1f2d3c14faf1681ac42"}];
const currentPacketPins=currentPrivateParserPacketPins645;
const STANDARD_RUN_EDITS_339=[{"expected":"  const entries=snapshots[slot],rows=[];\n  for(let index=0;index<entries.length;index++){\n   const entry=entries[index],field=entry[1],data=hasOwn(field,'value');\n   rows[index]=apply(syntaxFreeze.value,originalObject,[[entry[0],data,field.enumerable,field.configurable,data?field.value:field.get,data?field.writable:field.set]]);\n  }\n","replacement":"  const entries=snapshots[slot],rows=[];let standardEnd=0;\n  for(let index=0;index<entries.length;index++){\n   const entry=entries[index],field=entry[1],data=hasOwn(field,'value');\n   if(index>=standardEnd)standardEnd=privateExpectedStandardRunEnd(entries,index);\n   rows[index]=apply(syntaxFreeze.value,originalObject,[[entry[0],data,field.enumerable,field.configurable,data?field.value:field.get,data?field.writable:field.set,standardEnd]]);\n  }\n"},{"expected":" const names=keys(owner);if(names.length!==rows.length)return false;\n for(let index=0;index<names.length;index++){\n  const row=rows[index],key=row[0];if(names[index]!==key)return false;\n  // Preserve the exact old per-key descriptor read, before the NEXT key test.\n","replacement":" const names=keys(owner);if(names.length!==rows.length)return false;\n for(let index=0;index<names.length;index++){\n  const end=rows[index][6];\n  if(end){\n   for(;index<end;index++){\n    const row=rows[index],key=row[0];if(names[index]!==key)return false;\n    const actual=descriptor(owner,key);if(!actual||!hasOwn(actual,'value'))return false;\n    if(actual.enumerable!==false||actual.configurable!==true)return false;\n    if(actual.value!==row[4]||actual.writable!==true)return false;\n   }\n   index--;continue;\n  }\n  const row=rows[index],key=row[0];if(names[index]!==key)return false;\n  // Preserve the exact old per-key descriptor read, before the NEXT key test.\n"}];
const STANDARD_RUN_APPEND_339="\n// Only immutable EXPECTED flags determine these runs. Live keys, descriptors,\n// own-value checks and comparison order are still observed on every call.\nfunction privateExpectedStandardRunEnd(entries,start){\n let end=start;\n while(end<entries.length){\n  const field=entries[end][1];\n  if(!hasOwn(field,'value')||field.enumerable!==false||field.configurable!==true||field.writable!==true)break;\n  end++;\n }\n return end>start?end:0;\n}\n";
function beforeStandardRuns339(source){
 source=undoPrivateParserHostAppend645(source);
 assert.equal(source.split(STANDARD_RUN_APPEND_339).length,2);assert.ok(source.endsWith(STANDARD_RUN_APPEND_339));
 let value=source.slice(0,-STANDARD_RUN_APPEND_339.length);
 for(let at=STANDARD_RUN_EDITS_339.length-1;at>=0;at--){const row=STANDARD_RUN_EDITS_339[at];assert.equal(value.split(row.replacement).length,2);value=value.replace(row.replacement,row.expected);}
 return value;
}
const packets=new WeakMap();let packetSerial=0;
export function validateHistoricalPrivateParserArchive(bytes){
 assert.equal(bytes.length,38762);assert.equal(hash(bytes),archiveHash);
 const raw=gunzipSync(bytes,{maxOutputLength:262144}),packet=JSON.parse(raw.toString('utf8'));
 assert.deepEqual(Object.keys(packet),['schema','base','authority','files']);
 assert.equal(packet.schema,'router-test-historical-private-parser-inputs-v1');assert.equal(packet.base,'c24c85e0db5f2a5d1a0598a39b2fccde05f3b660');
 assert.deepEqual(packet.authority,{type:false,owner:false,executable:false});assert.equal(packet.files.length,15);
 for(let at=0;at<expected.length;at++){
  const row=packet.files[at],pin=expected[at];assert.deepEqual(Object.keys(row),['path','bytes','sha256','source']);
  assert.equal(row.path,pin.path);assert.equal(row.bytes,pin.bytes);assert.equal(row.sha256,pin.sha256);assert.equal(typeof row.source,'string');
  assert.equal(Buffer.byteLength(row.source),pin.bytes);assert.equal(hash(row.source),pin.sha256);
 }
 return {packet,raw:raw.toString('utf8')};
}
export function historicalPrivateParserPacket(t,retain){
 if(packets.has(t))return packets.get(t);
 const bytes=readFileSync(archiveURL),{packet,raw}=validateHistoricalPrivateParserArchive(bytes),id=++packetSerial,root=realpathSync(mkdtempSync(join(tmpdir(),'router-historical-parser-288-'))),files=[];
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 for(const row of packet.files){const path=join(root,row.path);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,row.source,{flag:'wx'});const readback=readFileSync(path,'utf8');files.push({...row,logicalPath:row.path,path,readback});assert.equal(readback,row.source);}
 const probes=new Map(),result={root,packet,files,url:relative=>pathToFileURL(join(root,relative)).href,
  probe(sharedURL){
   if(probes.has(sharedURL))return probes.get(sharedURL);
   const source="import {calls} from "+JSON.stringify(sharedURL)+";\nimport {independentParserSha256 as original} from './private-parser-sha256.mjs';\nexport function independentParserSha256(source){calls.push(source);return original(source);}";
   const path=join(root,'sha-probe-'+probes.size+'.mjs');writeFileSync(path,source,{flag:'wx'});const readback=readFileSync(path,'utf8');assert.equal(readback,source);retain('historical-'+id+'-probe-'+probes.size,{source,path,readback,originalShaURL:result.url('private-parser-sha256.mjs'),sharedURL});const url=pathToFileURL(path).href;probes.set(sharedURL,url);return url;
  }};
 retain('historical-'+id+'-complete-288-graph',{archiveHash,archiveBytes:bytes.length,archiveBase64:bytes.toString('base64'),raw,root,files,authority:packet.authority});packets.set(t,result);return result;
}
function currentGraph(tool,historical){
 const manifestPath='source-profiles/private-parser-execution/manifest.json',text=readFileSync(join(tool,manifestPath),'utf8'),manifest=JSON.parse(text),rows=[{path:manifestPath},...manifest.sources,...manifest.licenses,...manifest.notices,...manifest.hostInputs];assert.equal(rows.length,15);
 const files=rows.map((row,index)=>{assert.equal(row.path,historical.packet.files[index].path);const source=readFileSync(join(tool,row.path),'utf8');if(index){assert.equal(Buffer.byteLength(source),row.bytes);assert.equal(hash(source),row.sha256);}return {path:row.path,source,bytes:Buffer.byteLength(source),sha256:hash(source)};});
 const oldManifest=JSON.parse(historical.packet.files[0].source),undo=structuredClone(manifest);undo.hostInputs=oldManifest.hostInputs;assert.deepEqual(undo,oldManifest);assert.equal(JSON.stringify(undo,null,2)+'\n',historical.packet.files[0].source);assert.equal(JSON.stringify(manifest,null,2)+'\n',text);
 for(const pin of currentPacketPins){const file=files.find(row=>row.path===pin.path);assert.equal(file.bytes,pin.bytes);assert.equal(file.sha256,pin.sha256);}
 const changed=new Set([manifestPath,'original-json-intrinsics.mjs','private-parser-sha256.mjs']);
 for(let at=0;at<files.length;at++)if(!changed.has(files[at].path))assert.equal(files[at].source,historical.packet.files[at].source);
 const originalCommon=beforeStandardRuns339(files[13].source);
 assert.equal(Buffer.byteLength(originalCommon),52924);assert.equal(hash(originalCommon),'8af94b86a037977ee6d1567bb7055d96c3995518244f5389405bb6b55bc4e351');
 assert.equal(originalCommon.slice(0,historical.packet.files[13].source.length),historical.packet.files[13].source);
 // Exact reviewed ASCII-word packing is the only additional body evolution.
 const asciiWordPacking="    // Four ASCII code units are exactly four UTF8 bytes and one big-endian\n    // input word. Non-ASCII, unaligned input and tails retain the scalar path.\n    if(pendingBytes===0&&code<128&&at+3<source.length){\n      const b=source.charCodeAt(at+1),c=source.charCodeAt(at+2),d=source.charCodeAt(at+3);\n      if((b|c|d)<128){\n        words[wordIndex++]=(code<<24)|(b<<16)|(c<<8)|d;payloadBytes+=4;at+=3;\n        if(wordIndex===16){compress();wordIndex=0;}continue;\n      }\n    }\n";
 const normalizedSha=files[14].source.replaceAll('originalPrivateParserNumericCommonIntrinsicsUnchanged','originalPrivateParserExpectedCommonIntrinsicsUnchanged');
 assert.equal(normalizedSha.split(asciiWordPacking).length,2);
 assert.equal(normalizedSha.replace(asciiWordPacking,''),historical.packet.files[14].source);
 return files;
}
function sameFields(actual,expected,omitted=[]){
 const left={...actual},right={...expected};for(const key of omitted){delete left[key];delete right[key];}assert.deepEqual(left,right);
}
function nativeRecipe(tape,files){
 assert.ok(Array.isArray(tape)&&tape.length>0&&tape.length<=720&&tape.length%60===0);const auth=tape.length/60,rows=[];
 for(let packet=0;packet<auth;packet++)for(let slot=0;slot<15;slot++)for(let lane=0;lane<2;lane++){
  const at=(packet*30+slot*2+lane)*2,update=tape[at],digest=tape[at+1],file=files[slot],input=Object.hasOwn(update,'input')?'input':'source',value=Object.hasOwn(digest,'value')?'value':'result';
  assert.equal(update.phase,'update');assert.equal(digest.phase,'digest');assert.equal(update[input],file.source);assert.equal(digest[value],file.sha256);assert.deepEqual(digest.args,['hex']);
  assert.equal(update.inputKind,lane===0?'object':'string');assert.equal(update.argCount,1);assert.deepEqual(update.extraArgs,[]);assert.equal(update.returnedThis,true);assert.equal(update.receiverOwnPrototype,true);assert.equal(digest.receiverIsUpdated,true);assert.equal(digest.argCount,1);
  rows.push({packet,slot,lane,at,input,value,path:file.path});
 }return rows;
}
function readRecipe(reads,files,auth){
 assert.ok(Array.isArray(reads)&&reads.length<=1440);const groups=[];let at=0;
 for(let packet=0;packet<auth;packet++)for(let slot=0;slot<15;slot++){
  const file=files[slot],bytes=Buffer.from(file.source),indices=[];let position=0,fd;
  while(position<bytes.length){
   const row=reads[at];assert.ok(row);if(fd===undefined)fd=row.fd;assert.equal(row.fd,fd);assert.ok(Number.isInteger(fd)&&fd>=0);assert.equal(row.thisUndefined,true);assert.equal(row.argCount??row.args,5);assert.equal(row.offset,position);assert.equal(row.position,position);assert.equal(row.length,bytes.length-position);assert.ok(Number.isInteger(row.count)&&row.count>0&&row.count<=bytes.length-position);
   const buffer=Buffer.alloc(bytes.length);bytes.copy(buffer,0,0,position+row.count);assert.equal(row.bytes,buffer.toString('base64'));assert.equal(row.source,buffer.toString('utf8'));indices.push(at++);position+=row.count;
  }
  const row=reads[at];assert.ok(row);assert.equal(row.fd,fd);assert.equal(row.thisUndefined,true);assert.equal(row.argCount??row.args,5);assert.equal(row.offset,0);assert.equal(row.position,bytes.length);assert.equal(row.length,1);assert.equal(row.count,0);assert.equal(row.bytes,'AA==');assert.equal(row.source,'\0');indices.push(at++);groups.push({packet,slot,path:file.path,indices});
 }
 assert.equal(at,reads.length);return groups;
}
// This comparator never authorizes source: both actual engines authenticate
// their OWN immutable/current full graphs. Only the test observations evolve.
export function assertPrivateParserPacketEvolution(t,retain,label,before,current,tool){
 const historical=historicalPrivateParserPacket(t,retain),oldFiles=historical.packet.files,newFiles=currentGraph(tool,historical),changes=[];
 for(let at=0;at<oldFiles.length;at++)if(oldFiles[at].source!==newFiles[at].source)changes.push({slot:at,path:oldFiles[at].path,before:oldFiles[at],after:newFiles[at]});
 const recipe={before,current,oldFiles,newFiles,changes,forward:[],inverse:[]};retain(label+'-raw-evolution',recipe);
 assert.deepEqual(current.result,before.result);assert.equal(before.tape.length,current.tape.length);const oldNative=nativeRecipe(before.tape,oldFiles),newNative=nativeRecipe(current.tape,newFiles);assert.deepEqual(oldNative,newNative);
 const forward=structuredClone(before),inverse=structuredClone(current),changed=new Set(changes.map(row=>row.slot));
 for(const row of oldNative){
  const oldUpdate=before.tape[row.at],newUpdate=current.tape[row.at],oldDigest=before.tape[row.at+1],newDigest=current.tape[row.at+1];
  sameFields(newUpdate,oldUpdate,changed.has(row.slot)?[row.input]:[]);sameFields(newDigest,oldDigest,changed.has(row.slot)?[row.value]:[]);
  if(changed.has(row.slot)){forward.tape[row.at][row.input]=newFiles[row.slot].source;forward.tape[row.at+1][row.value]=newFiles[row.slot].sha256;inverse.tape[row.at][row.input]=oldFiles[row.slot].source;inverse.tape[row.at+1][row.value]=oldFiles[row.slot].sha256;recipe.forward.push({at:row.at,...row,before:oldFiles[row.slot].sha256,after:newFiles[row.slot].sha256});}
 }
 const auth=before.tape.length/60;assert.equal(before.independent.length,auth*15);assert.equal(current.independent.length,auth*15);
 for(let at=0;at<before.independent.length;at++){const slot=at%15;assert.equal(before.independent[at],oldFiles[slot].source);assert.equal(current.independent[at],newFiles[slot].source);if(changed.has(slot)){forward.independent[at]=newFiles[slot].source;inverse.independent[at]=oldFiles[slot].source;}else assert.equal(before.independent[at],current.independent[at]);}
 const oldReads=readRecipe(before.reads,oldFiles,auth),newReads=readRecipe(current.reads,newFiles,auth);assert.equal(oldReads.length,newReads.length);
 for(let group=0;group<oldReads.length;group++){
  const left=oldReads[group],right=newReads[group];assert.equal(left.path,right.path);assert.equal(left.indices.length,right.indices.length);
  for(let i=0;i<left.indices.length;i++){
   const a=left.indices[i],b=right.indices[i],old=before.reads[a],now=current.reads[b],mutable=['fd'];
   if(changed.has(left.slot)){
    mutable.push('bytes','source','count','length','position');if(i<left.indices.length-1){assert.equal(old.offset,now.offset);assert.equal(old.position,now.position);if(old.count!==now.count){assert.equal(old.offset+old.count,oldFiles[left.slot].bytes);assert.equal(now.offset+now.count,newFiles[left.slot].bytes);}}
   }
   sameFields(now,old,mutable);for(const key of mutable){forward.reads[a][key]=now[key];inverse.reads[b][key]=old[key];}
   recipe.forward.push({read:a,path:left.path,oldFd:old.fd,currentFd:now.fd,fields:mutable,before:old,after:now});
  }
 }
 recipe.inverse=recipe.forward.map(row=>row.at===undefined?{...row,before:row.after,after:row.before}:{...row,before:row.after,after:row.before});recipe.forwardObservation=forward;recipe.inverseObservation=inverse;retain(label+'-reversible-evolution',recipe);
 assert.deepEqual(forward,current);assert.deepEqual(inverse,before);return recipe;
}
