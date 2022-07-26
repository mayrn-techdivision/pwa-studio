import { NodePath } from '@babel/core';
import AbstractOperation from '../AbstractOperation';
import { Expression, JSXElement } from '@babel/types';
import { getAttributeName } from './util';
import { JSXAttribute } from '../types';

interface AddClassNameOperationParams {
    className: string;
}

interface AddClassNameOperationState {
    classNameNode: Extract<Expression, { type: 'StringLiteral' }>;
}

export default class AddClassNameOperation extends AbstractOperation<AddClassNameOperationState, AddClassNameOperationParams> {
    setup() {
        const node = this.parser.parseExpression(
            this.params.className
        );
        // @ts-ignore
        if (!this.babel.types.isStringLiteral(node)) {
            throw new Error(`Invalid className "${this.params.className}"`);
        }
        this.state.classNameNode = node;
    }

    run(path: NodePath<JSXElement>) {
        const { types: t } = this.babel;
        const openingElement = path.get('openingElement');
        const classAttrPath = openingElement
            .get('attributes')
            .find(
                (propPath): propPath is NodePath<JSXAttribute> =>
                    propPath.isJSXAttribute() &&
                    getAttributeName(propPath) === 'className'
            );
        if (!classAttrPath) {
            // then create the className prop!
            openingElement.pushContainer('attributes', [
                t.jsxAttribute(
                    t.jsxIdentifier('className'),
                    this.state.classNameNode
                )
            ]);
        } else {
            // it's something else, so concatenate to it
            const { value } = classAttrPath.node;
            const actualValue = value?.type === 'JSXExpressionContainer' ? value.expression : value;
            if (!actualValue || actualValue.type === 'JSXEmptyExpression') {
                throw new Error('Got empty expression');
            }
            classAttrPath
                .get('value')
                .replaceWith(
                    t.jsxExpressionContainer(
                        t.binaryExpression(
                            '+',
                            t.binaryExpression(
                                '+',
                                actualValue,
                                t.stringLiteral(' ')
                            ),
                            this.state.classNameNode
                        )
                    )
                );
        }
    }
}
