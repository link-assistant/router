import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { analyzeJavaScript, parseMeta, emitRust, emitTypeScript } from './translator.mjs';
import { toLino } from './vendor/ir.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value)}\n`;
const safeSource = /^packages\/javascript\/native\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*[a-z0-9]+(?:-[a-z0-9]+)*\.mjs$/u;

/** Assemble independently checked native bodies; refused owners remain refused. */
export function buildNativePortableArtifacts(sources) {
  const artifacts = new Map();
  const modules = [];
  const names = new Set();
  for (const { path, source } of [...sources].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) {
    if (!safeSource.test(path) || names.has(path) || typeof source !== 'string') {
      throw new Error('invalid or duplicate native portable source');
    }
    names.add(path);
    const analyzed = analyzeJavaScript(source, { sourcePath: path });
    const scoped = analyzed.scopedFunctions;
    if (!scoped?.complete || scoped.sourceItems !== scoped.items.length
      || scoped.translatedItems !== scoped.program.length
      || scoped.sourceItems !== scoped.translatedItems + scoped.unsupportedItems) {
      throw new Error(`incomplete scoped native discovery: ${path}`);
    }
    if (!isDeepStrictEqual(scoped.items.filter((item) => item.status === 'translated').map((item) => item.name),
      scoped.program.map((item) => item.name))) throw new Error(`scoped native identity drift: ${path}`);
    const topLevel = {
      sourceItems: analyzed.items.length,
      translatedItems: analyzed.program.length,
      unsupportedItems: analyzed.items.filter((item) => item.status === 'unsupported').length,
      items: analyzed.items,
      diagnostics: analyzed.diagnostics,
    };
    if (topLevel.sourceItems !== topLevel.translatedItems + topLevel.unsupportedItems) {
      throw new Error(`incomplete top-level native discovery: ${path}`);
    }
    const stem = path.slice('packages/javascript/native/'.length, -4);
    const outputs = [];
    for (const [scope, program] of [['top-level', analyzed.program], ['scoped', scoped.program]]) {
      const meta = `${program.map(toLino).join('\n')}\n`;
      const decoded = parseMeta(meta);
      if (!isDeepStrictEqual(decoded, program)) throw new Error(`native meta roundtrip drift: ${path} ${scope}`);
      const header = `// GENERATED: node scripts/regenerate-js-first.mjs\n// Independently checked ${scope} bodies from ${path}; source sha256=${hash(source)}; IR sha256=${hash(meta)}.\n// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.\n`;
      for (const [outputPath, content] of [
        [`tools/translation/js-to-rust/generated/native-portable/${scope}/${stem}.lino`, `# GENERATED: checked portable-router-v1 bodies; no source envelopes.\n${meta}`],
        [`tools/translation/js-to-rust/generated/native-portable/${scope}/${stem}.rs.txt`, `${header}${emitRust(decoded)}`],
        [`packages/typescript/native/portable-draft/${scope}/${stem}.ts`, `${header}export {};\n${emitTypeScript(decoded)}`],
      ]) {
        if (artifacts.has(outputPath)) throw new Error(`duplicate native portable output: ${outputPath}`);
        artifacts.set(outputPath, content);
        outputs.push({ path: outputPath, bytes: Buffer.byteLength(content), sha256: hash(content), scope, definitions: decoded.length });
      }
    }
    modules.push({ path, bytes: Buffer.byteLength(source), sha256: hash(source), topLevel,
      scopedFunctions: { complete: true, sourceItems: scoped.sourceItems, translatedItems: scoped.translatedItems,
        unsupportedItems: scoped.unsupportedItems, items: scoped.items, diagnostics: scoped.diagnostics }, outputs });
  }
  const totals = (field) => modules.reduce((sum, module) => {
    const census = module[field];
    return { sourceItems: sum.sourceItems + census.sourceItems, translatedItems: sum.translatedItems + census.translatedItems,
      unsupportedItems: sum.unsupportedItems + census.unsupportedItems };
  }, { sourceItems: 0, translatedItems: 0, unsupportedItems: 0 });
  const manifest = { schema: 'native-portable-body-draft-v1', fragment: 'portable-router-v1',
    contract: { wholeNativeImplementationTranslated: false, runtimeParity: false, rustCompiled: false,
      topLevel: 'Original top-level source items; partial module admission does not admit its refused owners.',
      scopedFunctions: 'Additional ArrowFunction, FunctionExpression and FunctionDeclaration bodies, excluding top-level declarations and initializer forms already counted at top level, and excluding method/accessor bodies themselves; no lexical captures or implicit input narrowing.',
      meta: 'Both targets consume the serialized and independently checked meta-language program.',
      targets: 'TypeScript preserves the declared checked fragment; Rust uses explicit payload and host-qualified projections.' },
    topLevel: totals('topLevel'), scopedFunctions: totals('scopedFunctions'), modules };
  artifacts.set('parity/js-native-portable-draft.json', json(manifest));
  return { artifacts, manifest };
}
