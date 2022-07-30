import TargetableModule  from './TargetableModule';

import SingleImportStatement, { ImportStatementOrString } from './SingleImportStatement';
import { TransformType } from './types';

/**
 * An ECMAScript module that can be changed by a third party.
 *
 * This class presents a convenient API for consumers to add common transforms to ES
 * Modules in a semantic way.
 */
export default class TargetableESModule extends TargetableModule {
    static increment = 0;
    protected readonly imports: Map<string, SingleImportStatement> = new Map();
    protected readonly bindings: Map<string, SingleImportStatement> = new Map();

    /**
     * Adds a static import statement to the module source code, thus importing
     * a new dependency.
     *
     * This method automatically deduplicates attempts to add imports that would override
     * earlier import bindings.
     * If a collision is detected, it renames the binding before inserting it.
     *
     * @param {(string|SingleImportStatement)} statement - A string representing the import statement, or a SingleImportStatement representing it.
     * @returns {SingleImportStatement} An instance of the `SingleImportStatement` class.
     * @memberof TargetableESModule
     */
    addImport(statement: ImportStatementOrString) {
        let importStatement = SingleImportStatement.create(statement);

        const existingFromSource = this.imports.get(importStatement.source);
        if (
            existingFromSource &&
            existingFromSource.imported === importStatement.imported
        ) {
            // that's already here, then.
            return existingFromSource;
        }
        if (this.bindings.has(importStatement.binding)) {
            // we have a binding collision. try importing the binding under a
            // different name.
            importStatement = importStatement.changeBinding(
                this.uniqueIdentifier(importStatement.binding)
            );
        }
        this.bindings.set(importStatement.binding, importStatement);
        this.imports.set(importStatement.source, importStatement);
        this.prependSource(importStatement.statement);
        return importStatement;
    }
    /**
     * Generates a unique identifier for a given binding. Not guaranteed safe,
     * but good enough in a pinch.
     *
     * @memberof TargetableESModule
     */
    uniqueIdentifier(str: string) {
        TargetableESModule.increment++;
        return `${str}$${TargetableESModule.increment}`;
    }
    /**
     * Pass exports of this module through a wrapper module.
     *
     * @param {string} [exportName] Name of export to wrap. If not provided, will wrap the default export.
     * @param {string} wrapperModule Package-absolute import path to the wrapper module.
     *
     * @return { this }
     * @chainable
     */
    wrapWithFile(exportNameOrWrapperModule: string, wrapperModule?: string) {
        const opts = wrapperModule
            ? {
                  exportName: exportNameOrWrapperModule,
                  wrapperModule,
                  defaultExport: false
              }
            : {
                  wrapperModule: exportNameOrWrapperModule,
                  defaultExport: true
              };
        return this.addTransform(
            TransformType.Source,
            '@magento/pwa-buildpack/lib/loaders/wrap-esm-loader',
            opts
        );
    }
}
