import { NodePath } from '@babel/core';
import { JSXElement } from '@babel/types';
import AbstractOperation from '../AbstractOperation';
import { getAttributeName } from './util';


interface RemovePropsOperationParams {
    props: Iterable<string>;
}

interface RemovePropsOperationState {
    propSet: Set<string>;
}

export default class RemovePropsOperation extends AbstractOperation<RemovePropsOperationState, RemovePropsOperationParams> {
    setup() {
        this.state.propSet = new Set(this.params.props);
    }

    run(path: NodePath<JSXElement>) {
        const toRemove = new Set(this.state.propSet);
        const openingElement = path.get('openingElement');
        openingElement.get('attributes').forEach(propPath => {
            if (
                propPath.isJSXAttribute() &&
                toRemove.has(getAttributeName(propPath))
            ) {
                propPath.remove();
            }
        });
    }
};
