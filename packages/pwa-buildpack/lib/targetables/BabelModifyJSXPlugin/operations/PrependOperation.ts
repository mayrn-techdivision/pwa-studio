import { NodePath } from '@babel/core';
import AbstractOperation from '../AbstractOperation';
import { JSXElement } from '@babel/types';

export default class PrependOperation extends AbstractOperation {
    run(path: NodePath<JSXElement>) {
        path.unshiftContainer('children', [this.jsxRequired]);
    }
}
