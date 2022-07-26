import { NodePath } from '@babel/core';
import AbstractOperation from '../AbstractOperation';
import { JSXElement } from '@babel/types';

export default class SurroundOperation extends AbstractOperation {
    run(path: NodePath<JSXElement>) {
        const originalNode = path.node;
        path.replaceWith(this.jsxRequired);
        path.pushContainer('children', [originalNode]);
    }
}
