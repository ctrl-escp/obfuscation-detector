/**
 * @module arrayReplacements
 *
 * Label: `array_replacements`
 *
 * Base replacements-family detector for a large literal array used as a lookup table
 * via many `arr[i]` member reads.
 */

import {arrayHasMinimumRequiredReferences, findArrayDeclarationCandidates} from './sharedDetectionMethods.js';

const name = 'array_replacements';

/**
 * Detects the Array Replacements obfuscation type.
 *
 * ## Algorithm
 * 1. Collect variable declarators whose init is a literal `ArrayExpression` large
 *    enough relative to the AST (`findArrayDeclarationCandidates`).
 * 2. For each candidate, gather parent nodes of identifier references.
 * 3. Succeed if member-expression reads of that array are a meaningful share of the AST
 *    (`arrayHasMinimumRequiredReferences`, ≥ ~2% of nodes).
 *
 * ## Example (true positive)
 * ```js
 * var arr = ['hello', 'world', 'foo', 'bar', '...many more literals'];
 * console.log(arr[0], arr[1], arr[2], arr[3], arr[4]);
 * ```
 *
 * ## True negatives
 * - Tiny arrays (below the length / tree-size threshold).
 * - Arrays that are barely read via member expressions.
 * - Arrays of non-literals (e.g. identifiers, calls).
 *
 * ## Reduced-mode priority
 * - `prioritizeOver`: none (base label).
 * - Suppressed by more inclusive compounds such as `augmented_array_replacements`.
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST (`flatTree[0]` is the Program).
 * @returns {boolean} True when the pattern is present.
 */
function detectArrayReplacements(flatTree) {
  const candidates = findArrayDeclarationCandidates(flatTree);

  const isFound = candidates.some(c => {
    const refs = c.id.references.map(n => n.parentNode);
    return arrayHasMinimumRequiredReferences(refs, c.id.name, flatTree);
  });
  return isFound;
}

/**
 * @type {{name: string, prioritizeOver: string[], detect: Function}}
 */
const detector = {
  name,
  prioritizeOver: [],
  detect: detectArrayReplacements,
};

export {detector, detectArrayReplacements};
