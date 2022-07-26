import { NodePath } from '@babel/core';
import { JSXElement } from '@babel/types';
import AbstractOperation, { OperationRequest } from '../AbstractOperation';
import { JSXAttribute } from '../types';
import { getAttributeName } from './util';

interface SetPropsOperationParams {
    props: Record<string, unknown>;
}

interface SetPropsOperationState {
    attributesByName: Map<string, JSXAttribute>;
}

export default class SetPropsOperation extends AbstractOperation<SetPropsOperationState, SetPropsOperationParams> {
    setup({ options: { params: { props } } }: OperationRequest<SetPropsOperationParams>) {
        /**
         * The fastest attribute matching needs a particular data structure, a
         * Map with the attr name as a string, and the attr value as an AST.
         * Gotta make it in a few stages.
         */
            // Props comes in as an object<string,string>
        const attributeSources = Object.entries(props);
        // this.parser.parseAttributes returns JSXAttribute[]
        const parsedAttributes = this.parser.parseAttributes(
            attributeSources
        );
        // attributesByName will be a Map()<string, JSXAttribute>
        this.state.attributesByName = new Map();
        // The props entries and the parsed attributes are the same length,
        // so we'll use the index argument of forEach to count through both.
        attributeSources.forEach(([name], index) => {
            const attr = parsedAttributes[index];
            if (attr?.type !== 'JSXAttribute') {
                return; // spread attributes not supported yet
            }
            this.state.attributesByName.set(name, attr);
        });
    }

    run(path: NodePath<JSXElement>) {
        // Make a copy to use to keep track
        const remainingToSet = new Map(this.state.attributesByName);
        const openingElement = path.get('openingElement');

        openingElement.get('attributes').forEach(propPath => {
            if (!propPath.isJSXAttribute()) {
                return; // spread attributes not supported yet
            }
            const name = getAttributeName(propPath);
            const valuePath = propPath.get('value');
            const shouldBeSet = remainingToSet.get(name);
            if (shouldBeSet) {
                if (shouldBeSet.value) {
                    valuePath.replaceWith(shouldBeSet.value ?? null);
                } else {
                    valuePath.remove()
                }
                remainingToSet.delete(name);
            }
        });
        // create remaining props that weren't present and therefore deleted
        if (remainingToSet.size > 0) {
            openingElement.node.attributes.push(...remainingToSet.values());
        }
    }
}
