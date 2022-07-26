import { Plugin } from 'vite';
import babel from 'vite-plugin-babel';
import { inspect } from 'util';
import { FileResult, Warning } from '../targetables/BabelModifyJSXPlugin/types';

/**
 * Parse metadata sent from Babel plugin and log with Webpack logger.
 * @param {(Array|string)} data - Either a string message, or a 2-item
 * array of a message and a metadata object to inspect and display.
 */
const logWarning = (data: Warning) => {
    if (typeof data === 'string') {
        console.warn(new Error(data));
    }
    const [description, meta] = data as Exclude<Warning, string>;

    const message = meta ? `${description}: ${inspect(meta)}` : description;
    console.warn(new Error(message));
};

// noinspection JSUnusedGlobalSymbols
export default async function buildpackBabelPlugin(): Promise<Plugin> {
    return babel({
        babelConfig: {
            wrapPluginVisitorMethod: (pluginAlias, visitorType, callback) => {
                return function (...args: unknown[]) {
                    // @ts-ignore
                    const result: FileResult = callback.apply(this, args);
                    result.metadata?.warnings?.forEach(logWarning);
                    return result;
                };
            }
        }
    });
}
