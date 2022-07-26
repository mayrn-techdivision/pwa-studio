import { NodePath } from '@babel/core';
import { JSXAttribute } from '../types';

const isIdentifier = (jsxName: JSXAttribute['name']): jsxName is Extract<JSXAttribute['name'], {type: 'JSXIdentifier'}> => jsxName.type === 'JSXIdentifier'

export const getAttributeName = (path: NodePath<JSXAttribute>) => {
    const { name: jsxName } = path.node;
    if (isIdentifier(jsxName)) {
        return jsxName.name
    } else {
        return jsxName.name.name
    }
};
