// Local ESLint plugin — enforces data-testid on interactive elements in Astro templates.
// Imported directly in eslint.config.js (no npm publish needed).

function attrName(a) {
  if (a.type === 'JSXSpreadAttribute') return null;
  if (!a.name) return null;
  if (a.name.type === 'JSXIdentifier') return a.name.name;
  if (a.name.type === 'JSXNamespacedName') {
    return `${a.name.namespace.name}:${a.name.name.name}`;
  }
  return null;
}

function checkRole(attrs, roleSet) {
  const roleAttr = attrs.find(a => attrName(a) === 'role');
  if (!roleAttr) return false;
  const val = roleAttr.value;
  if (!val) return false;
  if (val.type === 'Literal') return roleSet.has(val.value);
  if (val.type === 'JSXExpressionContainer' && val.expression?.type === 'Literal') {
    return roleSet.has(val.expression.value);
  }
  return false;
}

export default {
  rules: {
    'require-testid': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          missing: 'Interactive element <{{tag}}> is missing a data-testid attribute. Add data-testid or spread testId(), or add data-test-ignore to opt out.',
        },
      },
      create(context) {
        const INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'select', 'textarea', 'form']);
        const INTERACTIVE_ROLES = new Set(['button', 'link', 'checkbox', 'radio', 'tab', 'switch', 'dialog']);
        const EVENT_ATTRS = new Set(['onClick', 'onChange', 'onInput', 'onSubmit', 'onKeyDown', 'onKeyUp']);

        return {
          JSXOpeningElement(node) {
            const nameNode = node.name;
            if (!nameNode) return;

            const tag =
              nameNode.type === 'JSXIdentifier' ? nameNode.name : null;

            if (!tag) return;

            const attrs = node.attributes;

            // Escape hatch: data-test-ignore skips the check
            if (attrs.some(a => attrName(a) === 'data-test-ignore')) return;

            const interactive =
              INTERACTIVE_TAGS.has(tag) ||
              checkRole(attrs, INTERACTIVE_ROLES) ||
              attrs.some(a => EVENT_ATTRS.has(attrName(a) ?? ''));

            if (!interactive) return;

            const hasId = attrs.some(a =>
              a.type === 'JSXSpreadAttribute' ||
              attrName(a) === 'data-testid' ||
              attrName(a) === 'testid'
            );

            if (!hasId) {
              context.report({ node, messageId: 'missing', data: { tag } });
            }
          },
        };
      },
    },
  },
};
