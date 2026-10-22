const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {after, before, test} = require('node:test');
const {Registry, INITIAL, parseRawGrammar} = require('vscode-textmate');
const {loadWASM, OnigScanner, OnigString} = require('vscode-oniguruma');

const root = path.resolve(__dirname, '..');
const grammarPath = path.join(root, 'syntaxes', 'gsharp.tmLanguage.json');
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'grammar-cases.json'), 'utf8'));
const reserved = JSON.parse(fs.readFileSync(path.join(__dirname, 'reserved-keywords.json'), 'utf8'));
const provenance = JSON.parse(fs.readFileSync(path.join(root, 'provenance.json'), 'utf8'));
const categories = {
  keyword: /^keyword\./, identifier: /^(variable\.other|entity\.name)/,
  type: /^(support\.type|entity\.name\.type)/, function: /^entity\.name\.function/,
  number: /^constant\.numeric/, operator: /^(keyword\.operator|meta\.conditional)/,
  string: /^string\./, char: /^string\.quoted\.single/, format: /^string\.unquoted\.format/,
  interpolation: /^(meta\.interpolation|variable\.other\.interpolation|punctuation\.definition\.interpolation)/,
  escape: /^constant\.character\.escape/, annotation: /^storage\.type\.annotation/,
  constant: /^constant\.language/, comment: /^comment\./,
};

cases.push({
  name: 'compiler reserved vocabulary',
  source: reserved.join('; '),
  tokens: reserved.map(text => [text, ['true', 'false', 'nil'].includes(text) ? 'constant' : 'keyword']),
}, {
  name: 'all reserved words can be escaped identifiers',
  source: reserved.map(text => `$${text}`).join(' '),
  tokens: reserved.map(text => [`$${text}`, 'identifier']),
});

let registry;
let grammar;
before(async () => {
  const wasm = fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm'));
  await loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
  registry = new Registry({
    onigLib: Promise.resolve({
      createOnigScanner: patterns => new OnigScanner(patterns),
      createOnigString: text => new OnigString(text),
    }),
    loadGrammar: async scope => scope === 'source.gsharp'
      ? parseRawGrammar(fs.readFileSync(grammarPath, 'utf8'), grammarPath)
      : null,
  });
  grammar = await registry.loadGrammar('source.gsharp');
  assert.ok(grammar, 'The distributed grammar must load through TextMate');
});
after(() => registry?.dispose());

test('mirrored assets match their recorded SHA-256 provenance', () => {
  assert.ok(Object.keys(provenance.assets).length > 0);
  for (const [file, {sha256}] of Object.entries(provenance.assets)) {
    const data = fs.readFileSync(path.join(root, file));
    assert.equal(createHash('sha256').update(data).digest('hex'), sha256, file);
  }
});

for (const {name, source, tokens, absent = [], format} of cases) {
  test(name, () => {
    assert.ok(tokens.length > 0, 'Every fixture must assert token scopes');
    let stack = INITIAL;
    const scopes = [];
    const lines = source.split(/(\r\n|\r|\n)/);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 2) {
      const line = lines[lineIndex];
      const result = grammar.tokenizeLine(line, stack);
      assert.equal(result.stoppedEarly, false, 'Tokenization must finish each line');
      for (const token of result.tokens) {
        for (let i = token.startIndex; i < Math.min(token.endIndex, line.length); i++) {
          scopes.push(token.scopes);
        }
      }
      for (let i = 0; i < (lines[lineIndex + 1]?.length ?? 0); i++) scopes.push([]);
      stack = result.ruleStack;
    }
    assert.equal(scopes.length, source.length);
    for (const [expected, present] of [[tokens, true], [absent, false]]) {
      for (const [text, kind] of expected) {
        const start = source.indexOf(text);
        assert.ok(start >= 0, `Fixture text not found: ${JSON.stringify(text)}`);
        assert.ok(categories[kind], `Unknown token category: ${kind}`);
        for (let i = start; i < start + text.length; i++) {
          assert.equal(scopes[i].some(scope => categories[kind].test(scope)), present,
            `${JSON.stringify(text)} at ${i}: expected ${present ? '' : 'no '}${kind}; scopes: ${scopes[i]}`);
        }
      }
    }
    if (format !== undefined) {
      const start = source.lastIndexOf(format);
      assert.ok(start >= 0);
      for (let i = 0; i < source.length; i++) {
        if (scopes[i].some(scope => categories.format.test(scope))) {
          assert.ok(i >= start && i < start + format.length, `Unexpected format scope at ${i}`);
        }
      }
    }
  });
}
