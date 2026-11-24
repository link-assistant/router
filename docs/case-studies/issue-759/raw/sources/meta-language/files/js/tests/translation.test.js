import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LinkNetwork,
  LinkQuery,
  LinkType,
  TranslationRule,
  TranslationRuleSet,
} from '../src/index.js';

const TARGET = 'JavaScript';
const COMMAND = `${TARGET}:command`;
const VALUE = `${TARGET}:value`;

function syntax(term) {
  return new LinkQuery({
    linkType: LinkType.Syntax,
    language: 'Shell',
  }).withTerm(term);
}

function command(network, text) {
  return network.insertSyntaxNode('Shell', 'command', [
    network.insertSourceToken('Shell', text),
  ]);
}

function commandRule() {
  return new TranslationRule('command', syntax('command'))
    .withReferenceCapture('body', 0)
    .withTemplate(TARGET, 'await $`{body}`;');
}

test('translation rules recursively render captured child links', () => {
  const network = new LinkNetwork();
  const root = network.insertSyntaxNode('Shell', 'and', [
    command(network, 'cd /tmp'),
    command(network, 'ls -la'),
  ]);
  const rules = new TranslationRuleSet('shell-to-js', [
    new TranslationRule('and', syntax('and'))
      .withReferenceCapture('left', 0)
      .withReferenceCapture('right', 1)
      .withTemplate(TARGET, '{left}\n{right}'),
    commandRule(),
  ]);

  assert.equal(
    rules.render(TARGET, network, root),
    'await $`cd /tmp`;\nawait $`ls -la`;',
  );
});

test('different rules compose across sibling rendering roots', () => {
  const network = new LinkNetwork();
  network.insertSyntaxNode('Shell', 'comment', [
    network.insertSourceToken('Shell', 'build step'),
  ]);
  command(network, 'make all');
  const rules = new TranslationRuleSet('shell-to-js', [
    new TranslationRule('comment', syntax('comment'))
      .withReferenceCapture('body', 0)
      .withTemplate(TARGET, '// {body}'),
    commandRule(),
  ]);

  assert.equal(
    rules.render(TARGET, network),
    '// build step\nawait $`make all`;',
  );
});

test('rendering without a target template preserves the source text', () => {
  const network = new LinkNetwork();
  command(network, 'make all');
  const rules = new TranslationRuleSet('shell-to-js', [commandRule()]);

  assert.equal(rules.render('Python', network), 'make all');
});

test('variadic placeholders recursively render and join child references', () => {
  const network = new LinkNetwork();
  const root = network.insertSyntaxNode('Shell', 'pipeline', [
    command(network, 'ls'),
    command(network, 'grep test'),
    command(network, 'wc -l'),
  ]);
  const rules = new TranslationRuleSet('shell-to-js', [
    new TranslationRule('pipeline', syntax('pipeline'))
      .withTemplate(TARGET, 'await $`{*.:command| | }`;')
      .withTemplate(COMMAND, '{*.:command| | }'),
    new TranslationRule('command', syntax('command'))
      .withReferenceCapture('body', 0)
      .withTemplate(COMMAND, '{body:text}'),
  ]);

  assert.equal(rules.render(TARGET, network, root), 'await $`ls | grep test | wc -l`;');
});

test('optional template segments and unresolved captures render as empty', () => {
  const network = new LinkNetwork();
  const withoutValue = network.insertSyntaxNode('Shell', 'return', []);
  const withValue = network.insertSyntaxNode('Shell', 'return', [
    network.insertSourceToken('Shell', 'result'),
  ]);
  const rules = new TranslationRuleSet('shell-to-js', [
    new TranslationRule('return', syntax('return'))
      .withReferenceCapture('value', 0)
      .withTemplate(TARGET, 'return{?value} {value:text}{/value};{missing}'),
  ]);

  assert.equal(rules.render(TARGET, network, withoutValue), 'return;');
  assert.equal(rules.render(TARGET, network, withValue), 'return result;');
});

test('placeholder contexts use declarative target-language fallbacks', () => {
  const network = new LinkNetwork();
  const word = network.insertSyntaxNode('Shell', 'word', [
    network.insertSourceToken('Shell', 'hello'),
  ]);
  const root = network.insertSyntaxNode('Shell', 'assignment', [word]);
  const rules = new TranslationRuleSet('shell-to-js', [
    new TranslationRule('assignment', syntax('assignment'))
      .withReferenceCapture('value', 0)
      .withTemplate(TARGET, 'const value = `{value:value}`;'),
    new TranslationRule('word', syntax('word'))
      .withReferenceCapture('body', 0)
      .withTemplate(COMMAND, '{body:text}'),
  ]).withLanguageFallback(VALUE, COMMAND);

  assert.equal(rules.render(TARGET, network, root), 'const value = `hello`;');
  assert.deepEqual(TranslationRuleSet.fromLino(rules.toLino()), rules);
  assert.deepEqual(TranslationRuleSet.fromJson(rules.toJson()), rules);
});

test('multi-line substitutions inherit the placeholder indentation', () => {
  const network = new LinkNetwork();
  const body = network.insertSyntaxNode('Shell', 'block', [
    command(network, 'first'),
    command(network, 'second'),
  ]);
  const root = network.insertSyntaxNode('Shell', 'if', [body]);
  const rules = new TranslationRuleSet('shell-to-js', [
    new TranslationRule('if', syntax('if'))
      .withReferenceCapture('body', 0)
      .withTemplate(TARGET, 'if (ready) {\n  {body}\n}'),
    new TranslationRule('block', syntax('block'))
      .withTemplate(TARGET, '{*.|\\n}'),
    commandRule(),
  ]);

  assert.equal(
    rules.render(TARGET, network, root),
    'if (ready) {\n  await $`first`;\n  await $`second`;\n}',
  );
});
