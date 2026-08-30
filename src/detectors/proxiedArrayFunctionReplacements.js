/**
 * @module proxiedArrayFunctionReplacements
 *
 * Label: `proxied_array_function_replacements`
 *
 * `proxied_` modifier over `array_function_replacements`: access goes through a cluster
 * of single-return wrapper functions that remap arguments toward a root decoder.
 * No rotate IIFE is required (that compound is `augmented_proxied_*`).
 */

import {
  findArrayDeclarationCandidates,
  getProxyWrapperInfo,
  hasProxiedWrapperCluster,
} from './sharedDetectionMethods.js';

const name = 'proxied_array_function_replacements';

/**
 * Returns true when `funcNode` is a single-return function whose return value is
 * `arrayName[...]`.
 *
 * @param {ASTNode} funcNode - FunctionDeclaration / FunctionExpression / ArrowFunctionExpression.
 * @param {string} arrayName - Binding name of the string table.
 * @returns {boolean}
 */
function functionReturnsArrayMember(funcNode, arrayName) {
  const body = funcNode?.body?.type === 'BlockStatement' ? funcNode.body.body : null;
  const ret = body
    ? (body.length === 1 && body[0].type === 'ReturnStatement' ? body[0].argument : null)
    : funcNode?.body;
  return ret?.type === 'MemberExpression' && ret.object?.name === arrayName;
}

/**
 * Detects proxied array-function replacements.
 *
 * ## Algorithm
 * 1. Require a proxy-wrapper cluster (`hasProxiedWrapperCluster`): single-return
 *    functions whose arguments are a permutation of params (optionally `param ± n` or
 *    a literal), rejecting pure 1:1 same-name passthroughs.
 * 2. Find large literal-array declarators.
 * 3. Find decoder functions that `return arrayName[...]`.
 * 4. Succeed if at least one wrapper calls a decoder, or a wrapper→wrapper hop reaches one.
 *
 * ## Example (true positive)
 * ```js
 * function dec(i, k) { return table[i]; }
 * function w1(a, b, c) { return dec(b - 4, c); }
 * function w2(x, y) { return w1(0, x, y); }
 * ```
 *
 * ## True negatives
 * - Single 1:1 same-name passthrough (`function wrap(i,k){ return dec(i,k); }`).
 * - Multi-statement wrappers.
 * - Wrappers with no decoder / array-function table in scope.
 *
 * ## Reduced-mode priority
 * - `prioritizeOver`: `array_function_replacements`.
 * - Suppressed by `augmented_proxied_array_function_replacements` when that also fires.
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST.
 * @returns {boolean} True when the pattern is present.
 */
function detectProxiedArrayFunctionReplacements(flatTree) {
  if (!hasProxiedWrapperCluster(flatTree)) return false;

  const candidates = findArrayDeclarationCandidates(flatTree);
  if (!candidates.length) return false;

  const funcs = [
    ...(flatTree[0].typeMap.FunctionDeclaration || []),
    ...(flatTree[0].typeMap.FunctionExpression || []),
  ];

  const wrappers = funcs
    .map(func => {
      const info = getProxyWrapperInfo(func);
      return info ? {func, ...info, name: func.id?.name || func.parentNode?.id?.name} : null;
    })
    .filter(Boolean);

  return candidates.some(c => {
    const arrayName = c.id.name;
    const decoders = funcs.filter(func => functionReturnsArrayMember(func, arrayName));
    if (!decoders.length) return false;

    const decoderNames = new Set(decoders.map(d => d.id?.name || d.parentNode?.id?.name).filter(Boolean));
    // At least one wrapper targets a decoder, or a chain that reaches one.
    const wrapperNames = new Set(wrappers.map(w => w.name).filter(Boolean));
    return wrappers.some(w => decoderNames.has(w.calleeName)) ||
			wrappers.some(w => wrapperNames.has(w.calleeName) &&
				wrappers.some(inner => inner.name === w.calleeName && decoderNames.has(inner.calleeName)));
  });
}

/**
 * @type {{name: string, prioritizeOver: string[], detect: Function}}
 */
const detector = {
  name,
  prioritizeOver: ['array_function_replacements'],
  detect: detectProxiedArrayFunctionReplacements,
};

export {detector, detectProxiedArrayFunctionReplacements};
