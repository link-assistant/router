// Source preparation only. Native descriptor DATA never grants source authority.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';

export const FIXED_NATIVE_DESCRIPTOR_BASELINE_SHA256='9c5255ac206087959f2cf2e2c3bd9eb9ad096a2d04648ff7bbdbaefee8cda219';
const HOST='tools/translation/original-json-intrinsics.mjs';
const FIXTURE='tools/translation/test/fixtures/fixed-native-descriptor/complete-original-host.mjs.gz';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Fixed native descriptor source: '+message);};
const REPLACEMENT=`function kindBatchedExpectedSamePrototype(owner,entries,rows){
 if(!(owner===arrayPrototype&&entries===arrayDescriptors&&rows===privateExpectedPlans[0]||owner===mapPrototype&&entries===mapDescriptors&&rows===privateExpectedPlans[1]||owner===setPrototype&&entries===setDescriptors&&rows===privateExpectedPlans[2]||owner===weakSetPrototype&&entries===weakSetDescriptors&&rows===privateExpectedPlans[3]||owner===syntaxStringPrototype&&entries===syntaxStrings&&rows===privateExpectedPlans[4]||owner===syntaxRegExpPrototype&&entries===syntaxRegexps&&rows===privateExpectedPlans[5]))return false;
 const names=keys(owner);if(names.length!==rows.length)return expectedSamePrototype(owner,entries,rows);
 for(let index=0;index<names.length;index++)if(names[index]!==rows[index][0])return expectedSamePrototype(owner,entries,rows);
 // Both captured descriptor operations must retain their original output realm.
 // The complete key census excludes lazy stack fields before any descriptor.
 if(prototype(objectHasOwn)!==objectPrototype||prototype(traversalDescriptors.value)!==prototype(objectDescriptor.value)||prototype(objectPrototype)!==null||descriptor(objectPrototype,'writable'))return expectedSamePrototype(owner,entries,rows);
 for(let index=0;index<names.length;index++){
  const row=rows[index],actual=descriptor(owner,names[index]);if(!actual)return false;
  const writable=actual.writable;if((writable!==undefined)!==row[1]||actual.enumerable!==row[2]||actual.configurable!==row[3])return false;
  if(row[1]){if(actual.value!==row[4]||writable!==row[5])return false;}
  else if(actual.get!==row[4]||actual.set!==row[5])return false;
 }
 return true;
}`;

export function fixedNativeDescriptorOriginalSource(root=fileURLToPath(new URL('../../',import.meta.url))){
 const bytes=gunzipSync(readFileSync(resolve(root,FIXTURE)),{maxOutputLength:262144});
 if(bytes.length!==70112||hash(bytes)!==FIXED_NATIVE_DESCRIPTOR_BASELINE_SHA256)fail('complete normal-Git baseline differs');
 const source=bytes.toString('utf8');if(!Buffer.from(source).equals(bytes))fail('complete baseline UTF8 differs');return source;
}
export function fixedNativeDescriptorSourcePair(root=fileURLToPath(new URL('../../',import.meta.url))){
 const before=fixedNativeDescriptorOriginalSource(root),ts=ownershipCompiler();
 if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 const syntax=ts.createSourceFile(HOST,before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const functions=syntax.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='kindBatchedExpectedSamePrototype');
 if(syntax.parseDiagnostics.length||functions.length!==1)fail('unique complete baseline function required');
 const node=functions[0],start=node.getStart(syntax),end=node.end,expected=before.slice(start,end);
 const after=before.slice(0,start)+REPLACEMENT+before.slice(end);
 if(ts.createSourceFile(HOST,after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)fail('complete proposed native grammar');
 return {path:HOST,before,after,expected,replacement:REPLACEMENT,span:[start,end],beforeSha256:hash(before),afterSha256:hash(after)};
}
export function prepareFixedNativeDescriptorCensus({root=fileURLToPath(new URL('../../',import.meta.url))}={}){
 const pair=fixedNativeDescriptorSourcePair(root),current=readFileSync(resolve(root,HOST),'utf8');
 if(current!==pair.before&&current!==pair.after)fail('unexpected complete current host');
 const first=transportConcreteSyntaxSource(pair.before,{language:'JavaScript'});
 // Complete source substitution also works when the lossless CST retains an
 // opaque region across the native function boundary. Native spans above
 // independently restrict the actual semantic edit to this one declaration.
 const sequence={languageRules:[{id:'javascript:fixed-native-descriptor-DATA-census',edits:[{span:[0,pair.before.length],expected:pair.before,replacement:pair.after}]}],repositoryRules:[{id:'router:retain-existing-six-owner-guard-domain',edits:[]}]};
 const run=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value);
 if(transportConcreteSyntaxMeta(afterMeta).source!==pair.after)fail('complete output CST differs');
 const inverse=applyConcreteSyntaxSubstitutions(run.value,{languageRules:[{id:'javascript:complete-descriptor-census-inverse',edits:[{span:[0,pair.after.length],expected:pair.after,replacement:pair.before}]}],repositoryRules:[]});
 if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==pair.before)fail('complete inverse differs');
 return {schema:'fixed-native-descriptor-census-source-v1',files:[{...pair,before:current,original:pair.before,beforeMeta:serializeConcreteSyntaxMeta(first.document),afterMeta,sequence,trace:run.trace,inverse:pair.before}],newCaches:false,originalRetentionPolicyUnchanged:true,sourceAuthority:false,runtimeAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))fail('Usage: prepare-fixed-native-descriptor-census.mjs --emit|--check');
 const result=prepareFixedNativeDescriptorCensus();if(args[0]==='--check'){if(result.files.some(row=>row.before!==row.after))fail('complete current host is stale');console.log('Fixed native descriptor source producer is current; no source authority.');}else console.log(JSON.stringify(result));
}
