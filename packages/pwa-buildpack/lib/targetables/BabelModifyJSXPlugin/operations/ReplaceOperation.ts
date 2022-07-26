import { NodePath } from '@babel/core';
import { JSXElement } from '@babel/types';
import AbstractOperation from '../AbstractOperation';

interface ReplaceOperationState {
    seen: Set<JSXElement>;
}

export default class ReplaceOperation extends AbstractOperation<ReplaceOperationState> {
    setup() {
        this.state.seen = new Set();
    }

    run(path: NodePath<JSXElement>) {
        if (!this.state.seen.has(path.node)) {
            this.state.seen.add(path.node);
            path.replaceWith(this.jsxRequired);
        }
    }
}
