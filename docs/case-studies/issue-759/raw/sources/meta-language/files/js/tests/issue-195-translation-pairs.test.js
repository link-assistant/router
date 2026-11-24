// Directed-translation evidence for the 12 JavaScript, Rust, Lean and Rocq pairs.
//
// Each pair translates the pinned project corpus with the public
// `translateProgram`, reparses the artifact with the target grammar, validates
// and runs it with the target toolchain, and compares what it prints and
// proves with the source run by its own toolchain. A fault-injected source
// (a changed base case) must make the target toolchain reject or observe the
// translation differently, so the oracle is not the translator's own output.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  decodeProgramTranslation,
  LinkNetwork,
  LinkType,
  readTranslationProvenance,
  translateProgram,
} from '../src/index.js';
import { ISSUE_195_FIXTURE_FILES, recordIssue195Observations } from './support/issue-195-observations.js';

const root = new URL('../../', import.meta.url);
const shared = JSON.parse(await readFile(new URL(ISSUE_195_FIXTURE_FILES.fourLanguage, root), 'utf8'));
const corpus = shared.translationCorpus;
const corpusDirectory = new URL(`${corpus.directory}/`, root);
const expectedBytes = await readFile(new URL(corpus.expectedOutput.file, corpusDirectory));
const expectedLines = expectedBytes.toString('utf8').split('\n').slice(0, -1);
const LANGUAGES = Object.keys(corpus.sources);
const ASSERTIONS = [
  'publicTranslatorUsed', 'realTargetArtifact', 'targetParses', 'nativeTargetValidation',
  'observationContractChecked', 'semanticPreservationChecked', 'observationModelRecorded',
  'encodingAndRuntimeRecorded', 'assumptionsRecorded', 'formalObligationsDischarged',
  'sourceMappingsPreserved', 'provenanceRecorded', 'noSourceRelabelling',
  'noUnsupportedDescriptor', 'noSilentWeakening',
];
const TOOLS = { JavaScript: 'node', Rust: 'rustc', Lean: 'lean', Rocq: 'rocq' };
// Acceptance runs must execute every pair; other runs skip pairs whose toolchain is absent.
const toolchainRequired = Boolean(process.env.ISSUE_195_OBSERVATION_FILE);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function run(command, args, cwd) {
  return new Promise((resolve) => {
    execFile(command, args, { cwd, maxBuffer: 1 << 26, encoding: 'utf8' }, (error, stdout, stderr) => {
      resolve({ ok: !error, missing: error?.code === 'ENOENT', stdout, stderr });
    });
  });
}

const availability = new Map();
function toolAvailable(language) {
  if (!availability.has(language)) {
    availability.set(language, run(TOOLS[language], ['--version']).then(({ ok }) => ok));
  }
  return availability.get(language);
}

// Rocq prints `Eval vm_compute in main` as a list of string literals, as
// `"line"%string :: ... :: nil` or, with the string scope open, `["line"; ...]`.
function rocqLines(stdout) {
  return [...stdout.matchAll(/"((?:[^"]|"")*)"/gu)].map((match) => match[1].replaceAll('""', '"'));
}

/**
 * Validates `code` as a `language` program with its toolchain and observes it:
 * the printed lines, and for program targets the `--ml-check-theorems` report.
 */
