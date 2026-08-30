// TP: CFF storage object with 5-letter keys
const sto = {
	AbCde: function (x, y) {
		return x === y;
	},
	FgHij: function (x, y) {
		return x + y;
	},
	KlMno: function (x, y) {
		return x * y;
	},
	PqRst: function (x) {
		return !x;
	},
	UvWxy: 'ok',
	ZaBcd: 1,
};

console.log(sto.AbCde(1, 1), sto.FgHij(2, 3), sto.KlMno(3, 4), sto.PqRst(0), sto.UvWxy, sto.ZaBcd);
