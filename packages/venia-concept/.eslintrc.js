const config = {
    parser: 'babel-eslint',
    extends: ['@magento'],
    rules: {
        "react/jsx-filename-extension": [1, { "allow": "as-needed" }],
        'no-prototype-builtins': 'off',
        'no-undef': 'off',
        'no-useless-escape': 'off'
    }
};

module.exports = config;
