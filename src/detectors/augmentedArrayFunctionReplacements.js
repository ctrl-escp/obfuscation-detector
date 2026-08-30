/**
 * @module augmentedArrayFunctionReplacements
 *
 * Label: `augmented_array_function_replacements`
 *
 * `augmented_` modifier over `array_function_replacements`: the literal array is rotated
 * by an IIFE and then read through a decoder function with many literal-arg calls.
 */

import {
  findArrayDeclarationCandidates,
  findAugmentingIIFE,
  functionHasMinimumRequiredReferences,
} from './sharedDetectionMethods.js';

const name = 'augmented_array_function_replacements';

/**
 * Detects the Augmented Array-Function Replacements obfuscation type.
 *
 * ## Algorithm
 * 1. Find large literal-array declarators with **at most two** references (IIFE arg +
 *    decoder body is the usual shape).
 * 2. Require an augmenting rotate IIFE on that array (`findAugmentingIIFE`).
 * 3. Identify the non-IIFE reference and require its enclosing function to have enough
 *    literal-argument call sites (`functionHasMinimumRequiredReferences`).
 *
 * ## Example
 * ```js
 * var _0x3378 = ['enc1', 'enc2', '...'];
 * (function (arr, n) {
 *   while (--n) arr.push(arr.shift());
 * })(_0x3378, 0x1a0);
 * var dec = function (i) { return _0x3378[i]; };
 * console.log(dec(0), dec(1), dec(2));
 * ```
 *
 * ## True negatives
 * - Rotate without a decoder / without literal-call density.
 * - Array-function shape with no mutating IIFE (`array_function_replacements` only).
 *
 * ## Reduced-mode priority
 * - `prioritizeOver`: `array_function_replacements`.
 * - Often suppressed by `obfuscator_io` or `augmented_proxied_array_function_replacements`.
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST.
 * @returns {boolean} True when the pattern is present.
 */
function detectAugmentedArrayFunctionReplacements(flatTree) {
  const candidates = findArrayDeclarationCandidates(flatTree);

  const isFound = candidates.some(c => {
    if (c.id.references.length > 2) return false;
    const refs = c.id.references;
    const refsParents = c.id.references.map(n => n.parentNode);
    const iife = findAugmentingIIFE(refsParents, c.id.name);
    if (!iife) return false;
    const iifeIdentifier = iife.arguments.find(arg => refs.includes(arg));
    const arrayIdentifierInTargetFunc = refs.find(ref => ref !== iifeIdentifier);
    return functionHasMinimumRequiredReferences(arrayIdentifierInTargetFunc, flatTree);
  });
  return isFound;
}

/**
 * @type {{name: string, prioritizeOver: string[], detect: Function}}
 */
const detector = {
  name,
  prioritizeOver: ['array_function_replacements'],
  detect: detectAugmentedArrayFunctionReplacements,
};

export {detector, detectAugmentedArrayFunctionReplacements};