async function execute(language, code, directory, name) {
  const file = path.join(directory, `${name}${language === 'JavaScript' ? '.mjs' : corpus.sources[language].extension}`);
  await writeFile(file, code);
  let validation;
  let observe;
  if (language === 'JavaScript') {
    validation = await run('node', ['--check', file]);
    observe = (args) => run('node', [file, ...args]);
  } else if (language === 'Rust') {
    const binary = path.join(directory, `${name}${process.platform === 'win32' ? '.exe' : ''}`);
    const linker = process.env.CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER;
    validation = await run('rustc', [
      '--edition', '2024', '-O', ...(process.platform === 'win32' && linker ? ['-C', `linker=${linker}`] : []),
      '-o', binary, file,
    ]);
    observe = (args) => run(binary, args);
  } else if (language === 'Lean') {
    validation = await run('lean', ['--run', file]);
    observe = async () => validation;
  } else {
    validation = await run('rocq', ['compile', '-q', path.basename(file)], directory);
    observe = async () => ({ ...validation, stdout: rocqLines(validation.stdout).map((line) => `${line}\n`).join('') });
  }
  const diagnostics = `${validation.stdout}\n${validation.stderr}`;
  const clean = validation.ok && (language === 'Lean' || language === 'Rocq'
    ? !/warning|error|sorry/iu.test(diagnostics)
    : true);
  if (!clean) return { accepted: false, diagnostics };
  const main = await observe([]);
  const theorems = language === 'JavaScript' || language === 'Rust'
    ? await observe(['--ml-check-theorems'])
    : null;
  return {
    accepted: true,
    diagnostics,
    ran: main.ok,
    lines: main.stdout.split('\n').slice(0, -1),
    theorems,
  };
}

