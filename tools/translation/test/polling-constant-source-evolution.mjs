// Test data for the exact earlier compatibility migration, never an issuer.
import assert from 'node:assert/strict';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {readFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {writeJsonGzip} from '../../evidence/write-json-gzip.mjs';

const fixtures=new URL('./fixtures/polling-constant-parent-evolution/',import.meta.url);
const root=new URL('../../../',import.meta.url),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const MANIFEST_SHA='131ec8e9f46e27cb4e9b85897048168d31f170e48e89c7f0b1e3b8fa1313da52';
let serial=0; // Retained-vector filenames only; no source or result is saved.
export function pollingEvolutionData(){
 const raw=readFileSync(new URL('manifest.json',fixtures));assert.equal(raw.length,13666);assert.equal(hash(raw),MANIFEST_SHA);
 const manifest=JSON.parse(raw);assert.equal(manifest.schema,'polling-constant-parent-evolution-data-v1');assert.equal(manifest.sourceAuthority,false);assert.equal(manifest.rows.length,2);return manifest;
}
export function pollingEvolutionText(pin){
 const packed=readFileSync(new URL(pin.file,fixtures));assert.equal(packed.length,pin.archiveBytes);assert.equal(hash(packed),pin.archiveSha256);
 const raw=gunzipSync(packed,{maxOutputLength:65536});assert.equal(raw.length,pin.bytes);assert.equal(hash(raw),pin.sha256);
 if(pin.gitBlobSha)assert.equal(createHash('sha1').update(Buffer.from('blob '+raw.length+'\0')).update(raw).digest('hex'),pin.gitBlobSha);
 return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);
}
function oldPin(row){const pin=row.priorPin;return {...pin,nanos:BigInt(pin.nanos)};}
export function pollingConstantSourceEvolution(previousPin,vectorDirectory){
 const manifest=pollingEvolutionData(),matches=manifest.rows.filter(row=>row.path===previousPin.path);assert.equal(matches.length,1,'exact evolved polling parent required');
 const row=matches[0];assert.deepEqual(previousPin,oldPin(row),'complete original oracle pin required');
 const before=pollingEvolutionText(row.before),after=pollingEvolutionText(row.after),current=readFileSync(repositorySourceURL(row.path,root),'utf8');assert.equal(current,after,'complete current parent changed');
 const input=transportConcreteSyntaxSource(before,{language:'Rust'});assert.equal(transportConcreteSyntaxMeta(input.meta).source,before);
 const languageRules=[{id:'rust:retain-complete-polling-constant-parent',edits:[]}];
 const forward=applyConcreteSyntaxSubstitutions(input.document,{languageRules,repositoryRules:[{id:'router:replay-authorized-owned-alias-migration-data',edits:row.edits}]});
 const output=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(forward.value));assert.equal(output.source,after);
 const inverse=applyConcreteSyntaxSubstitutions(output.document,{languageRules,repositoryRules:[{id:'router:restore-complete-pre-adoption-parent-data',edits:row.inverse}]});
 const restored=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value));assert.equal(restored.source,before);
 let oldEnd=0,newEnd=0,selected=null,changed=0;
 for(const part of row.partitions){
  assert.equal(part.before[0],oldEnd);assert.equal(part.after[0],newEnd);assert.ok(part.before[1]>=oldEnd&&part.after[1]>=newEnd);
  if(part.kind==='unchanged'){
   assert.equal(before.slice(...part.before),after.slice(...part.after));
   if(part.before[0]<=previousPin.span[0]&&previousPin.span[1]<=part.before[1]){assert.equal(selected,null);selected=part;}
  }else{assert.equal(part.kind,'substitution');const edit=row.edits[changed++];assert.deepEqual(part.before,edit.span);assert.equal(before.slice(...part.before),edit.expected);assert.equal(after.slice(...part.after),edit.replacement);}
  oldEnd=part.before[1];newEnd=part.after[1];
 }
 assert.equal(oldEnd,before.length);assert.equal(newEnd,after.length);assert.equal(changed,row.edits.length);assert.ok(selected,'entire original constant must be in one unchanged partition');
 const span=previousPin.span.map(value=>value+selected.after[0]-selected.before[0]);assert.deepEqual(span,row.afterSpan);
 const declaration=before.slice(...previousPin.span);assert.equal(declaration,row.unchangedDeclaration);assert.equal(declaration,after.slice(...span));assert.equal(hash(declaration),previousPin.declarationSha);
 const pin=Object.freeze({...previousPin,sourceSha:row.after.sha256,span:Object.freeze(span)});
 const result={manifest,row,before,after,input,forward,output,inverse,restored,pin,sourceAuthority:false,namespaceAuthority:false,runtimeParity:false};
 assert.equal(readFileSync(repositorySourceURL(row.path,root),'utf8'),current,'current complete source changed during proof');pollingEvolutionData();
 if(vectorDirectory){mkdirSync(vectorDirectory,{recursive:true});writeJsonGzip(join(vectorDirectory,String(++serial).padStart(3,'0')+'-'+row.path.replaceAll('/','_')+'.json.gz'),result,(_key,value)=>typeof value==='bigint'?{$integer:value.toString()}:value);}
 return result;
}
export function currentPollingConstantPin(previousPin,vectorDirectory){
 if(previousPin.path!=='src/login_pty.rs'&&previousPin.path!=='src/durable_file.rs')return previousPin;
 return pollingConstantSourceEvolution(previousPin,vectorDirectory).pin;
}
