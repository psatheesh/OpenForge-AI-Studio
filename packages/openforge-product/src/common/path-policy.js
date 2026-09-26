'use strict';
/** Pure workspace path policy: never allow an agent to write outside the active root. */
function safeRelativePath(value) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('A relative file path is required.');
    const normalized = value.replace(/\\/g, '/').trim();
    if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized) || normalized.includes('\0')) {
        throw new Error('Absolute paths and null bytes are forbidden.');
    }
    const segments = normalized.split('/');
    if (segments.some(part => part === '..' || part === '.' || !part)) {
        throw new Error('Path traversal or empty path component.');
    }
    if (segments.some(part => part === '.git') || normalized.startsWith('.theia/')) {
        throw new Error('Writing Git metadata or Theia settings is not available through this tool.');
    }
    return segments.join('/');
}
function normalizeProjectName(value) {
    if (typeof value !== 'string') throw new Error('Project name must be text.');
    const original = value.trim();
    if (!original || original.includes('/') || original.includes('\\') || original === '.' || original === '..') {
        throw new Error('Project name must be a single folder name.');
    }
    const name = original.replace(/\s+/g, '-').replace(/[^\w.-]/g, '-');
    if (!name || name === '.' || name === '..') throw new Error('Enter a valid project name.');
    return safeRelativePath(name);
}
module.exports = {safeRelativePath, normalizeProjectName};
