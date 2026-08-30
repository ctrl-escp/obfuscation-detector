/**
 * @module augmentedArrayReplacements
 *
 * Label: `augmented_array_replacements`
 *
 * `augmented_` modifier over `array_replacements`: the string table is rotated by an
 * IIFE before (or while) being read via many `arr[i]` member expressions.
 */

import {
  arrayHasMinimumRequiredReferences,
  findArrayDeclarationCandidates,
  findAugmentingIIFE,
} from './sharedDetectionMethods.js';

const name = 'augmented_array_replacements';

/**
 * Detects the Augmented Array Replacements obfuscation type.
 *
 * ## Algorithm
 * 1. Find large literal-array declarators (`findArrayDeclarationCandidates`).
 * 2. Require an augmenting IIFE that takes the array as an argument and rotates it
 *    (`findAugmentingIIFE` → `functionBodyRotatesAnArgument`):
 *    - mutation via `push`/`shift` (or `unshift`/`pop`), **and**
 *    - either a literal hop count **or** a checksum `while` that `parseInt`s array
 *      elements (or decoder results) and compares to a number.
 * 3. Require enough direct member reads of the array (`arrayHasMinimumRequiredReferences`).
 *
 * ## Example (literal hop count)
 * ```js
 * (function (arr, n) {
 *   for (let i = 0; i < n; i++) arr.push(arr.shift());
 * })(someArray, 3);
 * ```
 *
 * ## Example (checksum rotate)
 * ```js
 * (function (arr) {
 *   while (true) {
 *     if (parseInt(arr[0]) + parseInt(arr[1]) === 42) break;
 *     arr.push(arr.shift());
 *   }
 * })(someArray);
 * ```
 *
 * ## True negatives
 * - `while` + `push`/`shift` with no parse/compare and no hop count.
 * - IIFE that receives the array but does not mutate it.
 * - Rotate without enough subsequent `arr[i]` density (may be an array-function shape instead).
 *
 * ## Reduced-mode priority
 * - `prioritizeOver`: `array_replacements` (this pattern includes the base).
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST.
 * @returns {boolean} True when the pattern is present.
 */
function detectAugmentedArrayReplacements(flatTree) {
  const candidates = findArrayDeclarationCandidates(flatTree);

  const isFound = candidates.find(c => {
    const refs = c.id.references.map(n => n.parentNode);
    return findAugmentingIIFE(refs, c.id.name) &&
			arrayHasMinimumRequiredReferences(refs, c.id.name, flatTree);
  });
  return !!isFound;
}

/**
 * @type {{name: string, prioritizeOver: string[], detect: Function}}
 */
const detector = {
  name,
  prioritizeOver: ['array_replacements'],
  detect: detectAugmentedArrayReplacements,
};

export {detector, detectAugmentedArrayReplacements};
