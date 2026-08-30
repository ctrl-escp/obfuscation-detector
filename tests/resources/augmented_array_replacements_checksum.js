// TP: array replacements + checksum rotate IIFE → augmented_array_replacements
var arr = [
	'11', '31', 'hello', 'world', 'foo', 'bar', 'baz', 'qux',
	'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot',
	'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima',
	'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo',
	'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray',
];

(function (target) {
	while (true) {
		if (parseInt(target[0]) + parseInt(target[1]) === 42) break;
		target.push(target.shift());
	}
})(arr);

console.log(arr[2], arr[3], arr[4], arr[5], arr[6], arr[7], arr[8], arr[9]);
console.log(arr[10], arr[11], arr[12], arr[13], arr[14], arr[15], arr[16]);
console.log(arr[17], arr[18], arr[19], arr[20], arr[21], arr[22], arr[23]);
