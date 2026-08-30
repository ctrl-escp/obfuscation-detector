/**
 * @module functionToArrayReplacements
 *
 * Label: `function_to_array_replacements`
 *
 * Base replacements-family detector for a string table obtained by calling a function
 * (classic `const a = fn(); a[i]`) or a memoized self-reassign factory used by
 * javascript-obfuscator.
 */

import {
  findMemoizedStringArrayFactory,
} from './sharedDetectionMethods.js';

const name = 'function_to_array_replacements';

/**
 * Detects the Function To Array Replacements obfuscation type.
 *
 * ## Algorithm
 * Succeeds if **either** path matches:
 *
 * ### Classic path
 * 1. Find a `VariableDeclarator` whose init is a call to a function (`Function*` callee).
 * 2. Require at least one reference to that binding.
 * 3. Require every reference to be the object of a `MemberExpression` (`a[i]` / `a.prop`).
 *
 * ### Memoized factory path
 * 1. Find a function that allocates a string-literal array (≥ 5 elements).
 * 2. Reassigns **itself** to a function that returns that array.
 * 3. Returns a call to itself (`return f()`).
 *
 * ## Example (classic)
 * ```js
 * const a = (function () { return ['x', 'y', 'z', 'hello', 'world']; })();
 * console.log(a[0], a[1]);
 * ```
 *
 * ## Example (memoized factory)
 * ```js
 * function f() {
 *   const a = ['x', 'y', 'z', 'hello', 'world'];
 *   f = function () { return a; };
 *   return f();
 * }
 * ```
 *
 * ## True negatives
 * - Factory that returns a non-array.
 * - Array of non-strings only / one-element memoized cache (below min length).
 * - Factory that is never structured as self-reassign + self-call.
 * - Classic binding used as something other than a member-expression object.
 *
 * ## Reduced-mode priority
 * - `prioritizeOver`: none.
 * - Often co-fires with `augmented_proxied_array_function_replacements`.
 * - Suppressed by `obfuscator_io` when that composite also fires.
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST.
 * @returns {boolean} True when either path matches.
 */
function detectFunctionToArrayReplacements(flatTree) {
  const classic = (flatTree[0].typeMap.VariableDeclarator || []).some(n =>
    n.type === 'VariableDeclarator' &&
		n?.init?.callee?.type?.indexOf('unction') > -1 &&
		n?.id?.references?.length &&
		!n.id.references.some(r =>
		  !(r.parentNode.type === 'MemberExpression' &&
			r.parentKey === 'object')));

  return classic || !!findMemoizedStringArrayFactory(flatTree);
}

/**
 * @type {{name: string, prioritizeOver: string[], detect: Function}}
 */
const detector = {
  name,
  prioritizeOver: [],
  detect: detectFunctionToArrayReplacements,
};

export {detector, detectFunctionToArrayReplacements};
