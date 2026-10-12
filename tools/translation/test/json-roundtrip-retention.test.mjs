import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {compileOriginalDigitRetentionControl,projectOriginalDigitRetention} from '../arithmetic-digit-retention.mjs';
import {JSON_ROUNDTRIP_RETENTION_SOURCES} from '../extensions/json-roundtrip-retention-source.mjs';
import {loadJsonMacroSourceProof,jsonMacroOriginalSource} from '../json-macro-sources.mjs';
import {sourceLexicalMantissa,JSON_LEXICAL_MAX_MANTISSA_DIGITS,lexicalTruncatedTrace} from '../extensions/json-roundtrip-lexical.mjs';
import {serde_json_roundtrip_from_str,serde_json_roundtrip_from_slice} from '../extensions/json-roundtrip-runtime.mjs';
import {roundPositiveRationalBinary64} from '../extensions/exact-binary64.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex'),config={functionName:'parse_mantissa',trait:'Float',target:'f64'};
const source=JSON_ROUNDTRIP_RETENTION_SOURCES.find(row=>row.path==='src/lexical/bhcomp.rs').source,constant=JSON_ROUNDTRIP_RETENTION_SOURCES.find(row=>row.path==='src/lexical/num.rs').source;
const bits=value=>{const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,value);return view.getBigUint64(0);};

test('full original retention and associated Float bound inputs match exact locked archive bytes',()=>{
  const proof=loadJsonMacroSourceProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
  for(const row of JSON_ROUNDTRIP_RETENTION_SOURCES){const original=jsonMacroOriginalSource(proof,'serde_json',row.path);assert.equal(row.source,original.source);assert.equal(row.sha256,original.sha256);assert.equal(hash(row.source),row.sha256);}
  const plan=compileOriginalDigitRetentionControl(source,constant,config);assert.equal(plan.retainedDigits,768);assert.equal(plan.emittedDigitsBound,769);assert.equal(JSON_LEXICAL_MAX_MANTISSA_DIGITS,769);assert.equal(plan.retentionControlShapeVerified,true);assert.equal(hash(source.slice(plan.functionSpan.start,plan.functionSpan.end)),plan.functionSha256);
  for(const key of ['numericCallOwnerVerified','traitOwnerVerified','allocatorEffectsVerified','sourceBehaviorFidelityVerified','parseAdmission','namespaceAuthority','runtimeParity'])assert.equal(plan[key],false,key);
});

test('generic original control rejects counter/exit/scope ambiguities and cloned public metadata',()=>{
  const plan=compileOriginalDigitRetentionControl(source,constant,config);assert.throws(()=>projectOriginalDigitRetention(structuredClone(plan),'1',''),/Unsealed/);
  for(const changed of [source.replace('i += 1;','i += 2;'),source.replace('i += 1;','i = 0; i += 1;'),source.replace('if i == max_digits','if i < max_digits'),source.replace('for &digit in integer.iter().chain(fraction)','for &digit in fraction.iter().chain(integer)'),source.replace('result.iadd_small(1);','result.iadd_small(2);')])assert.throws(()=>compileOriginalDigitRetentionControl(changed,constant,config),TypeError);
  assert.throws(()=>compileOriginalDigitRetentionControl(source,constant.replace('const MAX_DIGITS: usize = 769;','const MAX_DIGITS: usize = missing;'),config),TypeError);
});

test('actual retained prefix appends source sticky digit for both nonzero and all-zero integer tails',()=>{
  const plan=compileOriginalDigitRetentionControl(source,constant,config),prefix='1'+'0'.repeat(767);
  for(const tail of ['0','1','000','999']){const row=projectOriginalDigitRetention(plan,prefix+tail,'');assert.equal(row.coefficient,BigInt(prefix)*10n+1n);assert.equal(row.count,769);assert.equal(row.tailActuallyNonzero,/[1-9]/u.test(tail));assert.equal(row.tailSynthesized,true);}
  const exact=projectOriginalDigitRetention(plan,prefix,'');assert.equal(exact.coefficient,BigInt(prefix));assert.equal(exact.count,768);assert.equal(exact.tailSynthesized,false);assert.throws(()=>projectOriginalDigitRetention(plan,'1','0'),/trimmed fraction/);
});

test('valid769-digit source-inferred counterexample executes real string/byte reader path without ideal-rounding substitution',()=>{
  const coefficient=((1n<<53n)+1n)*5n**53n*10n**715n,text=coefficient+'e-768';assert.equal(String(coefficient).length,769);
  assert.equal(roundPositiveRationalBinary64(coefficient,10n**768n),0x3ff0000000000000n);assert.equal(sourceLexicalMantissa(String(coefficient),'').coefficient,coefficient+1n);
  const trace=lexicalTruncatedTrace(String(coefficient),'',-768);assert.equal(trace.branch,'fallback-negative');assert.equal(bits(trace.value),0x3ff0000000000001n);
  for(const result of [serde_json_roundtrip_from_str(text),serde_json_roundtrip_from_slice([...Buffer.from(text)].map(BigInt))]){assert.equal(result.$,'Ok');assert.equal(bits(result.field0.field0.field0),0x3ff0000000000001n);}
  const negative=serde_json_roundtrip_from_str('-'+text);assert.equal(negative.$,'Ok');assert.equal(bits(negative.field0.field0.field0),0xbff0000000000001n);
});

test('fraction zero trimming, raw input budget, negative zero and byte error positions remain distinct obligations',()=>{
  const half=((1n<<53n)+1n)*5n**53n,decimal='1.'+String(half).slice(1)+'0'.repeat(715);assert.equal(decimal.replace('.','').length,769);
  const result=serde_json_roundtrip_from_str(decimal);assert.equal(result.$,'Ok');assert.equal(bits(result.field0.field0.field0),0x3ff0000000000000n);
  assert.throws(()=>serde_json_roundtrip_from_str('0.'+'0'.repeat(768)+'1'),error=>error.code==='ERR_JSON_ROUNDTRIP_CAPABILITY_BOUND');
  assert.equal(Object.is(serde_json_roundtrip_from_str('-0.0').field0.field0.field0,-0),true);
  const exponent=serde_json_roundtrip_from_str('1e214748364899999');assert.equal(exponent.$,'Err');assert.equal(exponent.field0.message,'number out of range');assert.equal(exponent.field0.column,12n);
});

test('strict TypeScript consumer executes the same candidate reader for the source-inferred valid counterexample',async()=>{
  // Authored consumer carrier, not an extracted production Rust declaration.
  const directory=mkdtempSync(join(tmpdir(),'router-retention-typed-'));
  try {
    const runtime=fileURLToPath(new URL('../extensions/json-roundtrip-runtime.mjs',import.meta.url)),coefficient=((1n<<53n)+1n)*5n**53n*10n**715n,text=coefficient+'e-768';
    const carrier='import {serde_json_roundtrip_from_str,type JsonRoundtripResult} from '+JSON.stringify(runtime)+';\nconst result:JsonRoundtripResult=serde_json_roundtrip_from_str('+JSON.stringify(text)+');\nif(result.$!=="Ok"||result.field0.$!=="Number"||result.field0.field0.$!=="Float")throw new Error("missing checked Float");\nexport const value:number=result.field0.field0.field0;\n';
    const input=join(directory,'consumer.mts');writeFileSync(input,carrier);
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--outDir',join(directory,'compiled'),input],{stdio:'pipe'});
    const loaded=await import(pathToFileURL(join(directory,'compiled/consumer.mjs')));assert.equal(bits(loaded.value),0x3ff0000000000001n);
  }finally{rmSync(directory,{recursive:true,force:true});}
});
