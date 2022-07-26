import TargetableESModule  from './TargetableESModule';
import SingleImportStatement, { ImportStatementOrString } from './SingleImportStatement';

/**
 * Builds a simple ES module that imports a list of other modules you provide,
 * and then re-exports those modules as an object with properties matching the
 * imported bindings.
 * Useful for building named lists and associative arrays when making extension points.
 *
 * Uses {@link https://github.com/magento/pwa-studio/blob/develop/packages/pwa-buildpack/lib/WebpackTools/loaders/export-esm-collection-loader.js|export-esm-collection-loader} to build source code.
 */
export default class TargetableESModuleObject extends TargetableESModule {
    private readonly errors: string[];

    constructor(...args: ConstructorParameters<typeof TargetableESModule>) {
        super(...args);
        this.errors = [];
    }

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
    addImport(importString: ImportStatementOrString) {
        const importStatement = SingleImportStatement.create(importString);
        const alreadyBound = this.bindings.get(importStatement.binding);
        if (alreadyBound) {
            this.errors.push(
                `Cannot export "${importStatement.imported}" as "${
                    importStatement.binding
                }" from "${importStatement.source}". Export "${
                    importStatement.binding
                }" was already assigned to "${alreadyBound.imported}" from "${
                    alreadyBound.source
                }".`
            );
        } else {
            super.addImport(importStatement);
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
        args.forEach(arg => this.addImport(arg));
        return this;
    }

    flush() {
        if (this.bindings.size > 0) {
            this.queuedTransforms.push(
                this._createTransform(
                    'source',
                    '@magento/pwa-buildpack/lib/WebpackTools/loaders/export-esm-collection-loader',
                    {
                        type: 'object',
                        bindings: [...this.bindings.keys()],
                        errors: this.errors
                    }
                )
            );
        }
        return super.flush().reverse();
    }
}
