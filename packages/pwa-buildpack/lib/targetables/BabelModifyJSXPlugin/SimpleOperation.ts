import AbstractOperation from './AbstractOperation';
import { NodePath } from '@babel/core';
import { JSXElement } from '@babel/types';

type SimpleOperationId = 'insertBefore' | 'insertAfter' | 'remove'

const isSimpleOperation = (operation: string): operation is SimpleOperationId => ['insertBefore', 'insertAfter', 'remove'].includes(operation);

export default class SimpleOperation extends AbstractOperation {
    run(path: NodePath<JSXElement>) {
        if (!isSimpleOperation(this.operation)) {
            // throw error because operation is not supported
            return super.run(path);
        }
        if (!this.jsx) {
            throw new Error('JSX is undefined');
        }
        path[this.operation](this.jsx);
    }
}
