// Invocation-local DATA handling only. The executor supplies its captured
// reflection operations and actual authenticated private concrete functions.
// Neither helper returns a function, parser frame, source permit or cache.
const SOURCE=2097152,BYTES=8388608,SERIAL=33554432,RULES=256,EDITS=16384;
export function privateConcretePrimitiveUtf8Bytes(source){
 let bytes=0;for(let at=0;at<source.length;at++){const code=source.charCodeAt(at);if(code>=55296&&code<=56319&&at+1<source.length){const low=source.charCodeAt(at+1);if(low>=56320&&low<=57343){bytes+=4;at++;continue;}}bytes+=code<128?1:code<2048?2:3;}return bytes;
}
export function capturePrivateConcreteSubstitutionRequests(input,ops){
 const {proxy,descriptor,prototype,keys,own,array,objectPrototype,arrayPrototype,define,fail}=ops,snapshots=[];let textUnits=0,rules=0,edits=0,units=0,bytes=0;
 function text(value,limit,label){if(typeof value!=='string'||value.length>limit)fail('substitution '+label+' bounded primitive text required');textUnits+=value.length;if(textUnits>SERIAL)fail('substitution aggregate primitive text budget');return value;}
 function record(value,expected,label){
  if(!value||typeof value!=='object'||proxy(value)||array(value))fail('substitution '+label+' own-data record required');const parent=prototype(value);if(parent!==objectPrototype&&parent!==null)fail('substitution '+label+' prototype differs');const names=keys(value);
  // Unknown keys, including a lazy native stack, are refused before ANY field
  // descriptor is obtained. A tolerated inherited `get` is never consulted.
  if(names.length!==expected.length)fail('substitution '+label+' exact record shape required');for(const key of names)if(typeof key!=='string'||!expected.includes(key))fail('substitution '+label+' unknown key');
  const fields=[],copy={__proto__:null};for(const key of names){const field=descriptor(value,key);if(!field||!own(field,'value')||field.enumerable!==true)fail('substitution '+label+' enumerable own data required');fields.push(field);define(copy,key,{__proto__:null,value:field.value,enumerable:true,writable:true,configurable:true});}
  snapshots.push({value,parent,names,fields});return copy;
 }
 function dense(value,max,label){
  if(!value||typeof value!=='object'||proxy(value)||!array(value)||prototype(value)!==arrayPrototype)fail('substitution '+label+' ordinary dense array required');const names=keys(value),length=descriptor(value,'length');
  if(!length||!own(length,'value')||typeof length.value!=='number'||length.value<0||length.value>max||length.value%1||names.length!==length.value+1)fail('substitution '+label+' array budget or shape');
  for(let at=0;at<names.length;at++)if(names[at]!==''+at&&!(at===length.value&&names[at]==='length'))fail('substitution '+label+' array keys differ');
  const fields=[],copy=[];for(let at=0;at<names.length;at++){const field=descriptor(value,names[at]);if(!field||!own(field,'value')||at<length.value&&field.enumerable!==true)fail('substitution '+label+' array own data required');fields.push(field);if(at<length.value)copy.push(field.value);}snapshots.push({value,parent:arrayPrototype,names,fields});return copy;
 }
 function sequence(value){
  const original=record(value,['languageRules','repositoryRules'],'sequence'),result={languageRules:[],repositoryRules:[]};
  for(const phase of ['languageRules','repositoryRules'])for(const supplied of dense(original[phase],RULES,'rules')){
   if(++rules>RULES)fail('substitution aggregate rule budget');const rule=record(supplied,['id','edits'],'rule'),next={id:text(rule.id,160,'rule ID'),edits:[]};
   for(const suppliedEdit of dense(rule.edits,4096,'edits')){
    if(++edits>EDITS)fail('substitution aggregate edit budget');if(!suppliedEdit||typeof suppliedEdit!=='object'||proxy(suppliedEdit)||array(suppliedEdit))fail('substitution edit own data required');const names=keys(suppliedEdit),hasNode=names.includes('node'),hasSpan=names.includes('span');if(hasNode===hasSpan)fail('substitution edit requires one selector');
    const edit=record(suppliedEdit,[hasNode?'node':'span','expected','replacement'],'edit'),copy={expected:text(edit.expected,SOURCE,'expected'),replacement:text(edit.replacement,SOURCE,'replacement')};
    if(hasNode)copy.node=edit.node;else{copy.span=dense(edit.span,2,'span');if(copy.span.length!==2)fail('substitution span length');}
    // The actual private editSnapshot/rulesSnapshot still independently
    // validate selectors, IDs, bounds, overlap and exact source boundaries.
    if(hasNode&&(typeof copy.node!=='number'||copy.node<0||copy.node>9007199254740991||copy.node%1))fail('substitution numeric node selector required');
    if(!hasNode)for(const value of copy.span)if(typeof value!=='number'||value<0||value>9007199254740991||value%1)fail('substitution numeric span selector required');
    next.edits.push(copy);
   }
   result[phase].push(next);
  }
  return result;
 }
 const suppliedRows=dense(input,256,'rows');if(!suppliedRows.length)fail('substitution nonempty batch required');const rows=[];
 for(const supplied of suppliedRows){
  const row=record(supplied,['source','language','stages'],'row'),source=text(row.source,SOURCE,'source'),language=text(row.language,160,'language');if(!['Rust','JavaScript','TypeScript'].includes(language))fail('substitution source language differs');units+=source.length;bytes+=privateConcretePrimitiveUtf8Bytes(source);if(units>SOURCE||bytes>BYTES)fail('substitution aggregate input source budget');
  const stages=dense(row.stages,2,'stages');if(stages.length!==2)fail('substitution language then repository stages required');const next=[];
  for(let at=0;at<2;at++){
   const stage=record(stages[at],['phase','expected','sequence','inverseSequence'],'stage'),phase=at===0?'language':'repository';if(stage.phase!==phase)fail('substitution fixed phase order required');const forward=sequence(stage.sequence),inverse=sequence(stage.inverseSequence),inactive=at===0?'repositoryRules':'languageRules';if(forward[inactive].length||inverse[inactive].length)fail('substitution stage has another active phase');
   next.push({phase,expected:text(stage.expected,SOURCE,'stage source'),sequence:forward,inverseSequence:inverse});
  }
  rows.push({source,language,stages:next});
 }
 return {rows,snapshots,units,bytes,textUnits,rules,edits};
}
export function executePrivateConcreteSubstitutionRow(row,operations,fail){
 const first=operations.source(row.source,row.language),stages=[];let document=first.document,canonical=0;
 if(first.source!==row.source||document.language!==row.language)fail('substitution complete initial source association differs');
 for(const stage of row.stages){
  const from=document.source,beforeMeta=operations.serialize(document),fresh=operations.transport(beforeMeta,'Rust',true);if(fresh.source!==from)fail('substitution complete current phase source differs');
  const run=operations.substitute(fresh.document,stage.sequence),afterMeta=operations.serialize(run.value),last=operations.transport(afterMeta,'Rust',true);if(last.source!==stage.expected||last.document.language!==row.language)fail('substitution complete phase source equation differs');
  const inverse=operations.substitute(last.document,stage.inverseSequence),inverseMeta=operations.serialize(inverse.value),restored=operations.transport(inverseMeta,'Rust',true);if(restored.source!==from||restored.meta!==beforeMeta)fail('substitution complete phase inverse differs');
  canonical+=beforeMeta.length+afterMeta.length+inverseMeta.length;if(canonical>SERIAL)fail('substitution row canonical budget');
  stages.push({phase:stage.phase,before:from,after:last.source,beforeMeta,afterMeta,trace:run.trace,completeInverse:true});document=last.document;
 }
 // Each phase's complete inverse above restores its exact canonical CST.
 // Their checked source joins establish the whole inverse in reverse phase
 // order, retaining the original producer's complete two inverse operations.
 if(stages.length!==2||stages[0].before!==row.source||stages[0].after!==stages[1].before||stages[1].after!==document.source)fail('substitution complete phase/inverse composition differs');
 const fragment={beforeMeta:first.meta,afterMeta:operations.serialize(document),inverse:row.source,stages,trace:stages.flatMap(stage=>stage.trace)},wire=operations.stringify(fragment),wireBytes=privateConcretePrimitiveUtf8Bytes(wire);
 if(wire.length>SERIAL||wireBytes>SERIAL)fail('substitution row primitive result budget');
 return {wire,nodes:document.nodes.length,canonicalCodeUnits:wire.length,canonicalUtf8Bytes:wireBytes,sourceCodeUnits:document.source.length,utf8Bytes:document.sourceEncoding.utf8Bytes};
}
