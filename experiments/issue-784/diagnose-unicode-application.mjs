// Bounded diagnosis using the complete, pinned original application archive.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {sourceItems} from '../../tools/translation/rust-structure.mjs';
import {migrateCoreLiteralText} from '../../tools/translation/migrate-core-literal-text.mjs';
import {proposeCoreUnicodePredicatesCorpus} from '../../tools/translation/migrate-core-unicode-predicates.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../../tools/translation/router-core-source-data.mjs';
const packet=JSON.parse(gunzipSync(readFileSync(new URL('../../tools/translation/source-profiles/core-unicode-predicates/application.json.gz',import.meta.url)),{maxOutputLength:300000}));
const originals=[['rust/src/login_pty_backend.rs','compact_terminal_text'],['rust/src/model_resource.rs','valid_model_id']].map(([path,name])=>{
 const source=packet.files.find(row=>row.path===path).source,items=sourceItems(source).filter(item=>item.term==='fn'&&item.name===name);
 if(items.length!==1)throw Error('One complete original function required');
 return {path,name,source:source.slice(items[0].start,items[0].end)};
});
const migrated=migrateCoreLiteralText(originals.map(row=>row.source).join('\n'));
const files={'src/lib.rs':'pub mod translation_core;'+migrated.after.source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE};
const plan=proposeCoreUnicodePredicatesCorpus({files}),row=plan.proposals.find(part=>part.file==='src/lib.rs');
console.log(JSON.stringify({originals,migrated:migrated.after.source,selections:row.selections,skipped:row.skipped,edits:row.edits},null,2));
