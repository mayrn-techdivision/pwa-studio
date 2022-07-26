import { parseSync } from '@babel/core';
import { Statement } from '@babel/types';
import util from 'util';
import figures from 'figures';

class SingleImportError extends Error {
    constructor(statement: string, details?: string) {
        const msg = `Bad import statement: ${util.inspect(
            statement
        )}. SingleImportStatement must be an ES Module static import statement of the form specified at https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import, which imports exactly one binding.`;
        super(details ? `${msg} \n\nDetails: ${details}` : msg);
        Error.captureStackTrace(this, SingleImportStatement);
    }
}

type ImportDeclaration = Extract<Statement, { type: 'ImportDeclaration' }>

export type ImportStatementOrString = string | SingleImportStatement;

/**
 * Represents a static import statement in an ES module. SingleImportStatemnts
 * are used inside TargetableESModule methods to keep track of the new
 * dependencies being added to the module, and to resolve conflicts when they
 * occur.
 *
 * The typical way to add new imports to a TargetableESModule is to pass a
 * static import statement. The import statement can accomplish two things:
 *
 *  - It's already a familiar syntax
 *  - It contains the module path, the exports of the module to import, and the local binding names for those imports
 *
 * That's _almost_ all we need to do the import management we need, including
 * deduping and scope conflict resolution.
 */
export default class SingleImportStatement {
    private readonly originalStatement: string;
    public readonly statement: string;
    private readonly node: ImportDeclaration;
    private readonly specifier: ImportDeclaration['specifiers'][number];
    public readonly binding: string;
    public readonly source: string;
    public readonly imported: string;

    static create(statement: ImportStatementOrString) {
        return statement instanceof SingleImportStatement
            ? statement
            : new SingleImportStatement(statement);
    }

    /**
     * @param {string} statement A static import statement
     */
    constructor(statement: string) {
        this.originalStatement = statement;
        this.statement = this.normalizeStatement(statement);
        this.node = this._parse();
        this.specifier = this.getSpecifier();
        this.binding = this.getBinding();
        this.source = this.getSource();
        this.imported = this.getImported(); // must come after this._getBinding
    }

    /**
     * Creates a new SingleImportStatement object with a different binding.
     *
     * @param {string} newBinding - Binding to rename.
     *
     * @returns {SingleImportStatement} A new SingleImportStatement that is a copy
     * of this one, but with the binding renamed. The `originalStatement` and
     * `statement` properties are rewritten to use the new binding.
     */
    changeBinding(newBinding: string) {
        // const { imported, local } = this.specifier;
        let position: { start: number | null, end: number | null } = this.specifier.local;
        let binding = newBinding;

        if (this.specifier.type === 'ImportSpecifier' && this.specifier.imported.start === this.specifier.local.start) {
            const imported = this.specifier.imported;
            // looks like we're exporting the imported identifier as local, so
            // amend it to alias to the new binding.
            // Don't replace any characters; start and end are the same index.
            position = {
                start: imported.end,
                end: imported.end
            };
            binding = ` as ${newBinding}`;
        }

        const start = this.statement.slice(0, position.start ?? undefined);
        const end = this.statement.slice(position.end ?? undefined);

        return new SingleImportStatement(start + binding + end);
    }

    /**
     * When interpolated as a string, a SingleImportStatement becomes the value
     * of its `binding` property.
     *
     * @returns string
     */
    toString() {
        return this.binding;
    }

    normalizeStatement(statementArg: string) {
        // noinspection SuspiciousTypeOfGuard
        if (typeof statementArg !== 'string') {
            throw new SingleImportError(statementArg);
        }

        let statement = statementArg.trim(); // it feels bad to modify arguments

        // semicolons because line breaks are no guarantee in a bundler
        if (!statement.endsWith(';')) {
            statement += ';';
        }

        // affordance to add "import" so that you can say
        // `new ImportStatement('X from "x"')` which is less redundant than
        // `new ImportStatement('import X from "x"')`
        if (!statement.startsWith('import')) {
            statement = `import ${statement}`;
        }

        return statement + '\n';
    }

    _parse() {
        const node = this.parseNode();
        if (!node) {
            throw new SingleImportError(
                this.originalStatement,
                `Parsed node is null`
            );
        }
        const program = node.type === 'Program' ? node : node.program;
        let statement: Statement | undefined;
        try {
            statement = program.body[0];
        } catch (e) {
            throw new SingleImportError(
                this.originalStatement,
                `Unexpected AST structure: ${util.inspect(node, { depth: 1 })}`
            );
        }
        if (statement?.type !== 'ImportDeclaration') {
            throw new SingleImportError(
                this.originalStatement,
                `Statement type was ${statement?.type}`
            );
        }
        return statement;
    }

    private parseNode() {
        try {
            return parseSync(this.statement, {
                filename: 'import-statement.js',
                sourceType: 'module'
            });
        } catch (e) {
            let msg: string;
            if (e instanceof Error) {
                msg = e.message;
                let indicator = '\n\t';
                // @ts-ignore
                for (let index = 0; index < e.pos; index++) {
                    indicator += figures.line;
                }
                msg += `${indicator}v\n\t${this.statement}`;
            } else {
                msg = `${e}`;
            }
            throw new SingleImportError(this.originalStatement, msg);
        }
    }

    private getBinding() {
        return this.specifier.local.name;
    }

    private getSource() {
        return this.node.source.value;
    }

    private getImported(): string {
        switch (this.specifier.type) {
            case 'ImportNamespaceSpecifier':
                return '*';
            case 'ImportDefaultSpecifier':
                return 'default';
            default: {
                const { imported } = this.specifier;
                return imported.type === 'StringLiteral' ? imported.value : imported.name;
            }
        }
    }

    private getSpecifier() {
        if (this.node.specifiers.length !== 1 || !this.node.specifiers[0]) {
            const bindings = this.node.specifiers.map(({ local }) => local.name);
            throw new SingleImportError(
                this.originalStatement,
                `Import ${bindings.length} bindings: ${bindings.join(
                    ', '
                )}. Imports for these targets must have exactly one binding, which will be used in generated code.`
            );
        }
        return this.node.specifiers[0];
    }
}
