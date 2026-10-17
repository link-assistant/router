import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { translateProject } from '../project.mjs';
import { parseRust, checkProgram, emitJavaScript } from '../extensions/host-contracts.mjs';
import { parseProgram, serializeProgram } from '../semantic-meta.mjs';
import { associateOriginalSharedPatternDependencies, createOriginalSharedPatternAdapter } from '../extensions/shared-source-patterns.mjs';
import { loadJsonMacroSourceProof, isJsonMacroSourceProof } from '../json-macro-inputs.mjs';
import { originalStringSharedViewSource } from '../extensions/string-shared-view-source.mjs';
import { serde_json_from_str } from '../extensions/json-runtime.mjs';
import { verifyTypedTargets } from './typed-targets.mjs';
const root = new URL('../../../', import.meta.url), deps = () => loadJsonMacroSourceProof({ manifest: readFileSync(new URL('Cargo.toml', root), 'utf8'), lock: readFileSync(new URL('Cargo.lock', root), 'utf8') }), tag = ($, fields = {}) => Object.freeze({ $, ...fields }), some = field0 => tag('Some', { field0 }), none = tag('None');
const project = (source, extra = {}) => translateProject({ entry: 'src/lib.rs', paths: ['src/lib.rs'], readSource: () => source, ...extra });
const find = (node, kind) => node && typeof node === 'object' ? (node.k === kind ? node : (node instanceof Map ? [...node.values()] : Object.values(node)).map(value => find(value, kind)).find(Boolean)) : null;
const canonical = value => serde_json_from_str(JSON.stringify(value)).field0;
const source = 'enum Item{Text(String),Empty}pub fn read(item:&Item)->bool{match item{Item::Text(value)=>value.is_empty(),Item::Empty=>true}}';
test('genuine original shared nominal constructor fields read without payload Copy or Drop authority', { timeout: 60000 }, async () => {
    const r = project(source);
    assert.deepEqual(r.meta.refused, []);
    const frame = find(r.meta.checkedSemanticProgram, 'routerOriginalSharedPatternMatch'), field = find(frame, 'routerSourcePatternProjection');
    assert.equal(frame.sourceSharedPatternProof.borrowOnly, true);
    assert.equal(field.sourcePatternProjectionProof.projectedType.rustReference.pointee.rustOwnership.source, 'String');
    assert.equal(field.sourcePatternProjectionProof.pointeeMoveAuthority, false);
    await verifyTypedTargets(r, api => {
        assert.equal(api.read(tag('Text', { field0: '' })), true);
        assert.equal(api.read(tag('Text', { field0: '😀É' })), false);
        assert.equal(api.read(tag('Empty')), true);
        assert.throws(() => api.read({ $: 'Text', field0: '' }), /immutable/);
        assert.throws(() => api.read(tag('Text', { field0: '\ud800' })), /scalar|Unicode|string/);
        assert.throws(() => api.read(tag('Text', { field0: 9n })), /string|layout|value/i);
        let traps = 0;
        assert.throws(() => api.read(new Proxy(tag('Empty'), { get() {
                traps++;
                return 'Empty';
            } })), /proxy/);
        assert.equal(traps, 0);
    }, { childTimeoutMs: 20000 });
});
test('nested Option and Result constructors keep actual tag order shared depth and source alternatives', { timeout: 60000 }, async () => {
    const s = 'enum Item{Yes,No}pub fn selected(value:Option<&Item>)->bool{match value{Some(Item::Yes)=>true,Some(Item::No)|None=>false}}pub fn result(value:&Result<u8,bool>)->bool{match value{Ok(n)=>*n>2u8,Err(flag)=>*flag}}pub fn nested(value:&Option<&u8>)->bool{match value{Some(n)=>**n>2u8,None=>false}}pub fn pair(value:Result<&Item,&Item>)->bool{match value{Ok(Item::Yes)|Err(Item::Yes)=>true,_=>false}}';
    const r = project(s);
    assert.deepEqual(r.meta.refused, []);
    const proof = find(r.meta.checkedSemanticProgram, 'routerOriginalSharedPatternMatch').sourceSharedPatternProof;
    assert.ok(proof.valueCopies.some(item => item.source?.profile === 'rust-1.89-original-shared-reference-copy'));
    assert.ok(proof.valueCopies.some(item => item.source?.copyDerive?.includes('Copy')));
    assert.equal(proof.pointeeDropAuthority, false);
    await verifyTypedTargets(r, api => {
        assert.equal(api.selected(some(tag('Yes'))), true);
        assert.equal(api.selected(some(tag('No'))), false);
        assert.equal(api.selected(none), false);
        assert.equal(api.result(tag('Ok', { field0: 3n })), true);
        assert.equal(api.result(tag('Ok', { field0: 2n })), false);
        assert.equal(api.result(tag('Err', { field0: true })), true);
        assert.equal(api.result(tag('Err', { field0: false })), false);
        assert.equal(api.nested(some(3n)), true);
        assert.equal(api.nested(some(2n)), false);
        assert.equal(api.nested(none), false);
        for (const ctor of ['Ok', 'Err']) {
            assert.equal(api.pair(tag(ctor, { field0: tag('Yes') })), true);
            assert.equal(api.pair(tag(ctor, { field0: tag('No') })), false);
        }
    }, { childTimeoutMs: 20000 });
});
test('original named constructors and rest patterns borrow selected fields only', { timeout: 60000 }, async () => {
    const s = 'enum Item{Text{value:String},Pair{a:u8,b:u8},Empty}pub fn read(value:&Item)->bool{match value{Item::Text{value}=>value.is_empty(),Item::Pair{a,..}=>*a>2u8,Item::Empty=>true}}';
    const r = project(s);
    assert.deepEqual(r.meta.refused, []);
    await verifyTypedTargets(r, api => {
        assert.equal(api.read(tag('Text', { value: '' })), true);
        assert.equal(api.read(tag('Text', { value: 'é' })), false);
        assert.equal(api.read(tag('Pair', { a: 3n, b: 7n })), true);
        assert.equal(api.read(tag('Pair', { a: 2n, b: 7n })), false);
        assert.equal(api.read(tag('Empty')), true);
    }, { childTimeoutMs: 20000 });
});
test('locked original JSON discriminator and String payload reads require genuine sealed dependency features', { timeout: 60000 }, async () => {
    const s = 'use serde_json::Value;pub fn null(value:Option<&Value>)->bool{match value{None|Some(Value::Null)=>true,Some(_)=>false}}pub fn string(value:Option<&Value>)->bool{match value{Some(Value::String(text))=>text.is_empty(),_=>false}}';
    assert.ok(project(s).meta.refused.some(row => /locked serde_json/.test(row.message)));
    const proof = deps(), r = project(s, { jsonMacroDependencies: proof });
    assert.deepEqual(r.meta.refused, []);
    assert.equal(isJsonMacroSourceProof(proof), true);
    assert.equal(isJsonMacroSourceProof(structuredClone(proof)), false);
    assert.throws(() => associateOriginalSharedPatternDependencies({}, Object.freeze(structuredClone(proof))), /sealed dependency/);
    await verifyTypedTargets(r, api => {
        assert.equal(api.null(none), true);
        assert.equal(api.null(some(canonical(null))), true);
        for (const value of [false, 3, '', [], {}])
            assert.equal(api.null(some(canonical(value))), false);
        assert.equal(api.string(some(canonical(''))), true);
        assert.equal(api.string(some(canonical('😀É'))), false);
        assert.equal(api.string(some(canonical(null))), false);
        assert.throws(() => api.string(some(tag('String', { field0: '\udfff' }))), /scalar|Unicode|string/);
    }, { childTimeoutMs: 20000 });
});
test('source-pinned String Deref/as_str coercion preserves actual shared origin and Unicode views', { timeout: 60000 }, async () => {
    const s = "enum Item{Text(String),Empty}pub fn view<'a>(item:&'a Item)->&'a str{match item{Item::Text(text)=>text,Item::Empty=>\"fallback\"}}";
    const r = project(s);
    assert.deepEqual(r.meta.refused, []);
    const node = find(r.meta.checkedSemanticProgram, 'routerSourcePatternStringView');
    assert.ok(node);
    assert.equal(node.sourceSharedStringViewProof.source.deref.body, '{self.as_str()}');
    assert.equal(node.sourceSharedStringViewProof.source.dropAuthority, false);
    const facts = originalStringSharedViewSource();
    assert.throws(() => {
        facts.source.sha256 = 'fake';
    }, TypeError);
    assert.throws(() => {
        facts.deref.span.start = 0;
    }, TypeError);
    await verifyTypedTargets(r, api => {
        for (const value of ['', '😀É', '\0', '\u0085', '\uFEFF'])
            assert.equal(api.view(tag('Text', { field0: value })), value);
        assert.equal(api.view(tag('Empty')), 'fallback');
    }, { childTimeoutMs: 20000 });
});
test('guard retry and nested original frames restore their own borrowed field scopes', { timeout: 60000 }, async () => {
    const s = 'enum Item{Text(String),Empty}pub fn selected(value:&Item,first:bool)->bool{match value{Item::Text(text) if first=>text.is_empty(),Item::Text(_)=>true,Item::Empty=>false}}pub fn nested(value:Option<&Item>)->bool{match value{Some(item)=>match item{Item::Text(text)=>text.is_empty(),Item::Empty=>false},None=>false}}';
    const r = project(s);
    assert.deepEqual(r.meta.refused, []);
    await verifyTypedTargets(r, api => {
        const text = tag('Text', { field0: 'x' });
        assert.equal(api.selected(text, true), false);
        assert.equal(api.selected(text, false), true);
        assert.equal(api.selected(tag('Empty'), true), false);
        assert.equal(api.nested(some(tag('Text', { field0: '' }))), true);
        assert.equal(api.nested(some(text)), false);
        assert.equal(api.nested(none), false);
    }, { childTimeoutMs: 20000 });
});
test('qualified original nominal imports retain declaration identity across project flattening', { timeout: 60000 }, async () => {
    const files = new Map([['src/lib.rs', 'mod a;mod b;use a::Item as A;use b::Item as B;pub fn read(value:Option<&A>)->bool{match value{Some(A::Text(text))=>text.is_empty(),Some(A::Empty)|None=>false}}'], ['src/a.rs', 'pub enum Item{Text(String),Empty}'], ['src/b.rs', 'pub enum Item{Text(String),Empty}']]);
    const r = translateProject({ entry: 'src/lib.rs', paths: [...files.keys()], readSource: path => files.get(path) });
    assert.deepEqual(r.meta.refused, []);
    await verifyTypedTargets(r, api => {
        assert.equal(api.read(some(tag('Text', { field0: '' }))), true);
        assert.equal(api.read(some(tag('Empty'))), false);
    }, { childTimeoutMs: 20000 });
    files.set('src/lib.rs', files.get('src/lib.rs').replace('Some(A::Text', 'Some(B::Text'));
    const bad = translateProject({ entry: 'src/lib.rs', paths: [...files.keys()], readSource: path => files.get(path) });
    assert.ok(bad.meta.refused.some(row => /different source declaration|constructor/.test(row.message)));
});
test('owned subjects unproved field-place copies mutable bindings aggregate escapes and static loans stay refused', () => {
    for (const s of ['enum Item{Yes,No}pub fn read(value:Result<&Item,String>)->bool{match value{Ok(Item::Yes)=>true,_=>false}}', 'enum Item{Text(String),Empty}pub fn read(value:&Item)->bool{match value{Item::Text(mut x)=>x.is_empty(),_=>false}}', 'enum Item{Text(String),Empty}struct Holder{value:Item}pub fn read(holder:&Holder)->bool{match holder.value{Item::Text(text)=>text.is_empty(),_=>false}}', "enum Item{Text(String),Empty}pub fn bad(value:&Item)->&'static str{match value{Item::Text(text)=>text,_=>\"\"}}", 'enum Item{Text(Vec<u8>),Empty}pub fn bad(value:&Item)->&Vec<u8>{match value{Item::Text(values)=>values,_=>panic!("empty")}}'])
        assert.ok(project(s).meta.refused.some(row => row.term === 'fn'), s);
});
test('original pattern frames cannot authorize source if-let or arbitrary Deref outside their selected match', () => {
    const s = 'enum Item{Text(String),Empty}pub fn bad(value:&Item)->bool{if let Item::Text(text)=value{text.is_empty()}else{false}}';
    assert.ok(project(s).meta.refused.some(row => /shared aggregate pattern/.test(row.message)));
    const surface = parseRust(source + 'fn main(){}');
    surface.items.find(item => item.k === 'fn').body.rows[0].body = { k: 'bool', value: false, span: { start: 1, end: 2 } };
    assert.throws(() => checkProgram(surface), /changed after source capture/);
});
test('serialized frame layout body projection view owner and signature mutations cannot recreate source authority', () => {
    const r = project("enum Item{Text(String),Empty}pub fn view<'a>(item:&'a Item)->&'a str{match item{Item::Text(text)=>text,Item::Empty=>\"fallback\"}}"), base = r.meta.targetSemanticProgram;
    for (const [mutationIndex, mutate] of [p => {
            find(p, 'routerOriginalSharedPatternMatch').sourceSharedPatternProof.borrowOnly = false;
        }, p => {
            find(p, 'routerSourcePatternProjection').field = 'other';
        }, p => {
            find(p, 'routerSourcePatternStringView').sourceSharedStringViewProof.source.deref.body = '{panic!()}';
        }, p => {
            const fn = [...p.declarations.values()].find(x => x.k === 'fn');
            fn.params[0].type.rustReference.kind = 'mutable';
        }, p => {
            const fn = [...p.declarations.values()].find(x => x.k === 'fn');
            fn.name = 'forged';
            fn.fullName = 'forged';
        }, p => {
            const item = [...p.declarations.values()].find(x => x.k === 'data');
            item.ctors[0].fields[0].type = { kind: 'bool' };
        }].entries()) {
        const changed = parseProgram(JSON.stringify(base));
        mutate({ ...changed, items: [], main: null });
        assert.throws(() => emitJavaScript(parseProgram(serializeProgram(changed))), /Shared source pattern|pattern.*changed|original layout|authority|invalid checked meta declaration/i, 'mutation ' + mutationIndex);
    }
    const p = structuredClone(base), program = parseProgram(JSON.stringify(p)), entry = [...program.declarations.values()].find(x => x.k === 'fn');
    entry.body = structuredClone(find(entry.body, 'routerSourcePatternProjection'));
    entry.body.object = { k: 'var', name: entry.params[0].name, type: entry.params[0].type, span: entry.body.span };
    assert.throws(() => emitJavaScript(program), /active privately validated original frame/);
});
test('fresh serialized metadata and foreign adapter instances have no original pattern issuance', () => {
    const r = project(source), metadata = JSON.stringify(r.meta.targetSemanticProgram), uri = new URL('../extensions/host-contracts.mjs', import.meta.url).href, semantic = new URL('../semantic-meta.mjs', import.meta.url).href;
    const script = `import {emitJavaScript} from ${JSON.stringify(uri)};import {parseProgram} from ${JSON.stringify(semantic)};try{emitJavaScript(parseProgram(${JSON.stringify(metadata)}));process.exitCode=2;}catch(error){if(!/private original authority|Shared source pattern/.test(error.message))throw error;}`;
    execFileSync(process.execPath, ['--input-type=module', '-e', script], { timeout: 20000 });
    const genuine = `import {translateProject} from ${JSON.stringify(new URL('../project.mjs', import.meta.url).href)};const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>${JSON.stringify(source)}});if(result.meta.refused.length||!result.javascript.includes('translated'))throw Error('fresh original source failed');`;
    execFileSync(process.execPath, ['--input-type=module', '-e', genuine], { timeout: 20000 });
    const foreign = createOriginalSharedPatternAdapter(), program = parseProgram(metadata), entry = [...program.declarations.values()].find(x => x.k === 'fn');
    assert.throws(() => foreign.prepareOriginalSharedPatterns({ program }, entry), /private original authority|Shared source pattern/);
});
test('borrowed canonical scalar alternatives read literals without a payload move', { timeout: 60000 }, async () => {
    const r = project('pub fn read(value:&Option<u8>)->u8{match value{Some(1 | 2)=>0,Some(_)=>1,None=>2}}');
    assert.deepEqual(r.meta.refused, []);
    await verifyTypedTargets(r, api => {
        for (const [value, want] of [[some(1n), 0n], [some(2n), 0n], [some(3n), 1n], [none, 2n]])
            assert.equal(api.read(value), want);
    }, { childTimeoutMs: 20000 });
});
