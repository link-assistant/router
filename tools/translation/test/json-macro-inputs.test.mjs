import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import * as inputs from '../json-macro-inputs.mjs';
import * as definitions from '../json-macro-sources.mjs';
import { proveJsonMacroFeatures, isJsonMacroFeatureProof } from '../json-macro-features.mjs';
import { originalStandardSharedPatternLayout } from '../extensions/standard-shared-pattern-source.mjs';
const root = new URL('../../../', import.meta.url);
test('existing JSON source API and pure inputs share genuine original seals and reject cloned/refrozen certificates', () => {
    const manifest = readFileSync(new URL('Cargo.toml', root), 'utf8'), lock = readFileSync(new URL('Cargo.lock', root), 'utf8');
    for (const name of ['JSON_MACRO_SOURCE_PROFILE', 'createJsonMacroSourceProof', 'loadJsonMacroSourceProof', 'isJsonMacroSourceProof', 'jsonMacroOriginalSource', 'jsonMacroDependencyProfile'])
        assert.equal(definitions[name], inputs[name], name);
    const proof = definitions.loadJsonMacroSourceProof({ manifest, lock }), features = proveJsonMacroFeatures(proof);
    assert.equal(inputs.isJsonMacroSourceProof(proof), true);
    assert.equal(isJsonMacroFeatureProof(features), true);
    assert.equal(inputs.jsonMacroOriginalSource(proof, 'serde_json', 'src/value/mod.rs').package, 'serde_json');
    for (const fake of [structuredClone(proof), Object.freeze(structuredClone(proof)), { ...proof }]) {
        assert.equal(inputs.isJsonMacroSourceProof(fake), false);
        assert.throws(() => proveJsonMacroFeatures(fake), /sealed/);
        assert.throws(() => inputs.jsonMacroOriginalSource(fake, 'serde_json', 'src/value/mod.rs'), /Unsealed/);
    }
    const definition = definitions.jsonMacroSourceDefinition(proof);
    assert.equal(definitions.jsonMacroDefinitionSource(definition).dependencyDigest, proof.digest);
    assert.throws(() => definitions.jsonMacroDefinitionSource(structuredClone(definition)), /Unsealed/);
});
test('original standard layout source facts are immutable and corrupted retained archives cannot issue them', () => {
    for (const kind of ['Option', 'Result']) {
        const proof = originalStandardSharedPatternLayout(kind);
        assert.equal(proof.payloadCopyRequired, true);
        assert.equal(proof.namespaceAuthority, false);
        assert.equal(proof.pointeeDropAuthority, false);
        assert.throws(() => {
            proof.span.start = 0;
        }, TypeError);
    }
    const directory = mkdtempSync(join(tmpdir(), 'router-shared-pattern-source-negative-'));
    try {
        const files = ['extensions/standard-shared-pattern-source.mjs', 'rust-structure.mjs', 'vendor/formal-ai/lexer.mjs', 'source-profiles/option-deref/core-option.rs.gz', 'source-profiles/result-iterators/core-result.rs.gz'];
        for (const file of files) {
            const path = join(directory, file);
            mkdirSync(dirname(path), { recursive: true });
            writeFileSync(path, readFileSync(new URL('../' + file, import.meta.url)));
        }
        const archive = join(directory, 'source-profiles/option-deref/core-option.rs.gz'), raw = readFileSync(archive);
        raw[raw.length - 10] ^= 1;
        writeFileSync(archive, raw);
        const script = `import {originalStandardSharedPatternLayout} from ${JSON.stringify(new URL('file://' + join(directory, 'extensions/standard-shared-pattern-source.mjs')).href)};try{originalStandardSharedPatternLayout('Option');process.exitCode=2;}catch(error){if(!/source bytes|archive checksum|data check|length check|invalid/.test(error.message))throw error;}`;
        execFileSync(process.execPath, ['--input-type=module', '-e', script], { timeout: 20000 });
    }
    finally {
        rmSync(directory, { recursive: true, force: true });
    }
});
