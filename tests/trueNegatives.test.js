import assert from 'node:assert';
import {describe, it} from 'node:test';
import {detectObfuscation, detectObfuscationReduced} from '../src/index.js';

describe('True-negative fixtures', () => {
  it('does not flag ordinary helper objects as cff_storage_object', () => {
    const code = `
      const helpers = {
        add: (a, b) => a + b,
        mul: (a, b) => a * b,
      };
      console.log(helpers.add(1, 2));
    `;
    assert.ok(!detectObfuscation(code).includes('cff_storage_object'));
  });

  it('does not flag multi-statement 5-letter-key objects as cff_storage_object', () => {
    const code = `
      const sto = {
        AbCde: function (x, y) {
          document.body.appendChild(x);
          return y;
        },
        FgHij: function (x, y) {
          window.location = x;
          return y;
        },
      };
    `;
    assert.ok(!detectObfuscation(code).includes('cff_storage_object'));
  });

  it('does not flag plain switches as sequenced_index_switch', () => {
    const code = `
      function run(x) {
        switch (x) {
          case 0: return 'a';
          case 1: return 'b';
        }
      }
    `;
    assert.ok(!detectObfuscation(code).includes('sequenced_index_switch'));
  });

  it('does not flag 1:1 passthrough wrappers as proxied alone', () => {
    const code = `
      var table = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p'];
      function dec(i, k) { return table[i]; }
      function wrap(i, k) { return dec(i, k); }
      console.log(wrap(0,1), wrap(1,1), wrap(2,1), wrap(3,1), wrap(4,1), wrap(5,1));
    `;
    assert.ok(!detectObfuscation(code).includes('proxied_array_function_replacements'));
  });

  it('does not flag while+push/shift without parse/compare or hop count as augmented', () => {
    const code = `
      var arr = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t'];
      (function (target) {
        while (true) {
          target.push(target.shift());
          break;
        }
      })(arr);
      console.log(arr[0], arr[1], arr[2], arr[3], arr[4], arr[5], arr[6], arr[7]);
    `;
    const hits = detectObfuscation(code);
    assert.ok(!hits.includes('augmented_array_replacements'));
  });

  it('does not flag ordinary while (i < n) as js_confuser_state_machine', () => {
    const code = `
      var i = 0;
      while (i < 3) {
        switch (i) {
          case 0: i++; break;
          case 1: i++; break;
          default: i++; break;
        }
      }
    `;
    assert.ok(!detectObfuscation(code).includes('js_confuser_state_machine'));
  });

  it('does not flag one-element memoized cache as function_to_array_replacements', () => {
    const code = `
      function f() {
        const a = ['only'];
        f = function () { return a; };
        return f();
      }
      console.log(f()[0]);
    `;
    assert.ok(!detectObfuscation(code).includes('function_to_array_replacements'));
  });

  it('reduced mode keeps unaugmented base suppressed by checksum-augmented compound', () => {
    assert.deepStrictEqual(
      detectObfuscationReduced(`
        var arr = [
          '11','31','hello','world','foo','bar','baz','qux',
          'alpha','bravo','charlie','delta','echo','foxtrot',
          'golf','hotel','india','juliet','kilo','lima',
          'mike','november','oscar','papa','quebec','romeo',
        ];
        (function (target) {
          while (true) {
            if (parseInt(target[0]) + parseInt(target[1]) === 42) break;
            target.push(target.shift());
          }
        })(arr);
        console.log(arr[2], arr[3], arr[4], arr[5], arr[6], arr[7], arr[8], arr[9]);
        console.log(arr[10], arr[11], arr[12], arr[13], arr[14], arr[15], arr[16]);
      `),
      ['augmented_array_replacements'],
    );
  });
});
