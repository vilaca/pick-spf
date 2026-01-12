import js from '@eslint/js';
import compat from 'eslint-plugin-compat';

export default [
    // Apply to all JavaScript files
    {
        files: ['*.js', 'sub-modules/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                localStorage: 'readonly',
                location: 'readonly',
                history: 'readonly',
                navigator: 'readonly',
                URLSearchParams: 'readonly',
                Event: 'readonly',
                CustomEvent: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                fetch: 'readonly',
                URL: 'readonly',
                // Library globals
                jsyaml: 'readonly',
                // Test environment check
                process: 'readonly'
            }
        },
        plugins: {
            compat
        },
        rules: {
            ...js.configs.recommended.rules,
            'compat/compat': 'error'
        }
    },
    // Ignore patterns
    {
        ignores: [
            'node_modules/**',
            'tests/**',
            'lib/**',
            '*.min.js',
            'validate-data.js'
        ]
    }
];
