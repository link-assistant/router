// Does a translator module-view item span include an outer `#[rustfmt::skip]`?
import {captureSourceModuleViews,originalModuleViewItems} from '../../tools/translation/source-module-views.mjs';
const source='pub mod a;\n#[rustfmt::skip]\npub mod translation_primitive_vectors_core;\npub mod b;\n';
const capture=captureSourceModuleViews({source,sourcePath:'src/lib.rs'});
for(const item of originalModuleViewItems(capture.views[0],source))console.log(item.term,item.name,JSON.stringify(source.slice(item.start,item.end)));
