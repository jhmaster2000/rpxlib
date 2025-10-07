import globals from 'globals';
import eslint from '@eslint/js';
import { globalIgnores } from 'eslint/config';

import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    globalIgnores([
        '**/.vscode', '**/dist', '**/*.old.*', 'eslint.config.mjs',
    ]),
    eslint.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
        plugins: {
            unicorn,
        },
        linterOptions: {
            reportUnusedDisableDirectives: 'warn',
        },
        languageOptions: {
            globals: globals.nodeBuiltin,
            ecmaVersion: 2025,
            sourceType: 'module',
            parserOptions: {
                warnOnUnsupportedTypeScriptVersion: false,
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            'prefer-const': 'off',
            'array-callback-return': ['error', { allowImplicit: true }],
            indent: ['error', 4, { SwitchCase: 1 }],
            semi: ['error', 'always'],

            ...pluginRules('unicorn', {
                'escape-case': 'error',
                'number-literal-case': 'error',
                'empty-brace-spaces': 'error',
                'prefer-array-find': 'error',
                'prefer-array-flat': 'error',
                'prefer-array-flat-map': 'error',
                'prefer-array-index-of': 'error',
                'prefer-at': 'error',
                'prefer-negative-index': 'error',
                'prefer-object-from-entries': 'error',
                'prefer-prototype-methods': 'error',
                'prefer-reflect-apply': 'error',
                'prefer-includes': 'error',
                'prefer-regexp-test': 'error',
                'prefer-modern-math-apis': 'error',
                'prefer-native-coercion-functions': 'error',
                'prefer-module': 'error',
                'prefer-logical-operator-over-ternary': 'error',
                'prefer-export-from': 'error',
                'prefer-date-now': 'error',
                'prefer-default-parameters': 'error',
                'prefer-optional-catch-binding': 'warn',
                'prefer-string-starts-ends-with': 'error',
                'prefer-string-trim-start-end': 'error',
                'prefer-string-replace-all': 'error',
                'prefer-string-slice': 'error',
                'prefer-top-level-await': 'error',
                'custom-error-definition': 'error',
                'error-message': 'error',
                'no-array-method-this-argument': 'error',
                'no-object-as-default-parameter': 'error',
                'no-useless-spread': 'error',
                'no-useless-fallback-in-spread': 'error',
                'no-useless-promise-resolve-reject': 'error',
                'no-useless-undefined': 'error',
                'throw-new-error': 'error',
                'prefer-node-protocol': 'error',
            }),

            ...pluginRules('@typescript-eslint', {
                'prefer-string-starts-ends-with': ['error', { allowSingleElementEquality: 'always' }],
                'array-type': 'off',
                'no-deprecated': 'error',
                'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
                'no-unnecessary-condition': ['error', { allowConstantLoopConditions: 'only-allowed-literals' }],
                'use-unknown-in-catch-callback-variable': 'off',
                'no-confusing-void-expression': 'off',
                'prefer-nullish-coalescing': ['error', { ignorePrimitives: true }],
                'no-unnecessary-type-parameters': 'off',
                'no-extraneous-class': ['error', {
                    allowConstructorOnly: true,
                    allowEmpty: true,
                }],
                'no-invalid-void-type': 'off',
                'require-await': 'off',
                'unbound-method': 'off',
                'no-namespace': ['off', {
                    allowDeclarations: true,
                }],
                'no-non-null-assertion': 'off',
                'no-inferrable-types': ['warn', {
                    ignoreParameters: true,
                    ignoreProperties: true,
                }],
                'no-unused-vars': ['off', {
                    vars: 'all',
                    args: 'none',
                    ignoreRestSiblings: false,
                }],
                'no-misused-promises': ['error', {
                    checksVoidReturn: false,
                }],
                'restrict-template-expressions': ['error', {
                    allowNumber: true,
                    allowBoolean: true,
                    allowAny: false,
                    allowNullish: false,
                    allowRegExp: true,
                }],
                'prefer-literal-enum-member': ['warn', { allowBitwiseExpressions: true }],
                // temporary rules
                'prefer-for-of': 'off',
                'consistent-type-assertions': 'off',
                'no-unnecessary-type-conversion': 'off',
                'no-unsafe-enum-comparison': 'off',
                'prefer-return-this-type': 'off',
                'adjacent-overload-signatures': 'off',
                'consistent-indexed-object-style': 'off',
            }),
        },
    },
    {
        files: ['**/*.js'],
        extends: [tseslint.configs.disableTypeChecked],
    },
);

/**
 * @param {string} pluginNamespace
 * @param {tseslint.ConfigWithExtends['rules']} rulesObj */
function pluginRules(pluginNamespace, rulesObj = {}) {
    if (!pluginNamespace) throw new Error("ESLint config: pluginRules() called with no namespace.");

    return Object.fromEntries(
        Object.entries(rulesObj).map(
            ([rule, v]) => [`${pluginNamespace}/${rule}`, v]
        )
    );
}
