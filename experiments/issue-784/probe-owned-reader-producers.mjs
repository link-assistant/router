// Diagnose the unchanged complete producer chain; do not install any output.
import {createHash} from 'node:crypto';
import {prepareCurrentCoreAsciiReverseAssets} from '../../tools/translation/prepare-core-ascii-assets.mjs';
const path='tools/translation/js-to-rust/owned-core-source.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const started=performance.now(),plan=prepareCurrentCoreAsciiReverseAssets();
const rows=plan.layers.flatMap(layer=>layer.files.filter(row=>row.path===path).map(row=>({schema:layer.schema,beforeSha256:hash(row.before),afterSha256:hash(row.after),currentEqualsAfter:row.current===row.after,phases:row.stages.map(stage=>stage.phase),inverse:row.inverse===row.before})));
console.log(JSON.stringify({runtime:process.version,elapsedMilliseconds:performance.now()-started,rows,installed:false,semanticAuthority:false}));