const sourceRuns = new Map();
async function sourceRun(language) {
  if (!sourceRuns.has(language)) {
    sourceRuns.set(language, (async () => {
      const directory = await mkdtemp(path.join(tmpdir(), `issue-195-source-${language.toLowerCase()}-`));
      try {
        const text = await readFile(new URL(corpus.sources[language].file, corpusDirectory), 'utf8');
        return await execute(language, text, directory, 'project');
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    })());
  }
  return sourceRuns.get(language);
}

function forbiddenMarkers(target, code) {
  const markers = corpus.targets[target].forbidden ?? [];
  const body = code.split('\n').slice(1).join('\n');
  return markers.filter((marker) => new RegExp(`\\b${marker}\\b`, 'u').test(body));
}

function identifierTerms(network) {
  return new Set(network.links()
    .filter((link) => link.metadata().linkType === LinkType.SourceToken)
    .map((link) => link.metadata().term));
}

const lastSegment = (name) => name.split('.').at(-1);

for (const source of LANGUAGES) {
  for (const target of LANGUAGES) {
    if (source === target) continue;
    const pair = `${source} -> ${target}`;
    const requirementId = `I195-TRANSLATE-${source.toLowerCase()}-to-${target.toLowerCase()}`;
    const testName = `${pair} translation of the project corpus is validated, observed and fault-injected natively`;
    test(testName, { timeout: 600_000 }, async (t) => {
      const toolsPresent = (await Promise.all([source, target].map(toolAvailable))).every(Boolean);
      if (!toolsPresent) {
        assert.equal(toolchainRequired, false, `${TOOLS[source]} and ${TOOLS[target]} are required for acceptance`);
        t.skip(`${TOOLS[source]} or ${TOOLS[target]} is not installed`);
        return;
      }
      const from = corpus.sources[source];
      const to = corpus.targets[target];
      const sourceBytes = await readFile(new URL(from.file, corpusDirectory));
      assert.equal(sha256(sourceBytes), from.sha256, `${from.file} is the pinned corpus source`);
      assert.equal(sha256(expectedBytes), corpus.expectedOutput.sha256, 'the pinned expected output');
      const text = sourceBytes.toString('utf8');
      const passed = new Set();

      const translation = translateProgram(text, source, target);
      assert.equal(translation.sourceLanguage, source);
      assert.equal(translation.targetLanguage, target);
      passed.add('publicTranslatorUsed');

      const { contract, semantics, code } = translation;
      assert.equal(contract.support, 'semantic-translation', JSON.stringify(translation.diagnostic));
      assert.equal(translation.diagnostic, null);
      assert.equal(contract.obligation, null);
      assert.doesNotMatch(code, /meta-language:portable-source-envelope/u);
      assert.throws(() => decodeProgramTranslation(code, target));
      passed.add('noUnsupportedDescriptor');

      const network = LinkNetwork.parse(code, corpus.sources[target].grammar);
      assert.equal(network.reconstructText(), code, 'the target CST reconstructs the artifact byte for byte');
      assert.equal(network.verifyFullMatch().isClean(), true, `${target} artifact parses without error nodes`);
      passed.add('targetParses');

      const directory = await mkdtemp(path.join(tmpdir(), `issue-195-${source}-${target}-`.toLowerCase()));
      try {
        const [targetRun, originalRun] = await Promise.all([
          execute(target, code, directory, `${source}_to_${target}`.toLowerCase()),
          sourceRun(source),
        ]);
        assert.equal(targetRun.accepted, true, targetRun.diagnostics);
        assert.equal(targetRun.ran, true, targetRun.diagnostics);
        passed.add('nativeTargetValidation');

        const terms = identifierTerms(network);
        for (const mapping of semantics.mappings) {
          if (target === 'JavaScript' && mapping.kind === 'data') {
            // Untyped JavaScript has no type declaration; the data encoding stands for it.
            assert.ok(semantics.encodings.some(({ id }) => id === 'data'), mapping.target);
          } else if (target === 'JavaScript' && mapping.kind === 'constructor') {
            assert.ok(code.includes(`$: '${lastSegment(mapping.target)}'`), `${target} tags ${mapping.target}`);
          } else {
            assert.ok(terms.has(lastSegment(mapping.target)), `${target} declares ${mapping.target}`);
          }
        }
        passed.add('realTargetArtifact');

        assert.equal(semantics.entry, 'main');
        assert.deepEqual(targetRun.lines, expectedLines, `${target} prints the observed lines`);
        passed.add('observationContractChecked');

        assert.equal(originalRun.accepted, true, originalRun.diagnostics);
        assert.deepEqual(originalRun.lines, expectedLines, `${source} source prints the observed lines`);
        assert.deepEqual(targetRun.lines, originalRun.lines);

        const mutated = mutate(text, from.mutation);
        const mutant = translateProgram(mutated, source, target);
        assert.equal(mutant.contract.support, 'semantic-translation');
        const mutantRun = await execute(target, mutant.code, directory, `mutant_${source}_to_${target}`.toLowerCase());
        // `fact 5 = 120` is a theorem or assertion of every corpus program, so a proof
        // target's kernel rejects the mutant; a program target aborts on the translated
        // assertion or reports the translated theorem as failing.
        if (to.proof) {
          assert.equal(mutantRun.accepted, false, `${target} kernel rejects the fault-injected ${source} source`);
        } else {
          assert.equal(mutantRun.accepted, true, mutantRun.diagnostics);
          assert.notDeepEqual(mutantRun.lines, expectedLines, `${target} observes the fault-injected ${source} source`);
          assert.equal(
            mutantRun.ran === false || mutantRun.theorems.ok === false,
            true,
            `${target} reports the broken fact_five obligation`,
          );
        }
        passed.add('semanticPreservationChecked');

        assert.ok(contract.observation.length > 0);
        assert.ok(semantics.observationProcedure.includes(TOOLS[target] === 'rustc' ? 'rustc' : TOOLS[target]));
        passed.add('observationModelRecorded');

        assert.ok(contract.encoding.length > 0);
        assert.ok(semantics.encodings.some(({ id }) => id === 'program-output'));
        for (const encoding of semantics.encodings) {
          assert.ok(encoding.id.length > 0 && encoding.statement.length > 0, encoding.id);
        }
        assert.equal(semantics.runtimeDependencies[0], to.runtime);
        for (const match of code.matchAll(/^From ([A-Za-z]+) Require Import ([^.\n]+)\.$/gmu)) {
          for (const module of match[2].trim().split(/\s+/u)) {
            assert.ok(semantics.runtimeDependencies.includes(`${match[1]}.${module}`), module);
          }
        }
        passed.add('encodingAndRuntimeRecorded');

        assert.deepEqual(semantics.assumptions.map(({ id }) => id), corpus.assumptions[pair]);
        assert.deepEqual(contract.assumptions, semantics.assumptions.map(({ statement }) => statement));
        for (const assumption of semantics.assumptions) assert.ok(assumption.details.length > 0);
        passed.add('assumptionsRecorded');

        const obligations = semantics.obligations;
        assert.deepEqual(
          obligations.filter(({ kind }) => kind === 'theorem').map(({ source: name }) => name),
          from.theorems,
          'every source theorem is an obligation',
        );
        assert.equal(obligations.filter(({ kind }) => kind === 'assertion').length, from.assertions);
        for (const obligation of obligations) {
          if (obligation.discharge === 'target-kernel') {
            assert.equal(to.proof, true);
            assert.match(code, new RegExp(`^(?:theorem|Theorem) ${obligation.target}\\b`, 'mu'));
          } else if (obligation.discharge === 'source-kernel') {
            assert.equal(to.proof, false);
            assert.equal(originalRun.accepted, true, `${TOOLS[source]} checks ${obligation.source}`);
            assert.equal(targetRun.theorems.ok, true, targetRun.theorems.stderr);
            assert.match(targetRun.theorems.stdout, new RegExp(`^theorem ${obligation.source}: holds`, 'mu'));
          } else {
            assert.equal(obligation.discharge, 'runtime-assertion');
            assert.equal(to.proof, false);
            assert.equal(targetRun.ran, true);
          }
        }
        passed.add('formalObligationsDischarged');

        const sources = semantics.mappings.map(({ source: name }) => name);
        for (const name of from.mappings) assert.ok(sources.includes(name), `${name} is mapped`);
        for (const mapping of semantics.mappings.filter(({ kind }) => kind !== 'constructor')) {
          const span = text.slice(mapping.sourceSpan.start, mapping.sourceSpan.end);
          assert.ok(span.includes(lastSegment(mapping.source)), `${mapping.source} span covers its declaration`);
        }
        passed.add('sourceMappingsPreserved');

        assert.deepEqual(readTranslationProvenance(code, target), {
          sourceLanguage: source,
          sourceSha256: from.sha256,
          sourceBytes: sourceBytes.length,
        });
        assert.equal(semantics.provenance.header, code.split('\n', 1)[0]);
        assert.equal(semantics.provenance.sourceSha256, from.sha256);
        passed.add('provenanceRecorded');

        assert.equal(code.includes(text), false, 'the artifact does not carry the source text');
        assert.equal(semantics.provenance.sourceLanguage, source);
        assert.notEqual(sha256(code), from.sha256);
        passed.add('noSourceRelabelling');

        assert.deepEqual(forbiddenMarkers(target, code), [], 'no admitted or axiomatised obligations');
        assert.equal(targetRun.lines.length, expectedLines.length, 'no printed effect is erased');
        passed.add('noSilentWeakening');
      } finally {
        await rm(directory, { recursive: true, force: true });
      }

      assert.deepEqual([...passed].sort(), [...ASSERTIONS].sort());
      recordIssue195Observations({
        requirementId,
        suffix: 'positive',
        fixtureId: `planned:translation:${source}:${target}`,
        fixtureFile: ISSUE_195_FIXTURE_FILES.fourLanguage,
        assertions: ASSERTIONS,
        testName,
      });
    });
  }
}

function mutate(text, { find, replace }) {
  assert.equal(text.split(find).length, 2, `the mutation site ${JSON.stringify(find)} is unique`);
  return text.replace(find, replace);
}

test('the fault-injected corpus is rejected by the source toolchain itself', async (t) => {
  for (const language of LANGUAGES) {
    if (!(await toolAvailable(language))) {
      assert.equal(toolchainRequired, false, `${TOOLS[language]} is required for acceptance`);
      continue;
    }
    const from = corpus.sources[language];
    const text = await readFile(new URL(from.file, corpusDirectory), 'utf8');
    const directory = await mkdtemp(path.join(tmpdir(), `issue-195-mutant-${language.toLowerCase()}-`));
    try {
      const mutantRun = await execute(language, mutate(text, from.mutation), directory, 'project');
      assert.ok(
        !mutantRun.accepted || !mutantRun.ran || JSON.stringify(mutantRun.lines) !== JSON.stringify(expectedLines),
        `${language} observes its own fault-injected source`,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
  t.diagnostic('every source toolchain distinguishes the mutant from the corpus');
});
