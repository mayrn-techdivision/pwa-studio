import path from 'path';
import debug from 'debug';
import { fileURLToPath } from 'url';
import pkg from '../../package.json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(__dirname, '../');
const toolName = pkg.name.split('/').pop();
const makeTag = (...parts) => parts.join(':');

const taggedLogger = tag => {
    const logger = debug(tag);
    logger.errorMsg = msg => `[${tag}] ${msg}`;
    logger.sub = sub => taggedLogger(makeTag(tag, sub));
    return logger;
};

export function makeFileLogger(p) {
    const segments = path.relative(root, p).split(path.sep);
    if (segments[segments.length - 1] === 'index.js') {
        segments.pop();
    }
    const tag = makeTag(toolName, ...segments);
    return taggedLogger(tag);
}
