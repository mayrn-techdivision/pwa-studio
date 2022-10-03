import TargetableESModule from './TargetableESModule';
import SingleImportStatement, { ImportStatementOrString } from './SingleImportStatement';
import TargetableReactComponent from './TargetableReactComponent';

/**
 * Builds a simple ES module that imports a list of other modules you provide,
 * and then re-exports those modules as an object with properties matching the
 * imported bindings.
 * Useful for building named lists and associative arrays when making extension points.
 *
 * Uses {@link https://github.com/magento/pwa-studio/blob/develop/packages/pwa-buildpack/lib/WebpackTools/loaders/export-esm-collection-loader.js|export-esm-collection-loader} to build source code.
 */
export default class TargetableLazyModuleObject extends TargetableReactComponent {
    private readonly errors: string[] = [];

    /**
     * Adds a module to the object using the `addImport()` method from TargetableESModule.
     * Since, all imports must be exported, this method performs additional validation.
     *
     * @param {string} importString A static import declaration
     *
     * @return { this }
     * @chainable
     */
    // @ts-ignore
    addLazyImport(importString: ImportStatementOrString) {
        const importStatement = SingleImportStatement.create(importString);

        if (importStatement.imported !== 'default') {
            this.errors.push('Only default exports are allowed for LazyModuleObject as it\'s built on React Lazy Imports.');
            return;
        }

        const [alreadyBound] = [...this.lazyComponents.entries()].find(([, moduleName]) => {
            return moduleName === importStatement.binding;
        }) ?? [];

        if (alreadyBound) {
            this.errors.push(
                `Cannot export "default" as "${
                    importStatement.binding
                }" from "${importStatement.source}". Export "${
                    importStatement.binding
                }" was already assigned to "default" from "${
                    alreadyBound
                }".`
            );
        } else {
            super._addActualReactLazyImport(importStatement.source, importStatement.binding);
        }
        return this;
    }

    /**
     * Adds a module or modules to the object using the `addImport()` function.
     *
     * @param  {...string} args Static import declaration(s)
     *
     * @return { this }
     * @chainable
     */
    add(...args: ImportStatementOrString[]) {
        args.forEach(arg => this.addLazyImport(arg));
        return this;
    }

    flush() {
        if (this.lazyComponents.size > 0) {
            this.queuedTransforms.push(
                this._createTransform(
                    'source',
                    '@magento/pwa-buildpack/lib/loaders/export-esm-collection-loader',
                    {
                        type: 'object',
                        bindings: [...this.lazyComponents.values()],
                        errors: this.errors
                    }
                )
            );
        }
        return super.flush();
    }
}
