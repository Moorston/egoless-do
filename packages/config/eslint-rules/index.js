/**
 * Custom ESLint plugin: local
 *
 * Rules:
 *  - no-raw-number-in-text: flag <Text>{number}</Text>-style expressions that
 *    will trigger iOS "Text strings must be rendered within a <Text>" warnings.
 */
module.exports = {
  rules: {
    'no-raw-number-in-text': require('./no-raw-number-in-text'),
  },
};
