/**
 * @module sharedDetectionMethods
 *
 * Shared AST helpers used by replacements-family detectors and product extras.
 *
 * Naming grammar (replacements family):
 * - **Bases:** `array_replacements`, `array_function_replacements`, `function_to_array_replacements`
 * - **Modifiers:** `augmented_` (rotate IIFE), `proxied_` (argument-remapping wrappers)
 *
 * Thresholds below keep generic “any array / any while” rules from firing on ordinary code.
 */

/** Minimum share of AST nodes that must be member-reads of the target array (percent). */
const minMeaningfulPercentageOfReferences = 2; // 2%
/** Minimum share of AST nodes that the array's element count must represent (percent). */
const minMeaningfulArrayContentLengthPercentage = 2; // 2%
/**
 * Minimum string-literal elements in a memoized self-reassign factory.
 * Prevents one-element caches from matching `function_to_array_replacements`.
 */
const minMemoizedFactoryArrayLength = 5;
/** javascript-obfuscator CFF storage keys are typically five letters. */
const fiveLetterKey = /^[A-Za-z]{5}$/;
/** Pipe-delimited numeric order string, e.g. `0|1|2|3`. */
const pipeSequenceLiteral = /^\d+(\|\d+)+$/;

/**
 * Checks if the number of array elements presents a meaningful percentage of all AST nodes.
 *
 * @param {ASTNode[]} targetArray - The array elements to check.
 * @param {ASTNode[]} flatTree - The flattened AST.
 * @returns {boolean} True if the array is considered meaningful in length.
 */
function arrayHasMeaningfulContentLength(targetArray, flatTree) {
  return Math.floor(targetArray.length / (flatTree.length || 1) * 100) >= minMeaningfulArrayContentLengthPercentage;
}

/**
 * True when `node` is an `ArrayExpression` whose every element is a string `Literal`.
 *
 * @param {ASTNode} node - Candidate array expression.
 * @returns {boolean}
 */
function isStringLiteralArrayExpression(node) {
  return node?.type === 'ArrayExpression' &&
		node.elements.length &&
		!node.elements.some(el => el?.type !== 'Literal' || typeof el.value !== 'string');
}

/**
 * Finds variable declarators that are arrays with more than a few literal items.
 *
 * Candidates must:
 * - have `init.type === 'ArrayExpression'`;
 * - contain only `Literal` elements;
 * - be long enough relative to the AST (`arrayHasMeaningfulContentLength`).
 *
 * @param {ASTNode[]} flatTree - The flattened AST.
 * @returns {ASTNode[]} Array declaration candidates (`VariableDeclarator` nodes).
 */
function findArrayDeclarationCandidates(flatTree) {
  return (flatTree[0].typeMap.VariableDeclarator || []).filter(n =>
    n?.init?.type === 'ArrayExpression' &&
		arrayHasMeaningfulContentLength(n.init.elements, flatTree) &&
		!n.init.elements.some(el => el.type !== 'Literal'));
}

/**
 * Checks if the target array has at least the minimum required member-expression references.
 *
 * @param {ASTNode[]} references - Parent nodes of identifier references to the array.
 * @param {string} targetArrayName - The name of the array variable.
 * @param {ASTNode[]} flatTree - The flattened AST.
 * @returns {boolean} True if member reads are a meaningful share of the AST.
 */
function arrayHasMinimumRequiredReferences(references, targetArrayName, flatTree) {
  return references.filter(n =>
    n.type === 'MemberExpression' &&
		n.object.name === targetArrayName).length / (flatTree.length || 1) * 100 >= minMeaningfulPercentageOfReferences;
}

/**
 * Checks if an IIFE exists with the target array as one of its arguments.
 *
 * Legacy helper: does **not** require mutation. Prefer `findAugmentingIIFE` when the
 * `augmented_` modifier (rotate) must be proven.
 *
 * @param {ASTNode[]} references - Parent nodes of identifier references to the array.
 * @param {string} targetArrayName - The name of the array variable.
 * @returns {ASTNode|null} The IIFE CallExpression if found, otherwise null.
 */
function arrayIsProvidedAsArgumentToIIFE(references, targetArrayName) {
  return references.find(n =>
    n.type === 'CallExpression' &&
		n.callee.type === 'FunctionExpression' &&
		n.arguments.some(arg => arg.name === targetArrayName)) || null;
}

