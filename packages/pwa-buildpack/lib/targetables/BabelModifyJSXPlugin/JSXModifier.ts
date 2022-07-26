import JSXSnippetParser from './JSXSnippetParser';
import Operation from './Operation';
import { Node, NodePath } from '@babel/core';
import AbstractOperation, { OperationRequest } from './AbstractOperation';
import { Babel, JSXTransformPluginState, Warning } from './types';
import { JSXElement, JSXOpeningElement } from '@babel/types';

/**
 * Processor for JSX nodes in an AST, which receives a list of instructions and
 * then a sequence of nodes from the plugin visitor.
 *
 * For every JSX node, JSXModifier will check its library of operations to see
 * if one matches, and if so, it will run the requested operation on the node.
 *
 * @class JSXModifier
 */
export default class JSXModifier {
    private readonly parser: JSXSnippetParser;
    private readonly operations: Set<AbstractOperation>;
    private readonly visitor: JSXTransformPluginState;
    private readonly unmatchedOperations: Set<AbstractOperation>;
    private readonly visited: WeakMap<Node, Set<AbstractOperation>>;

    constructor(requests: OperationRequest[], babel: Babel, visitor: JSXTransformPluginState) {
        this.parser = new JSXSnippetParser(babel, visitor.filename);
        this.visitor = visitor;
        this.operations = new Set(
            requests.map((request) =>
                Operation.fromRequest(request, {
                    parser: this.parser,
                    file: this.visitor.file,
                    babel
                })
            )
        );
        this.unmatchedOperations = new Set(this.operations);
        this.visited = new WeakMap();
    }

    runMatchingOperations(openingPath: NodePath<JSXOpeningElement>) {
        const path = openingPath.parentPath as NodePath<JSXElement>;
        // if (!path?.isJSXElement()) {
        //     throw Error(`Parent is not a jsx element: "${openingPath.toString()}"`)
        // }

        // detach node so that we preserve its identity, even if the operation
        // changes the value of path.node. Otherwise, we won't cache the node we
        // actually visited, and we may end up infinitely recurring.
        const originalNode = path.node;
        const hasAlreadyRun = this.visited.get(originalNode) || new Set();
        for (const operation of this.operations) {
            if (operation.match(path) && !hasAlreadyRun.has(operation)) {
                this.unmatchedOperations.delete(operation);
                operation.run(path);
                hasAlreadyRun.add(operation);
                if (!operation.global) {
                    this.operations.delete(operation);
                }
                this.visited.set(originalNode, hasAlreadyRun);
                if (path.removed || !path.node) {
                    break;
                } else if (path.node !== originalNode) {
                    this.visited.set(path.node, hasAlreadyRun);
                }
            }
        }
    }

    parseJSXParam(params: { jsx: string }) {
        return this.parser.parseElement(
            this.parser.normalizeElement(params.jsx)
        );
    }

    warnUnmatchedOperations() {
        const {metadata} = this.visitor.file;
        if (!metadata) {
            return;
            // TODO: improve this
        }


        const warnings: Warning[] = [];
        for (const operation of this.unmatchedOperations) {
            warnings.push(
                `JSX operation:\n${operation}\nnever found an element matching '${
                    operation.element
                }'`
            );
        }
        metadata.warnings = warnings;
    }
}
