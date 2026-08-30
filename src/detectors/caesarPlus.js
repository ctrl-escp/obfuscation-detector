/**
 * @module caesarPlus
 *
 * Label: `caesar_plus`
 *
 * Detects Caesar-cipher-like packing that wraps logic in a 3-letter-named IIFE and
 * references `window`, `document`, and `String.fromCharCode` inside that scope.
 */

const name = 'caesar_plus';

/**
 * Checks if a target AST node is within a given scope block by walking `scope.upper`.
 *
 * @param {ASTNode} targetNode - The node to check.
 * @param {ASTNode} targetScopeBlock - The scope block to check against.
 * @returns {boolean} True if the node is in the scope; otherwise, false.
 */
function isNodeInScope(targetNode, targetScopeBlock) {
  if (!targetScopeBlock) return true;
  let currentScope = targetNode.scope;
  while (currentScope) {
    if (targetScopeBlock === currentScope.block) return true;
    currentScope = currentScope.upper;
  }
  return false;
}

/**
 * Detects the Caesar Plus obfuscation type.
 *
 * ## Algorithm
 * 1. Find `FunctionExpression` nodes with a 3-character `id`, wrapped in a no-arg
 *    `CallExpression` (IIFE).
 * 2. Restrict attention to nodes in that function's scope.
 * 3. Require every `VariableDeclarator` id in that scope to also be length 3.
 * 4. Require references to `window`, `document`, and `String.fromCharCode` inside the scope.
 *
 * ## Example (shape)
 * ```js
 * (function abc() {
 *   var xyz = String.fromCharCode(65);
 *   return window[xyz] || document;
 * })();
 * ```
 *
 * ## True negatives
 * - 3-letter IIFEs without the window/document/fromCharCode trio.
 * - Scopes that mix in longer identifier names.
 *
 * ## Reduced-mode priority
 * - `prioritizeOver`: none.
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST.
 * @returns {boolean} True when the pattern is present.
 */
function detectCaesarPlus(flatTree) {
  // Verify the main function's name is 3 letters long and has maximum 1 reference;
  const candidates = (flatTree[0].typeMap.FunctionExpression || []).filter(n =>
    n.type === 'FunctionExpression' &&
		n?.id?.name?.length === 3 &&
		n?.parentNode?.type === 'CallExpression' && !n.parentNode.arguments.length);

  for (const c of candidates) {
    const funcTree = flatTree.filter(n => isNodeInScope(n, c.isScopeBlock ? c : c.scope.block));
    // Verify all variables are 3 letters long
    if (!funcTree.some(n => n.type === 'VariableDeclarator' &&
			n.id.name.length !== 3)) {
      // Verify that inside the function there are references to window, document and String.fromCharCode;
      if (funcTree.some(n => n.type === 'Identifier' && n.name === 'window') &&
				funcTree.some(n => n.type === 'Identifier' && n.name === 'document') &&
				funcTree.some(n => n.type === 'MemberExpression' &&
					n.object.type === 'Identifier' &&
					n.object.name === 'String' &&
					'fromCharCode' === (n.property.name || n.property.value))) return true;
    }
  }
  return false;
}

/**
 * @type {{name: string, prioritizeOver: string[], detect: Function}}
 */
const detector = {
  name,
  prioritizeOver: [],
  detect: detectCaesarPlus,
};

export {detector, detectCaesarPlus};
