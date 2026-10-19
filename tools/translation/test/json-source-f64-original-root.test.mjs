import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {originalCsvContext} from './original-csv-context.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const tag=($,field0)=>Object.freeze(field0===undefined?{$}:{$,field0}),some=value=>tag('Some',value),none=tag('None'),number=($,value)=>tag($,value),value=number=>tag('Number',number);
const bits=value=>{if(Number.isNaN(value))return 'NaN';const bytes=Buffer.alloc(8);bytes.writeDoubleBE(value);return bytes.toString('hex');};
const retain=(name,value)=>{const directory=process.env.ROUTER_JSON_SOURCE_F64_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),JSON.stringify(value,(_key,item)=>typeof item==='bigint'?{$bigint:item.toString()}:typeof item==='number'?{$binary64:bits(item)}:item instanceof Map?{$map:[...item]}:item)+'\n',{flag:'wx'});}};
const same=(actual,expected)=>assert.ok(Object.is(actual,expected),JSON.stringify({actual:bits(actual),expected:bits(expected)}));

test('combined 208 and private-dispatch prerequisite execute unchanged safe_number in the complete actual root',{timeout:60_000},async()=>{
 const corpus=originalCsvContext(),entry=corpus.inputs.entry,file='src/subscription_usage_normalize.rs',source=corpus.source(file),items=sourceItems(source),item=items.find(item=>item.term==='fn'&&item.name==='safe_number'),percentage=items.find(item=>item.term==='fn'&&item.name==='safe_percentage');assert.equal(entry,'src/lib.rs');assert.ok(item);assert.ok(percentage);assert.equal(hash(source),'e62407a433be5cc208254625309fcbb3a6e4f5c4b7110918ecbbeafe38281dad');assert.equal(hash(source.slice(item.start,item.end)),'0f6e667a69815ab806ed7e03e1c225d5f0a720d5d8d6ad423ff1f2263d93b301');assert.match(source.slice(percentage.start,percentage.end),/0\.0\.\.=100\.0/u);
 const paths=corpus.inputs.sources.filter(row=>row.source.endsWith('.rs')).map(row=>row.source),manifest=corpus.source('Cargo.toml'),lock=corpus.source('Cargo.lock');retain('07-all-original-inputs',{inputs:corpus.inputs,paths,originals:corpus.inputs.sources.map(row=>({...row,content:corpus.source(row.source)})),item,percentage});
 const result=translateProject({entry,paths,readSource:corpus.source,cargoManifest:manifest,deriveDependencies:loadDeriveDependencyProof({manifest,lock}),jsonMacroDependencies:loadJsonMacroSourceProof({manifest,lock}),compilationProfile:corpus.inputs.compilationProfile});retain('07-complete-original-project',result);assert.equal(result.meta.runtimeParity,false);const name='subscription_usage.normalize.safe_number',row=result.meta.executable.find(row=>row.source===file&&row.name===name);assert.ok(row,JSON.stringify(result.meta.refused.filter(row=>row.file===file)));assert.deepEqual(row.span,{start:item.start,end:item.end});
 const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),actual=checked.declarations.get(name),target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),candidates=[...target.declarations.values()].filter(row=>row.k==='fn'&&!row.impl&&row.span?.start===actual.span.start&&row.span?.end===actual.span.end);assert.equal(candidates.length,1);const suffix='\nexport {'+candidates[0].fullName+' as original_safe_number};\n',observations=[];
 const rangeRefusal=result.meta.refused.find(row=>row.file===file&&row.name==='subscription_usage.normalize.safe_percentage');assert.ok(rangeRefusal);assert.equal(rangeRefusal.message,'range domain: only bounded primitive integer ranges are lowered');
 try{await verifyTypedTargets({...result,javascript:result.javascript+suffix,typescript:result.typescript+suffix},(_api,_result,module)=>{for(const [input,wanted]of [[none,none],[some(tag('Null')),none],[some(tag('String','1')),none],[some(value(number('NegInt',-1n))),none],[some(value(number('Float',-0.5))),none],[some(value(number('Float',-0))),some(-0)],[some(value(number('Float',Number.MIN_VALUE))),some(Number.MIN_VALUE)],[some(value(number('PosInt',(1n<<64n)-1n))),some(18446744073709551616)]]){const output=module.original_safe_number(input);assert.equal(output.$,wanted.$);if(wanted.$==='Some')same(output.field0,wanted.field0);observations.push({input,wanted,output});}},{childTimeoutMs:20_000});}finally{retain('07-actual-safe-number-observations',observations);}
});

