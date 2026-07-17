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
          return true;
        case 'TaggedTemplateExpression':
          return true;
        case 'CallExpression': {
          const callee = node.callee;
          // String(...)
          if (callee.type === 'Identifier' && callee.name === 'String') return true;
          // T('...') / t('...') i18n
          if (
            callee.type === 'Identifier' &&
            (callee.name === 'T' || callee.name === 't')
          ) {
            return true;
          }
          return false;
        }
        case 'ConditionalExpression':
          return (
            isStringExpression(node.consequent) &&
            isStringExpression(node.alternate)
          );
        case 'LogicalExpression':
          return (
            isStringExpression(node.left) && isStringExpression(node.right)
          );
        case 'JSXElement':
        case 'JSXFragment':
          return true;
        default:
          return false;
      }
    }

    /** Heuristic: does the expression look numeric via AST shape */
    function looksNumericByShape(node) {
      if (!node) return false;
      switch (node.type) {
        case 'Literal':
          return typeof node.value === 'number';
        case 'MemberExpression': {
          const prop = node.property;
          if (prop.type !== 'Identifier') return false;
          // .length / .size / .count — always numeric
          if (/\b(length|size|count)\b/.test(prop.name)) return true;
          // numeric-sounding property names
          if (
            /\b(total|completed|reduced|duration|calories|minutes|seconds|hours|days|weeks|months|value|amount|price|km|ml|kg|reps|sets|streak|progress|percent|rate|average|avg|sum|kcal|kcalGoal|calGoal|waterGoal)\b/i.test(prop.name)
          ) {
            return true;
          }
          return false;
        }
        case 'CallExpression': {
          const callee = node.callee;
          // Math.round / Math.floor / Math.ceil / Math.max / Math.min / Math.abs
          if (
            callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.object.name === 'Math'
          ) {
            return true;
          }
          if (callee.type === 'Identifier' && callee.name === 'Number') return true;
          if (callee.type === 'Identifier' && callee.name === 'parseInt') return true;
          if (callee.type === 'Identifier' && callee.name === 'parseFloat') return true;
          // .reduce(...) — numeric accumulator pattern
          if (
            callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'reduce'
          ) {
            return true;
          }
          return false;
        }
        case 'BinaryExpression':
          // arithmetic — always numeric
          if (['+', '-', '*', '/', '%', '**'].includes(node.operator)) {
            // For +, if either side is clearly a string literal/template/T(), treat as string concat
            if (node.operator === '+') {
              if (isStringExpression(node.left) || isStringExpression(node.right)) return false;
            }
            return true;
          }
          return false;
        case 'UnaryExpression':
          return true;
        case 'ConditionalExpression':
          // Flag when branches are numeric (cond ? len : 0), or when test is an
          // arithmetic/binary expression (count > 0 ? 'yes' : 'no').
          return (
            looksNumericByShape(node.consequent) ||
            looksNumericByShape(node.alternate) ||
            looksNumericByShape(node.test)
          );
        case 'LogicalExpression':
          return (
            looksNumericByShape(node.left) || looksNumericByShape(node.right)
          );
        default:
          return false;
      }
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
