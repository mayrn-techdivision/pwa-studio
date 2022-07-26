// eslint-disable-next-line node/no-unpublished-require
const rootPkg = require('../../package.json');
const rootModules = Object.keys(rootPkg.devDependencies).concat(
    rootPkg.dependencies ? Object.keys(rootPkg.dependencies) : []
);
const uniqueRootModules = [...new Set(rootModules)];

const config = {
    parser: 'babel-eslint',
    extends: ['@magento'],
    plugins: ['babel', 'node'],
    settings: {
        node: {
            allowModules: uniqueRootModules
        }
    },
    rules: {
        'no-prototype-builtins': 'off',
        'no-undef': 'off',
        'no-useless-escape': 'off',
        "react/jsx-filename-extension": [1, { "allow": "as-needed" }]
    },
    overrides: [
        {
            files: ['*.{ts,tsx}'],
            parser: '@typescript-eslint/parser',
            plugins: ['@typescript-eslint'],
            extends: ['plugin:@typescript-eslint/recommended'],
            rules: {
                '@typescript-eslint/ban-ts-comment': 'off',
                '@typescript-eslint/no-unused-vars': [
                    'error',
                    { ignoreRestSiblings: true }
                ]
            }
        }
    ]
};

module.exports = config;
