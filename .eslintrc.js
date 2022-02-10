const path = require('path');

module.exports = {
    env: {
        browser: true,
    },
    extends: ['@herp-inc', 'prettier'],
    parserOptions: {
        project: path.join(__dirname, 'tsconfig.json'),
    },
};
