import { NodePath } from '@babel/core';
import { inspect } from 'util';
import JSXSnippetParser from './JSXSnippetParser';
import { JSXElement, JSXOpeningElement } from '@babel/types';
import { Babel } from './types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface,@typescript-eslint/ban-types
export type EmptyObject = {}

export const enum OperationEnum {
    Append = 'append',
    Prepend = 'prepend',
    RemoveProps = 'removeProps',
    Replace = 'replace',
    SetProps = 'setProps',
    Surround = 'surround',
    AddClassName = 'addClassName',
    InsertAfter = 'insertAfter',
    InsertBefore = 'insertBefore',
    Remove = 'remove'
}

export type OperationId = `${OperationEnum}` | string;

export type OperationParams<P extends EmptyObject = EmptyObject> = {
    global?: unknown;
    jsx?: string;
} & P;

export interface OperationRequest<P extends EmptyObject = EmptyObject> {
    options: {
        operation: OperationEnum|OperationId;
        element: string;
        params: OperationParams<P>;
    };
}

export interface OperationContext {
    parser: JSXSnippetParser;
    file: unknown;
    babel: Babel;
}

export default class AbstractOperation<S extends EmptyObject = EmptyObject, P extends EmptyObject = EmptyObject> {
    protected readonly request: OperationRequest<P>;
    protected readonly operation: string;
    protected readonly params: OperationParams<P>;
    public readonly element: string;
    protected readonly parser: JSXSnippetParser;
    protected readonly babel: Babel;
    private _jsx!: ReturnType<JSXSnippetParser['parseElement']>;
    protected readonly file: unknown;
    public readonly global: unknown;
    private readonly matcherText: string;
    private readonly matcherName: string;
    private readonly requiredAttributes: Map<string, string>;
    protected readonly state = {} as S;

    get jsx() {
        if (!this.params.jsx) {
            return undefined;
        }
        if (!this._jsx) {
            this._jsx = this.parser.parseElement(
                this.parser.normalizeElement(this.params.jsx)
            );
        }
        return this._jsx;
    }

    get jsxRequired() {
        const jsx = this.jsx;
        if (!jsx) {
            throw new Error('JSX is undefined');
        }
        return jsx;
    }

    constructor(request: OperationRequest<P>, { parser, file, babel }: OperationContext) {
        this.request = request;
        this.babel = babel;

        const { element, operation, params } = request.options;
        this.params = params;
        this.operation = operation;
        this.element = element;

        this.parser = parser;
        this.file = file;

        this.global = this.params.global;

        // noinspection SuspiciousTypeOfGuard
        if (typeof element !== 'string') {
            throw new Error(
                `JSX operation:\n${this}\n is invalid: first argument must be a string which will be used to find matching elements`
            );
        }

        this.matcherText = this.parser.normalizeElement(element);
        const matcherAST = this.parser.parseElement(this.matcherText);
        this.matcherName = this._getSource(matcherAST.openingElement.name);
        this.requiredAttributes = new Map();
        // @ts-ignore
        for (const { name, value } of matcherAST.openingElement.attributes) {
            this.requiredAttributes.set(
                this._getSource(name),
                this._getSource(value)
            );
        }
        this.setup(this.request);
    }


    _getSource(node: { start: number | null, end: number | null }) {
        // TODO: check if this can be improved
        // @ts-ignore babel's types are nullable, the legacy implementation did not perform any validation here. So we will not either for now
        return this.matcherText.slice(node.start, node.end);
    }

    match(path: NodePath) {
        return this.matchElement(path);
    }

    matchElement(path: NodePath) {
        const openingElementPath = this.getOpeningElement(path);
        return (
            openingElementPath &&
            this._shouldEnterElement(openingElementPath) &&
            this._matchesAttributes(openingElementPath.get('attributes'))
        );
    }

    private getOpeningElement(path: NodePath) {
        const openingElement = path.get('openingElement');
        return (Array.isArray(openingElement) ? openingElement[0] : openingElement) as NodePath<JSXOpeningElement>;
    }

    _shouldEnterElement(path: NodePath<JSXOpeningElement>) {
        const elementName = path.get('name').toString();
        if (elementName !== this.matcherName) {
            return false;
        }

        const numAttributesPresent = path.node.attributes.length;

        const numAttributesRequired = this.requiredAttributes.size;

        if (numAttributesPresent < numAttributesRequired) {
            // even if one matches, it won't be enough!
            return false;
        }
        return true;
    }

    _matchesAttributes(attributePaths: NodePath<JSXOpeningElement['attributes'][number]>[]) {
        const matchMap = new Map(this.requiredAttributes);
        for (const attr of attributePaths) {
            const attributeName = attr.get('name').toString();
            if (!matchMap.has(attributeName)) {
                // no requirement for this attribute, ignore
                continue;
            }
            const expected = matchMap.get(attributeName);
            const actual = attr.get('value').toString();
            if (expected !== actual) {
                return false; // explicitly a rejection
            }
            matchMap.delete(attributeName);
        }
        return matchMap.size === 0; // all required attributes match
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    run(path: NodePath<JSXElement>) {
        throw new Error(
            `${
                this.constructor.name
            } has not implemented a .run(path) method for the operation "${
                this.operation
            }".`
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    setup(request: OperationRequest<P>) {
    }

    toString(indentSpaces = 2) {
        const { element, operation, params } = this.request.options;
        let args = inspect(element);
        if (params) {
            args += `, ${inspect(params)}`;
        }
        if (args.includes('\n')) {
            args += '\n';
        }
        const indent = Array.from({ length: indentSpaces }, () => ' ').join('');
        return `${indent}${operation}JSX(${args})`
            .split('\n')
            .join(`\n${indent}`);
    }
}
