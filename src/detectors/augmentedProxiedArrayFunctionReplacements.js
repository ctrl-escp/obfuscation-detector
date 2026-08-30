/**
 * @module augmentedProxiedArrayFunctionReplacements
 *
 * Label: `augmented_proxied_array_function_replacements`
 *
 * Most inclusive replacements-family compound commonly emitted by javascript-obfuscator:
 * memoized string-array factory + rotate IIFE (+ optional proxy wrappers / decoder).
 */

import {
  findAugmentingIIFE,
  findMemoizedStringArrayFactory,
  functionBodyRotatesAnArgument,
  hasProxiedWrapperCluster,
  isMemoizedStringArrayFactory,
} from './sharedDetectionMethods.js';

const name = 'augmented_proxied_array_function_replacements';

/**
 * Checks if a node is a call expression with a named reference argument.
 *
 * @param {ASTNode} node - Candidate CallExpression (or nullish).
 * @param {string} refName - Identifier name that must appear among the arguments.
 * @returns {boolean}
 */
function isCallExpressionWithNamedReferenceArgument(node, refName) {
  return node?.type === 'CallExpression' && (node.arguments || []).some(a => a?.name === refName);
}

/**
 * Finds an IIFE (FunctionExpression/Arrow callee) that receives `factoryName` and
 * rotates an array inside its body (literal hop or checksum stop).
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST.
 * @param {string} factoryName - Name of the memoized factory function.
 * @returns {ASTNode|null} Matching CallExpression, or null.
 */
function findFactoryAugmentingIIFE(flatTree, factoryName) {
  const calls = flatTree[0].typeMap.CallExpression || [];
  return calls.find(n =>
    (n.callee.type === 'FunctionExpression' || n.callee.type === 'ArrowFunctionExpression') &&
		n.arguments.some(arg => arg.name === factoryName) &&
		functionBodyRotatesAnArgument(n.callee)) || null;
}

/**
 * Detects the Augmented Proxied Array-Function Replacements obfuscation type.
 *
 * ## Algorithm
 * Paths are tried in order; any success is enough:
 *
 * 1. **Factory + rotate IIFE (primary)**
 *    Locate a memoized string-array factory, then an IIFE that takes that factory
 *    and rotates via `functionBodyRotatesAnArgument` (works even when nested / not
 *    a program root).
 *
 * 2. **Legacy root shape**
 *    Program has ≥ 3 roots; a root `FunctionDeclaration` factory exists; another root
 *    ExpressionStatement is an IIFE (or sequence starting with one) that receives the
 *    factory name.
 *
 * 3. **Factory + wrappers + rotate**
 *    Factory present, proxy-wrapper cluster present, and an augmenting IIFE on the
 *    factory (by reference parents or by scanning calls).
 *
 * ## Example (shape)
 * ```js
 * function f() {
 *   const a = ['x', 'y', '...'];
 *   f = function () { return a; };
 *   return f();
 * }
 * function dec(i, k) { return f()[i]; }
 * function w1(a, b, c) { return dec(b - 4, c); }
 * (function (factory, expected) {
 *   const arr = factory();
 *   while (true) {
 *     if (parseInt(dec(0)) + parseInt(dec(1)) === expected) break;
 *     arr.push(arr.shift());
 *   }
 * })(f, 42);
 * ```
 *
 * ## True negatives
 * - Factory without a rotating IIFE.
 * - Rotate without a memoized factory (may still be `augmented_array_function_replacements`).
 *
 * ## Reduced-mode priority
 * - `prioritizeOver`: `array_function_replacements`, `augmented_array_function_replacements`,
 *   `proxied_array_function_replacements`.
 * - May be suppressed by `obfuscator_io` when that composite also fires.
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST.
 * @returns {boolean} True when any recognition path matches.
 */
function detectAugmentedProxiedArrayFunctionReplacements(flatTree) {
  const factory = findMemoizedStringArrayFactory(flatTree);
  if (factory) {
    const factoryName = factory.id?.name || factory.parentNode?.id?.name;
    if (factoryName && findFactoryAugmentingIIFE(flatTree, factoryName)) {
      return true;
    }
  }

  // Legacy shape: several program roots with a root FunctionDeclaration factory + IIFE.
  const roots = flatTree[0].childNodes;
  if (roots.length >= 3) {
    const arrFunc = roots.find(n =>
      n.type === 'FunctionDeclaration' && isMemoizedStringArrayFactory(n));

    if (arrFunc) {
      const arrFuncName = arrFunc.id.name;
      if (roots.some(n =>
        n.type === 'ExpressionStatement' &&
				(isCallExpressionWithNamedReferenceArgument(n.expression, arrFuncName) ||
					(n.expression.type === 'SequenceExpression' &&
						isCallExpressionWithNamedReferenceArgument(n.expression.expressions[0], arrFuncName))),
      )) {
        return true;
      }
    }
  }

  // Factory + wrappers without requiring the IIFE to be a program root.
  if (factory && hasProxiedWrapperCluster(flatTree)) {
    const refsParents = (factory.id?.references || []).map(r => r.parentNode);
    if (findAugmentingIIFE(refsParents, factory.id.name) || findFactoryAugmentingIIFE(flatTree, factory.id.name)) {
      return true;
    }
  }

  return false;
}

/**
 * @type {{name: string, prioritizeOver: string[], detect: Function}}
 */
const detector = {
  name,
  prioritizeOver: [
    'array_function_replacements',
    'augmented_array_function_replacements',
    'proxied_array_function_replacements',
  ],
  detect: detectAugmentedProxiedArrayFunctionReplacements,
};

export {detector, detectAugmentedProxiedArrayFunctionReplacements};
