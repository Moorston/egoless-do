const { RuleTester } = require('eslint');
const rule = require('../no-raw-number-in-text');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

ruleTester.run('no-raw-number-in-text', rule, {
  valid: [
    // String() wrapped
    { code: 'const x = <Text>{String(count)}</Text>;' },
    // template literal
    { code: 'const x = <Text>{`${count} items`}</Text>;' },
    // i18n T()
    { code: "const x = <Text>{T('foo')}</Text>;" },
    // string literal
    { code: "const x = <Text>{'hello'}</Text>;" },
    // conditional returning JSX
    { code: 'const x = <Text>{cond ? <Text>a</Text> : null}</Text>;' },
    // nested Text with string content
    { code: 'const x = <Text><Text>{name}</Text></Text>;' },
    // string concat with template
    { code: "const x = <Text>{`${a} + ${b}`}</Text>;" },
    // empty fragment
    { code: 'const x = <Text><></></Text>;' },
    // string identifier (cannot know type — allow)
    { code: 'const x = <Text>{name}</Text>;' },
    // string concat with literal
    { code: "const x = <Text>{'prefix' + name}</Text>;" },
    { code: "const x = <Text>{name + 'suffix'}</Text>;" },
    // conditional with string branches
    { code: "const x = <Text>{cond ? 'a' : 'b'}</Text>;" },
  ],
  invalid: [
    // arithmetic
    {
      code: 'const x = <Text>{count + total}</Text>;',
      errors: [{ messageId: 'rawNumber' }],
    },
    // subtraction
    {
      code: 'const x = <Text>{a - b}</Text>;',
      errors: [{ messageId: 'rawNumber' }],
    },
    // .length
    {
      code: 'const x = <Text>{items.length}</Text>;',
      errors: [{ messageId: 'rawNumber' }],
    },
    // Math.round
    {
      code: 'const x = <Text>{Math.round(x)}</Text>;',
      errors: [{ messageId: 'rawNumber' }],
    },
    // conditional with numeric branches
    {
      code: 'const x = <Text>{cond ? items.length : 0}</Text>;',
      errors: [{ messageId: 'rawNumber' }],
    },
    // .reduce
    {
      code: 'const x = <Text>{list.reduce((s, e) => s + e, 0)}</Text>;',
      errors: [{ messageId: 'rawNumber' }],
    },
    // numeric property
    {
      code: 'const x = <Text>{stats.total}</Text>;',
      errors: [{ messageId: 'rawNumber' }],
    },
  ],
});

console.log('no-raw-number-in-text rule tests passed');
