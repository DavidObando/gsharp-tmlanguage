# G# TextMate grammar

This repository distributes the shared G# TextMate grammar from
[DavidObando/gsharp](https://github.com/DavidObando/gsharp). It is a distribution
mirror, not a second source of truth or a VS Code extension.

## Grammar

| Asset | Value |
| --- | --- |
| Grammar | [`syntaxes/gsharp.tmLanguage.json`](syntaxes/gsharp.tmLanguage.json) |
| TextMate scope | `source.gsharp` |
| File extension | `.gs` |
| Format | TextMate JSON, with Oniguruma regular expressions |
| License | [MIT, copyright (c) 2019 David Obando](LICENSE) |

The grammar is copied without changes from the same source packaged by the G#
VS Code and Visual Studio extensions. It has no external grammar includes.
Consumers can use the JSON file directly; no build or XML conversion is needed.
Linguist's grammar loader discovers JSON grammars under `syntaxes/` or `grammars/`.
See its [loader](https://github.com/github-linguist/linguist/blob/main/tools/grammars/compiler/loader.go)
and [contribution instructions](https://github.com/github-linguist/linguist/blob/main/CONTRIBUTING.md).
This repository does not itself register G# with Linguist or GitHub.

The separate [dotnet/csharp-tmLanguage](https://github.com/dotnet/csharp-tmLanguage)
repository is the distribution pattern. G# already has a shared JSON grammar,
so this mirror needs no grammar generator, XML output, or editor scaffolding.
The editor-specific Markdown injection is not distributed or registered here.

## Provenance and updates

The initial source commit is
[`a1190b9b77cd8c8aecf5b90cbd6774f26489989e`](https://github.com/DavidObando/gsharp/commit/a1190b9b77cd8c8aecf5b90cbd6774f26489989e).
[`provenance.json`](provenance.json) records the immutable source revision,
original paths, SHA-256 checksums, and test-harness adaptation.

Make grammar fixes and fixture changes in **DavidObando/gsharp first**. After
they merge, update this mirror in one commit:

1. Choose a merged, immutable source commit.
2. Copy its `src/vscode-gsharp/syntaxes/gsharp.tmLanguage.json` to `syntaxes/`,
   `src/vscode-gsharp/src/test/grammar-cases.json` to `test/`, and root `LICENSE`
   here, preserving each Git blob byte for byte.
3. Regenerate `test/reserved-keywords.json` from that commit's
   `src/Core/CodeAnalysis/Syntax/SyntaxFacts.gs`. Extract the `case "word" {`
   labels with `/case\s+"([a-zA-Z]+)"\s*\{/g`, sort them, and serialize with
   `JSON.stringify(words, null, 2) + '\n'`. This matches the upstream harness.
4. Review upstream `src/vscode-gsharp/src/test/grammar.test.ts` for assertion
   changes. Keep this runner's tokenizer assertions aligned.
5. Update `provenance.json`: commit, asset checksums, original compiler-source
   checksum, and harness-source checksum. Update the revision above and test
   counts below if they change.
6. Run `npm ci` and `npm test`, then commit the synchronized assets together.

Do not repair, patch, or extend the mirrored grammar independently. Report
grammar bugs in the [source repository](https://github.com/DavidObando/gsharp/issues).
Mirror packaging or synchronization problems can be reported here.

## Verification

Use Node.js 24 or later. CI uses Node.js 24.

```sh
npm ci
npm test
```

Tests load the distributed file through `vscode-textmate` and the local
`vscode-oniguruma` WASM runtime. They tokenize all **196 shared fixtures**,
plus two vocabulary cases covering the 55 reserved compiler keywords and their
escaped identifiers. They retain upstream positive, negative, multiline-state,
and interpolation-format assertions. One additional test checks asset hashes.
No network or compiler checkout is needed after dependency installation.

The shared fixture JSON is copied byte for byte. The reserved vocabulary is a
derived snapshot, not a live query of the compiler. Upstream retains the
compiler-source and editor-injection structural tests. This mirror verifies
TextMate/Oniguruma behavior; Linguist's PCRE grammar-compiler validation remains
a separate downstream integration check.
