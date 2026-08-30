# Obfuscation Detectors

## Overview

This directory contains all the detection logic for identifying different types of JavaScript obfuscation. Each **detector** is a self-contained module that analyzes the AST (Abstract Syntax Tree) of JavaScript code for patterns characteristic of a specific obfuscation technique.

Detectors are modular and easy to extend. Each detector exports a `{name, prioritizeOver, detect}` object. `prioritizeOver` expresses structural inclusiveness for reduced-mode suppression.

---

## List of Detectors

| Detector Name | Label | Implementation |
|---------------|-------|----------------|
| Array Replacements | `array_replacements` | [arrayReplacements.js](arrayReplacements.js) |
| Augmented Array Replacements | `augmented_array_replacements` | [augmentedArrayReplacements.js](augmentedArrayReplacements.js) |
| Array Function Replacements | `array_function_replacements` | [arrayFunctionReplacements.js](arrayFunctionReplacements.js) |
| Augmented Array Function Replacements | `augmented_array_function_replacements` | [augmentedArrayFunctionReplacements.js](augmentedArrayFunctionReplacements.js) |
| Proxied Array Function Replacements | `proxied_array_function_replacements` | [proxiedArrayFunctionReplacements.js](proxiedArrayFunctionReplacements.js) |
| Augmented Proxied Array Function Replacements | `augmented_proxied_array_function_replacements` | [augmentedProxiedArrayFunctionReplacements.js](augmentedProxiedArrayFunctionReplacements.js) |
| Function To Array Replacements | `function_to_array_replacements` | [functionToArrayReplacements.js](functionToArrayReplacements.js) |
| CFF Storage Object | `cff_storage_object` | [cffStorageObject.js](cffStorageObject.js) |
| Sequenced Index Switch | `sequenced_index_switch` | [sequencedIndexSwitch.js](sequencedIndexSwitch.js) |
| Obfuscator.io | `obfuscator_io` | [obfuscatorIo.js](obfuscatorIo.js) |
| js-confuser String Bank | `js_confuser_string_bank` | [jsConfuserStringBank.js](jsConfuserStringBank.js) |
| js-confuser State Machine | `js_confuser_state_machine` | [jsConfuserStateMachine.js](jsConfuserStateMachine.js) |
| Caesar Plus | `caesar_plus` | [caesarPlus.js](caesarPlus.js) |

---

## Replacements-family naming

Bases: `array_replacements`, `array_function_replacements`, `function_to_array_replacements`.

Modifiers: `augmented_` (rotate IIFE with literal hop count or checksum `parseInt` stop), `proxied_` (single-return argument-remapping wrappers).

Compounds keep compositional names (`augmented_proxied_array_function_replacements`, etc.). Shared helpers live in [sharedDetectionMethods.js](sharedDetectionMethods.js).

---

## Product / composite labels

- **`obfuscator_io`**: composite. In reduced mode it can suppress replacements-family hits plus `cff_storage_object` / `sequenced_index_switch`. Full mode still lists every match.
- **`cff_storage_object` / `sequenced_index_switch`**: javascript-obfuscator control-flow extras (not replacements-family).
- **`js_confuser_*`**: separate product labels; they prioritize over `obfuscator_io` if both fire. Not folded into the obfuscator.io composite.

---

## Detector details

Each implementation file’s module JSDoc is the source of truth for:

- **Algorithm** — step-by-step AST checks
- **Examples** — true-positive shapes
- **True negatives** — what must not match
- **`prioritizeOver`** — reduced-mode suppressions

| Label | File | One-line summary |
|-------|------|------------------|
| `array_replacements` | [arrayReplacements.js](arrayReplacements.js) | Large literal array + many `arr[i]` reads |
| `augmented_array_replacements` | [augmentedArrayReplacements.js](augmentedArrayReplacements.js) | Base + rotate IIFE (hop count or checksum) |
| `array_function_replacements` | [arrayFunctionReplacements.js](arrayFunctionReplacements.js) | Decoder over array; many literal-arg calls |
| `augmented_array_function_replacements` | [augmentedArrayFunctionReplacements.js](augmentedArrayFunctionReplacements.js) | Array-function + rotate IIFE |
| `proxied_array_function_replacements` | [proxiedArrayFunctionReplacements.js](proxiedArrayFunctionReplacements.js) | Array-function + remapping wrappers |
| `augmented_proxied_array_function_replacements` | [augmentedProxiedArrayFunctionReplacements.js](augmentedProxiedArrayFunctionReplacements.js) | Factory + rotate (+ wrappers) |
| `function_to_array_replacements` | [functionToArrayReplacements.js](functionToArrayReplacements.js) | `const a = fn(); a[i]` or memoized factory |
| `cff_storage_object` | [cffStorageObject.js](cffStorageObject.js) | 5-letter-key CFF storage object |
| `sequenced_index_switch` | [sequencedIndexSwitch.js](sequencedIndexSwitch.js) | Pipe-split / numeric `switch (seq[i++])` |
| `obfuscator_io` | [obfuscatorIo.js](obfuscatorIo.js) | Product composite fingerprint |
| `js_confuser_string_bank` | [jsConfuserStringBank.js](jsConfuserStringBank.js) | Short-string bank + non-trivial indexer |
| `js_confuser_state_machine` | [jsConfuserStateMachine.js](jsConfuserStateMachine.js) | `sum(states)` loop with switch/if |
| `caesar_plus` | [caesarPlus.js](caesarPlus.js) | 3-letter IIFE + window/document/fromCharCode |

Shared rotate / factory / proxy / CFF helpers: [sharedDetectionMethods.js](sharedDetectionMethods.js).

---

## How to Add a New Detector

1. Create a new file in this directory that exports `{detector}` with `name`, `prioritizeOver`, and `detect(flatTree, previouslyDetectedNames)`.
2. Register it in [index.js](index.js).
3. Document it in this README and the root [README.md](../../README.md).
4. Add TP/TN fixtures under `tests/resources/` and expectations in `tests/detectors.test.js`.

---

## References & Further Reading
- [obfuscator.io](https://obfuscator.io/)
- [AST Explorer](https://astexplorer.net/)

For questions or contributions, see the main [README](../../README.md) and [CONTRIBUTING.md](../../CONTRIBUTING.md).