/**
 * Resolves a MemberExpression property to a string name for both `obj.prop` and `obj['prop']`.
 *
 * @param {ASTNode} node - Candidate MemberExpression.
 * @returns {string|null} Property name, or null if not resolvable statically.
 */
function getMemberPropertyName(node) {
  if (node?.type !== 'MemberExpression') return null;
  if (node.property?.type === 'Identifier' && !node.computed) return node.property.name;
  if (node.property?.type === 'Literal') return String(node.property.value);
  return null;
}

/**
 * True for rotate mutations of the form `arr.push(arr.shift())` / `arr.unshift(arr.pop())`
 * (dot or computed property names).
 *
 * @param {ASTNode} node - Candidate CallExpression.
 * @returns {boolean}
 */
function isArrayRotateMutationCall(node) {
  if (node?.type !== 'CallExpression') return false;
  const method = getMemberPropertyName(node.callee);
  if (!['push', 'unshift'].includes(method)) return false;
  const arg = node.arguments?.[0];
  if (arg?.type !== 'CallExpression') return false;
  const nested = getMemberPropertyName(arg.callee);
  return ['shift', 'pop'].includes(nested);
}

/**
 * Walks an AST subtree looking for `parseInt(...)` applied to a MemberExpression or
 * CallExpression argument (checksum stop used by javascript-obfuscator rotates).
 *
 * @param {ASTNode} node - Subtree root.
 * @returns {boolean}
 */
function nodeContainsParseIntOfMember(node) {
  if (!node) return false;
  if (node.type === 'CallExpression' &&
		((node.callee.type === 'Identifier' && node.callee.name === 'parseInt') ||
			(getMemberPropertyName(node.callee) === 'parseInt')) &&
		node.arguments?.some(arg => arg.type === 'MemberExpression' ||
			(arg.type === 'CallExpression'))) {
    return true;
  }
  for (const key of Object.keys(node)) {
    if (key === 'parentNode' || key === 'scope' || key === 'references' || key === 'childNodes' || key === 'typeMap') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      if (value.some(child => child && typeof child === 'object' && child.type && nodeContainsParseIntOfMember(child))) {
        return true;
      }
    } else if (value && typeof value === 'object' && value.type && nodeContainsParseIntOfMember(value)) {
      return true;
    }
  }
  return false;
}

/**
 * True when a function body rotates an array argument via push/shift-style mutation
 * **and** has a recognized stop condition.
 *
 * ## Stop conditions (either is enough)
 * 1. **Literal hop count** — numeric literal IIFE argument, `while (--n)`, or a `for`
 *    bound to a second parameter.
 * 2. **Checksum stop** — `while` / `do-while` whose body/test contains `parseInt` of a
 *    member or call (typically `parseInt(arr[0]) + … === expected`).
 *
 * ## Example (literal hop)
 * ```js
 * (function (arr, n) {
 *   for (let i = 0; i < n; i++) arr.push(arr.shift());
 * })(someArray, 3);
 * ```
 *
 * ## Example (checksum)
 * ```js
 * (function (arr) {
 *   while (true) {
 *     if (parseInt(arr[0]) + parseInt(arr[1]) === 42) break;
 *     arr.push(arr.shift());
 *   }
 * })(someArray);
 * ```
 *
 * @param {ASTNode} funcNode - FunctionExpression / ArrowFunctionExpression used as IIFE callee.
 * @returns {boolean}
 */
function functionBodyRotatesAnArgument(funcNode) {
  if (funcNode?.body?.type !== 'BlockStatement' || !funcNode.body.body?.length) return false;

  let foundMutation = false;
  let foundLiteralHop = false;
  let foundChecksumStop = false;

  function walk(node) {
    if (!node || typeof node !== 'object' || !node.type) return;

    if (isArrayRotateMutationCall(node)) foundMutation = true;

    if (node.type === 'WhileStatement' || node.type === 'DoWhileStatement') {
      if (nodeContainsParseIntOfMember(node)) foundChecksumStop = true;
      // Literal-count helper: while (--n) arr.push(arr.shift())
      if (node.test?.type === 'UpdateExpression' &&
				funcNode.params?.some(p => p.type === 'Identifier' && p.name === node.test.argument?.name)) {
        foundLiteralHop = true;
      }
    }

    if (node.type === 'ForStatement' &&
			funcNode.params?.length >= 2 &&
			funcNode.params.some(p => p.type === 'Identifier' &&
				(node.test?.right?.name === p.name ||
					node.test?.left?.name === p.name ||
					node.init?.declarations?.some?.(d => d.init?.name === p.name)))) {
      foundLiteralHop = true;
    }

    for (const key of Object.keys(node)) {
      if (key === 'parentNode' || key === 'scope' || key === 'references' || key === 'childNodes' || key === 'typeMap') continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object' && value.type) walk(value);
    }
  }

  walk(funcNode.body);

  // Literal hop count IIFE: numeric literal argument + push/shift mutation in body.
  const callParent = funcNode.parentNode;
  if (callParent?.type === 'CallExpression' &&
		callParent.callee === funcNode &&
		callParent.arguments?.some(arg => arg.type === 'Literal' && typeof arg.value === 'number') &&
		foundMutation) {
    foundLiteralHop = true;
  }

  return foundMutation && (foundLiteralHop || foundChecksumStop);
}

