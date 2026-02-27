/**
 * Main entry point for obfuscation detection.
 * Exports the detectObfuscation function.
 * @module obfuscation-detector
 */

import {generateFlatAST, logger} from 'flast';
import * as detectors from './detectors/index.js';

/**
 * Detects obfuscation types in JavaScript code by analyzing its AST.
 *
 * @param {ASTNode[]} tree - Existing AST tree from generateFlatAST to analyze.
 * @param {boolean} [stopAfterFirst=true] - If true, returns after the first positive detection; if false, returns all matches.
 * @returns {string[]} An array of detected obfuscation type names. Returns an empty array if no known type is detected.
 */
function detectObfuscationFlatAST(tree, stopAfterFirst = true) {
	const detectedObfuscations = [];
	try {
		for (const detectorName of Object.keys(detectors)) {
			try {
				const detectionType = detectors[detectorName](tree, detectedObfuscations);
				if (detectionType) {
					detectedObfuscations.push(detectionType);
					if (stopAfterFirst) break;
				}
			} catch (e) {
				logger.debug(`Error while running ${detectorName}: ${e.message}`);	// Keep for debugging
			}
		}
	} catch (e) {
		logger.debug(e.message);	// Keep for debugging
	}
	return detectedObfuscations;
}


/**
 * Detects obfuscation types in JavaScript code by analyzing its AST.
 *
 * @param {string} code - The JavaScript source code to analyze.
 * @param {boolean} [stopAfterFirst=true] - If true, returns after the first positive detection; if false, returns all matches.
 * @returns {string[]} An array of detected obfuscation type names. Returns an empty array if no known type is detected.
 */
function detectObfuscation(code, stopAfterFirst = true) {
	let tree;
	try {
		tree = generateFlatAST(code);
	} catch (e) {
		logger.debug(e.message);	// Keep for debugging
	}
	return detectObfuscationFlatAST(tree, stopAfterFirst);
}

export {detectObfuscation, detectObfuscationFlatAST};