'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {safeRelativePath, normalizeProjectName} = require('../src/common/path-policy');

test('accepts nested project-relative paths', () => {
    assert.equal(safeRelativePath('my-app/src/main.ts'), 'my-app/src/main.ts');
    assert.equal(safeRelativePath('my-app\\src\\main.ts'), 'my-app/src/main.ts');
});
test('blocks absolute paths and traversal', () => {
    for (const value of ['../outside', '/etc/passwd', 'C:\\Windows\\win.ini', 'a/../b', './file', 'a//b', 'a/.git/config', '.theia/settings.json', 'a\0b']) {
        assert.throws(() => safeRelativePath(value), undefined, value);
    }
});
test('project-name normalization keeps names safe', () => {
    assert.equal(normalizeProjectName('Fire Calc 2026'), 'Fire-Calc-2026');
    assert.throws(() => normalizeProjectName('../'));
});
