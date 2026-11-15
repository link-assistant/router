// Compares the oracle templates embedded in the prepare scripts with the
// checked-in Rust oracle files, to decide whether edits must be mirrored.
import {readFileSync} from 'node:fs';
const pairs=[['tools/translation/prepare-core-unicode-predicates.mjs','ORACLE','rust/tests/translation_core_unicode_predicates_oracle.rs'],['tools/translation/prepare-core-unit-matches.mjs','RUST_ORACLE','rust/tests/translation_core_unit_matches_oracle.rs']];
for(const [script,name,target] of pairs){
 const text=readFileSync(script,'utf8'),start=text.indexOf(`const ${name}=\``)+name.length+8,end=text.indexOf('`',start);
 const template=text.slice(start,end),actual=readFileSync(target,'utf8');
 console.log(target,'template-equal:',template===actual,'template-has-${:',template.includes('${'),'lengths',template.length,actual.length);
}