/**
 * Finds an IIFE that takes `targetName` as an argument and rotates/mutates an array.
 *
 * @param {ASTNode[]} references - Parent nodes of identifier references.
 * @param {string} targetName - Array or factory binding passed into the IIFE.
 * @returns {ASTNode|null} Matching CallExpression, or null.
 */
function findAugmentingIIFE(references, targetName) {
  return references.find(n =>
    n.type === 'CallExpression' &&
		(n.callee.type === 'FunctionExpression' || n.callee.type === 'ArrowFunctionExpression') &&
		n.arguments.some(arg => arg.name === targetName) &&
		functionBodyRotatesAnArgument(n.callee)) || null;
}

/**
 * Checks if the minimum required references to the target function were found.
 *
 * Counts as relevant:
 * - CallExpressions with only Literal arguments where the identifier is the callee;
 * - AssignmentExpression right-hand aliases;
 * - VariableDeclarator inits (then follows the alias's references).
 *
 * @param {ASTNode} reference - A reference node to the array, used to locate the decoder scope.
 * @param {ASTNode[]} flatTree - The flattened AST.
 * @returns {boolean} True if the function has enough relevant references.
 */
function functionHasMinimumRequiredReferences(reference, flatTree) {
  const funcRef = reference.scope.block;
  const funcRefs = funcRef?.id?.references || funcRef?.parentNode?.id?.references;
  if (funcRefs?.length) {
    // References can be call expressions or right side of assignment expressions if proxied.
    let relevantRefs = funcRefs.filter(n =>
      (n.parentNode.type === 'CallExpression' &&
				n.parentNode.arguments.length &&
				n.parentKey === 'callee' &&
				!n.parentNode.arguments.some(a => a.type !== 'Literal')) ||
			(n.parentNode.type === 'AssignmentExpression' && n.parentKey === 'right') ||
			(n.parentNode.type === 'VariableDeclarator' && n.parentKey === 'init'));
    if (relevantRefs.length && relevantRefs[0].parentNode.type === 'VariableDeclarator') {
      relevantRefs = relevantRefs.map(r => r.parentNode.id.references).flat();
    }
    return relevantRefs.length / (flatTree.length || 1) * 100 >= minMeaningfulPercentageOfReferences;
  }
  return false;
}

/**
 * Memoized string-array factory used by javascript-obfuscator:
 * allocates a string array, reassigns itself to a function that returns that array,
 * then returns a call to itself.
 *
 * ## Example
 * ```js
 * function f() {
 *   const a = ['x', 'y', 'z', 'hello', 'world'];
 *   f = function () { return a; };
 *   return f();
 * }
 * ```
 *
 * @param {ASTNode} funcNode - FunctionDeclaration or FunctionExpression.
 * @returns {boolean}
 */
