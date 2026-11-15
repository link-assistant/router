"""Keep immutable historical consumer checks and add a separate current cohort."""
from pathlib import Path
p=Path('tools/translation/test/static-source-items.test.mjs')
s=p.read_text()
anchor="import {originalStaticSourceIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';\n"
assert s.count(anchor)==1
s=s.replace(anchor,anchor+"import {staticSourceConsumerPairs} from './fixtures/static-source-consumer-pairs.mjs';\n")
old="const oldExternal=await oracle('tools/translation/extensions/external-trait-sources.mjs','complete-original-external'),oldCore=await oracle('tools/translation/extensions/primitive-trait-closure.mjs','complete-original-core');"
new="""const oldExternal=await oracle('tools/translation/extensions/external-trait-sources.mjs','complete-original-external'),oldCore=await oracle('tools/translation/extensions/primitive-trait-closure.mjs','complete-original-core');
const consumerPairs=staticSourceConsumerPairs(originals);
async function subject(source,path,name){const target=join(directory,name+'.mjs');writeFileSync(target,relocate(source,new URL(path.replace('tools/translation/',''),base),name));return import(pathToFileURL(target).href);}
const historicalMemoExternal=await subject(consumerPairs.historical.external.after,'tools/translation/extensions/external-trait-sources.mjs','complete-historical-memo-external'),historicalMemoCore=await subject(consumerPairs.historical.core.after,'tools/translation/extensions/primitive-trait-closure.mjs','complete-historical-memo-core');
const currentPlainExternal=await subject(consumerPairs.current.external.before,'tools/translation/extensions/external-trait-sources.mjs','complete-current-plain-external'),currentMemoExternal=await subject(consumerPairs.current.external.after,'tools/translation/extensions/external-trait-sources.mjs','complete-current-memo-external');
const currentPlainCore=await subject(consumerPairs.current.core.before,'tools/translation/extensions/primitive-trait-closure.mjs','complete-current-plain-core'),currentMemoCore=await subject(consumerPairs.current.core.after,'tools/translation/extensions/primitive-trait-closure.mjs','complete-current-memo-core');"""
assert s.count(old)==1;s=s.replace(old,new)
start="test('complete original external and core consumers keep every proof byte refusal source and fresh dependency check',{timeout:30000},()=>{\n"
end="\n});\n\ntest('syntax reuse remains separate"
a=s.index(start);b=s.index(end,a)
body=s[a+len(start):b]
old_current="const currentSource=readFileSync(new URL('../extensions/external-trait-sources.mjs',import.meta.url),'utf8'),currentPath=join(directory,'complete-current-external.mjs')"
assert body.count(old_current)==1
body=body.replace(old_current,"const currentSource=pair.external.after,currentPath=join(directory,cohort+'-complete-cold-memo-external.mjs')")
body=body.replace("helperPath=join(directory,'fresh-current-static-helper.mjs')","helperPath=join(directory,cohort+'-fresh-current-static-helper.mjs')")
expected="pathToFileURL(join(directory,'complete-original-external.mjs')).href"
assert body.count(expected)==1;body=body.replace(expected,"pathToFileURL(join(directory,coldOriginal+'.mjs')).href")
replacement="""// Each complete consumer is compared with its own lexical-only variant. A
// relocated consumer is foreign to the genuine private producer scope; neither
// cohort claims equivalence of that scope or the whole compiler bootstrap.
function checkConsumerPair({cohort,pair,oldExternal,external,oldCore,core,coldOriginal}){
 const save=retain,retain=(name,value)=>save(cohort+'-'+name,value);
"""+body+"""
}
test('complete original external and core consumers keep every proof byte refusal source and fresh dependency check',{timeout:30000},()=>{
 checkConsumerPair({cohort:'historical',pair:consumerPairs.historical,oldExternal,external:historicalMemoExternal,oldCore,core:historicalMemoCore,coldOriginal:'complete-original-external'});
});
test('complete current foreign consumers preserve every current field callback and refusal through lexical reuse',{timeout:30000},()=>{
 checkConsumerPair({cohort:'current',pair:consumerPairs.current,oldExternal:currentPlainExternal,external:currentMemoExternal,oldCore:currentPlainCore,core:currentMemoCore,coldOriginal:'complete-current-plain-external'});
});
test('current genuine producer scope remains distinct from both foreign lexical-only cohorts',{timeout:30000},()=>{
 const genuine=external.originalExternalTraitClosure(dependencies,['base64','Engine']),foreign=complete(()=>currentMemoExternal.originalExternalTraitClosure(dependencies,['base64','Engine']));
 assert.ok(genuine.declaration.originalProducerSourceABI);assert.equal(genuine.declaration.originalProducerSourceABI.runtimeAuthority,false);
 assert.ok(foreign.error);assert.match(foreign.error.message,/unproved attribute producer/u);
 retain('09-consumer-generations-and-genuine-boundary',{consumerPairs,genuine,foreign,wholeIssuerBootstrapEquivalence:false});
});"""
# Avoid lexical TDZ in the scoped retaining function.
replacement=replacement.replace(' const save=retain,retain=(name,value)=>save(cohort+\'-\'+name,value);',' const retain=(name,value)=>retainConsumerVector(cohort+\'-\'+name,value);')
s=s[:a]+replacement+s[b+len('\n});'):]
anchor="const legacyNames="
assert s.count(anchor)==1;s=s.replace(anchor,"const retainConsumerVector=retain;\n"+anchor)
s=s.replace("let wire;try{wire=execFileSync(process.execPath,['--input-type=module','--eval',script],{timeout:10000","const scriptPath=join(directory,cohort+'-cold-'+control+'-'+choice+'.mjs');writeFileSync(scriptPath,script,{flag:'wx'});let wire;try{wire=execFileSync(process.execPath,[scriptPath],{timeout:10000")
p.write_text(s)
