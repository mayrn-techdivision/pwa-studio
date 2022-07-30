import TargetableESModule  from './TargetableESModule';
import { TransformType } from './types';
import { ImportStatementOrString } from './SingleImportStatement';

/**
 * Builds a simple ES module that imports a list of other modules you provide,
 * and then re-exports those modules in order as an array.
 * Useful for building extensible navigation lists, routes, strategies, etc.
 *
 * This class uses {@link https://github.com/magento/pwa-studio/blob/develop/packages/pwa-buildpack/lib/WebpackTools/loaders/export-esm-collection-loader.js|export-esm-collection-loader} to build the source code.
 */
export default class TargetableESModuleArray extends TargetableESModule {
    private readonly orderedBindings: string[] = [];

    /**
     * Adds a module to the end of the array.
     *
     * This also acts as an alias for the `push()` function.
     *
     * @param {string} statement A static import declaration for a module
     *
     * @returns {undefined}
     */
    addImport(statement: ImportStatementOrString, append = true) {
        const generated = super.addImport(statement);
        if (append) {
            this.orderedBindings.push(generated.binding);
        } else {
            this.orderedBindings.unshift(generated.binding);
        }
        return generated;
    }

    /**
     * Add a module or modules to the end of the array.
     *
     * This also acts as an alias for the `push()` function.
     *
     * @param  {...any} items Static import declaration(s)
     *
     * @returns {undefined}
     */
    add(...statements: ImportStatementOrString[]) {
        return this.push(...statements);
    }
    /**
     * Add a module or modules to the end of the array.
     *
     * @param {...string} importString - Static import declaration(s)
     *
     * @returns {undefined}
     */
    push(...statements: ImportStatementOrString[]) {
        statements.forEach(statement => this.addImport(statement, true))
    }
    /**
     * Add a module or modules to the _beginning_ of the array.
     *
     * @param {...string} importString - Static import declaration(s)
     *
     * @returns {undefined}
     */
    unshift(...statements: ImportStatementOrString[]) {
        statements.forEach(statement => this.addImport(statement, false))
    }

    flush() {
        // Consolidate into a single transform request.
        // If the array is large, this improves performance.
        if (this.bindings.size > 0) {
            // Should happen after the imports are added.
            this.queuedTransforms.unshift(
                this._createTransform(
                    TransformType.Source,
                    '@magento/pwa-buildpack/lib/loaders/export-esm-collection-loader',
                    {
                        type: 'array',
                        bindings: this.orderedBindings
                    }
                )
            );
        }
        return super.flush();
    }
}