function isMemoizedStringArrayFactory(funcNode) {
  if (!funcNode || (funcNode.type !== 'FunctionDeclaration' && funcNode.type !== 'FunctionExpression')) return false;
  const funcName = funcNode.id?.name || funcNode.parentNode?.id?.name;
  if (!funcName || funcNode.body?.type !== 'BlockStatement') return false;

  const statements = funcNode.body.body;
  const arrayDecl = statements.find(s =>
    s.type === 'VariableDeclaration' &&
		s.declarations.some(d =>
		  isStringLiteralArrayExpression(d.init) &&
			d.init.elements.length >= minMemoizedFactoryArrayLength));
  if (!arrayDecl) return false;

  const arrayName = arrayDecl.declarations.find(d => isStringLiteralArrayExpression(d.init))?.id?.name;
  if (!arrayName) return false;

  const selfAssign = statements.find(s =>
    s.type === 'ExpressionStatement' &&
		s.expression?.type === 'AssignmentExpression' &&
		s.expression.left?.name === funcName &&
		(s.expression.right?.type === 'FunctionExpression' || s.expression.right?.type === 'ArrowFunctionExpression') &&
		(s.expression.right.body?.type === 'BlockStatement'
		  ? s.expression.right.body.body.some(st =>
		    st.type === 'ReturnStatement' && st.argument?.name === arrayName)
		  : s.expression.right.body?.name === arrayName));
  if (!selfAssign) return false;

  const returnsSelfCall = statements.some(s =>
    s.type === 'ReturnStatement' &&
		s.argument?.type === 'CallExpression' &&
		s.argument.callee?.name === funcName);
  return !!returnsSelfCall;
}

/**
 * Returns the first memoized string-array factory in the program, if any.
 *
 * @param {ASTNode[]} flatTree - The flattened AST.
 * @returns {ASTNode|null}
 */
function findMemoizedStringArrayFactory(flatTree) {
  const funcs = [
    ...(flatTree[0].typeMap.FunctionDeclaration || []),
    ...(flatTree[0].typeMap.FunctionExpression || []),
  ];
  return funcs.find(isMemoizedStringArrayFactory) || null;
}

/**
 * True when a call argument is a permitted proxy remapping:
 * a parameter name, a literal, `param ± n`, or a unary `-literal`.
 *
 * @param {ASTNode} arg - CallExpression argument.
 * @param {Set<string>} paramNames - Parameter names of the wrapper function.
 * @returns {boolean}
 */
function isParamPermutationArg(arg, paramNames) {
  if (!arg) return false;
  if (arg.type === 'Identifier' && paramNames.has(arg.name)) return true;
  if (arg.type === 'Literal') return true;
  if (arg.type === 'BinaryExpression' &&
		['+', '-'].includes(arg.operator) &&
		((arg.left.type === 'Identifier' && paramNames.has(arg.left.name) && arg.right.type === 'Literal') ||
			(arg.right.type === 'Identifier' && paramNames.has(arg.right.name) && arg.left.type === 'Literal'))) {
    return true;
  }
  if (arg.type === 'UnaryExpression' && arg.operator === '-' && arg.argument?.type === 'Literal') return true;
  return false;
}

/**
 * Describes a single-return proxy wrapper, or null if the function is not one.
 *
 * Requirements:
 * - Body is a single `return call(...)` (or concise arrow call).
 * - Callee is an Identifier (another wrapper or the decoder).
 * - Arguments are a permutation of params (see `isParamPermutationArg`).
 * - **Rejected:** pure 1:1 same-name passthrough (`return dec(a, b)` with params `(a, b)`).
 *
 * ## Example (accepted)
 * ```js
 * function w1(a, b, c) { return dec(b - 4, c); }
 * function w2(x, y) { return w1(0, x, y); }
 * ```
 *
 * ## Example (rejected)
 * ```js
 * function wrap(i, k) { return dec(i, k); }
 * ```
 *
 * @param {ASTNode} funcNode - Function-like AST node.
 * @returns {{calleeName: string, paramNames: string[]}|null}
 */
