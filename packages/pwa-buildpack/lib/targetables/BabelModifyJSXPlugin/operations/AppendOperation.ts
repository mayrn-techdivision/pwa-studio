import { NodePath } from '@babel/core';
import AbstractOperation from '../AbstractOperation';
import { JSXElement } from '@babel/types';

export default class AppendOperation extends AbstractOperation {
    run(path: NodePath<JSXElement>) {
        path.pushContainer('children', [this.jsxRequired]);
    }
}
