/**
 * Rule: no-raw-number-in-text
 *
 * Flags <Text> elements whose direct children are numeric expressions that
 * iOS (Hermes release) will reject with:
 *   "Text strings must be rendered within a <Text> component"
 *
 * Safe patterns (allowed):
 *   - String(...)
 *   - template literals: `...`
 *   - T('...') i18n calls
 *   - string literals: 'foo', "foo"
 *   - conditional returning JSX or null
 *
 * Unsafe patterns (flagged):
 *   - <Text>{count}</Text>
 *   - <Text>{a.length}</Text>
 *   - <Text>{Math.round(x)}</Text>
 *   - <Text>{a + b}</Text>
 *   - <Text>{cond ? x : y}</Text>  (when x/y are numeric)
 */
/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow raw numeric expressions as direct children of <Text>',
      recommended: true,
    },
    schema: [],
    messages: {
      rawNumber:
        'Raw numeric expression {{expr}} used as <Text> child. Wrap with String(...) or use a template literal.',
    },
  },
  create(context) {
    const sourceCode = context.getSourceCode();

    /** Check if a node is clearly a string expression */
    function isStringExpression(node) {
      if (!node) return false;
      switch (node.type) {
        case 'Literal':
          return typeof node.value === 'string';
        case 'TemplateLiteral':
        case 'TaggedTemplateExpression':
          return true;
        case 'CallExpression':
          return isStringCall(node);
        case 'ConditionalExpression':
          return isStringExpression(node.consequent) && isStringExpression(node.alternate);
        case 'LogicalExpression':
          return isStringExpression(node.left) && isStringExpression(node.right);
        case 'JSXElement':
        case 'JSXFragment':
          return true;
        default:
          return false;
      }
    }

    /** Check if a call expression produces a string */
    function isStringCall(node) {
      const callee = node.callee;
      if (callee.type !== 'Identifier') return false;
      // String(...) or T('...') / t('...')
      return callee.name === 'String' || callee.name === 'T' || callee.name === 't';
    }

    /** Heuristic: does the expression look numeric via AST shape */
    function looksNumericByShape(node) {
      if (!node) return false;
      switch (node.type) {
        case 'Literal':
          return typeof node.value === 'number';
        case 'MemberExpression':
          return isNumericMember(node);
        case 'CallExpression':
          return isNumericCall(node);
        case 'BinaryExpression':
          return isNumericBinary(node);
        case 'UnaryExpression':
          return ['-', '+', '~'].includes(node.operator);
        case 'ConditionalExpression':
          return isNumericConditional(node);
        case 'LogicalExpression':
          return looksNumericByShape(node.left) || looksNumericByShape(node.right);
        default:
          return false;
      }
    }

    /** Check if a member expression is numeric (.length, .count, .total, etc.) */
    function isNumericMember(node) {
      const prop = node.property;
      if (prop.type !== 'Identifier') return false;
      if (/\b(length|size|count)\b/.test(prop.name)) return true;
      // numeric-sounding property names
      const NUMERIC_PROPS = /\b(total|completed|reduced|duration|calories|minutes|seconds|hours|days|weeks|months|value|amount|price|km|ml|kg|reps|sets|streak|progress|percent|rate|average|avg|sum|kcal|kcalGoal|calGoal|waterGoal)\b/i;
      return NUMERIC_PROPS.test(prop.name);
    }

    /** Check if a call expression is numeric (Math.*, Number, parseInt, .reduce) */
    function isNumericCall(node) {
      const callee = node.callee;
      if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && callee.object.name === 'Math') return true;
      if (callee.type === 'Identifier' && ['Number', 'parseInt', 'parseFloat'].includes(callee.name)) return true;
      // .reduce(...) — numeric accumulator
      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier' && callee.property.name === 'reduce') return true;
      return false;
    }

    /** Check if a binary expression is arithmetic */
    function isNumericBinary(node) {
      // For +, if either side is a string, treat as string concat
      if (node.operator === '+') {
        if (isStringExpression(node.left) || isStringExpression(node.right)) return false;
      }
      return ['+', '-', '*', '/', '%', '**'].includes(node.operator);
    }

    /** Check if a conditional expression is numeric */
    function isNumericConditional(node) {
      return looksNumericByShape(node.consequent) ||
        looksNumericByShape(node.alternate) ||
        looksNumericByShape(node.test);
    }

    function getJSXElementName(node) {
      if (node.type !== 'JSXElement') return null;
      const name = node.openingElement.name;
      if (name.type === 'JSXIdentifier') return name.name;
      if (name.type === 'JSXMemberExpression') {
        // Text.X -> Text
        const walk = name;
        if (walk.object.type === 'JSXIdentifier') return walk.object.name;
      }
      return null;
    }

    function checkTextElement(node) {
      const name = getJSXElementName(node);
      if (name !== 'Text') return;

      for (const child of node.children) {
        // Recurse into nested <Text> — their numeric children are also flagged
        if (child.type === 'JSXElement') {
          if (getJSXElementName(child) === 'Text') {
            checkTextElement(child);
          }
          continue;
        }
        if (child.type === 'JSXText') continue;
        if (child.type === 'JSXFragment') {
          // empty fragment <></> is fine
          if (child.children.length === 0) continue;
        }
        if (child.type !== 'JSXExpressionContainer') continue;
        const expr = child.expression;
        if (!expr) continue;
        if (expr.type === 'JSXEmptyExpression') continue;

        if (isStringExpression(expr)) continue;
        if (!looksByShape(expr)) continue;

        context.report({
          node: child,
          messageId: 'rawNumber',
          data: { expr: sourceCode.getText(expr) },
        });
      }
    }

    function looksByShape(node) {
      if (isStringExpression(node)) return false;
      return looksNumericByShape(node);
    }

    return {
      JSXElement: checkTextElement,
    };
  },
};