function getProxyWrapperInfo(funcNode) {
  if (!funcNode || !['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(funcNode.type)) {
    return null;
  }
  const body = funcNode.body?.type === 'BlockStatement' ? funcNode.body.body : null;
  let returnArg;
  if (body) {
    if (body.length !== 1 || body[0].type !== 'ReturnStatement') return null;
    returnArg = body[0].argument;
  } else {
    returnArg = funcNode.body;
  }
  if (returnArg?.type !== 'CallExpression' || returnArg.callee?.type !== 'Identifier') return null;

  const params = (funcNode.params || []).filter(p => p.type === 'Identifier').map(p => p.name);
  const paramNames = new Set(params);
  if (!returnArg.arguments?.length || returnArg.arguments.some(arg => !isParamPermutationArg(arg, paramNames))) {
    return null;
  }

  // Reject pure 1:1 same-name passthrough: return dec(a, b) with params (a, b).
  const isOneToOnePassthrough =
		returnArg.arguments.length === params.length &&
		returnArg.arguments.every((arg, idx) => arg.type === 'Identifier' && arg.name === params[idx]);
  if (isOneToOnePassthrough) return null;

  return {calleeName: returnArg.callee.name, paramNames: params};
}

/**
 * True when the program contains a cluster of single-return wrappers hopping toward
 * a decoder or another wrapper (≥1 wrapper that calls another wrapper, or ≥2 wrappers).
 *
 * @param {ASTNode[]} flatTree - The flattened AST.
 * @returns {boolean}
 */
function hasProxiedWrapperCluster(flatTree) {
  const funcs = [
    ...(flatTree[0].typeMap.FunctionDeclaration || []),
    ...(flatTree[0].typeMap.FunctionExpression || []),
  ];
  const wrappers = [];
  for (const func of funcs) {
    const info = getProxyWrapperInfo(func);
    if (info) wrappers.push({func, ...info});
  }
  if (wrappers.length < 1) return false;

  const wrapperNames = new Set(
    wrappers.map(w => w.func.id?.name || w.func.parentNode?.id?.name).filter(Boolean),
  );

  // At least one hop that targets another wrapper or leaves a non-passthrough remap chain.
  return wrappers.some(w => wrapperNames.has(w.calleeName)) || wrappers.length >= 2;
}

/**
 * True for javascript-obfuscator CFF storage objects:
 * majority of keys are 5-letter identifiers; majority of values are single-return
 * shells and/or literals.
 *
 * @param {ASTNode} objectExpression - ObjectExpression node.
 * @returns {boolean}
 *
 * @example
 * // true
 * ({ AbCde: (x, y) => x === y, FgHij: (x, y) => x + y, KlMno: 'ok' })
 * // false
 * ({ add: (a, b) => a + b })
 */
function isCffStorageObject(objectExpression) {
  const props = objectExpression?.properties?.filter(p => p.type === 'Property') || [];
  if (!props.length) return false;

  const fiveLetterKeys = props.filter(p => {
    const key = p.key?.type === 'Identifier' ? p.key.name
      : p.key?.type === 'Literal' ? String(p.key.value) : '';
    return fiveLetterKey.test(key);
  });
  if (fiveLetterKeys.length / props.length <= 0.5) return false;

  const shellOrLiteral = props.filter(p => {
    const value = p.value;
    if (!value) return false;
    if (value.type === 'Literal') return true;
    if (['FunctionExpression', 'ArrowFunctionExpression'].includes(value.type)) {
      if (value.body?.type === 'BlockStatement') {
        return value.body.body.length === 1 && value.body.body[0].type === 'ReturnStatement';
      }
      return true; // concise arrow
    }
    return false;
  });
  return shellOrLiteral.length / props.length > 0.5;
}

/**
 * True for `'0|1|2'.split('|')` where the string matches {@link pipeSequenceLiteral}.
 *
 * @param {ASTNode} node - Candidate CallExpression.
 * @returns {boolean}
 */
function isPipeSplitSequenceCall(node) {
  return node?.type === 'CallExpression' &&
		getMemberPropertyName(node.callee) === 'split' &&
		node.arguments?.[0]?.type === 'Literal' &&
		node.arguments[0].value === '|' &&
		node.callee?.object?.type === 'Literal' &&
		pipeSequenceLiteral.test(String(node.callee.object.value));
}

/**
 * True for an array used as a numeric order sequence (`[0,1,2]` or `['0','1','2']`).
 *
 * @param {ASTNode} node - Candidate ArrayExpression.
 * @returns {boolean}
 */
function isNumericSequenceArray(node) {
  if (node?.type !== 'ArrayExpression' || !node.elements?.length) return false;
  return node.elements.every(el =>
    el?.type === 'Literal' &&
		(typeof el.value === 'number' || (typeof el.value === 'string' && /^\d+$/.test(el.value))));
}

export {
  arrayHasMinimumRequiredReferences,
  arrayIsProvidedAsArgumentToIIFE,
  findArrayDeclarationCandidates,
  findAugmentingIIFE,
  findMemoizedStringArrayFactory,
  functionBodyRotatesAnArgument,
  functionHasMinimumRequiredReferences,
  getProxyWrapperInfo,
  hasProxiedWrapperCluster,
  isCffStorageObject,
  isMemoizedStringArrayFactory,
  isNumericSequenceArray,
  isPipeSplitSequenceCall,
  isStringLiteralArrayExpression,
  minMemoizedFactoryArrayLength,
};
