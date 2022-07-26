import { BabelFileMetadata, BabelFileResult, type parseSync } from '@babel/core';
import type * as BabelTypes from '@babel/types';
import { OperationRequest } from './AbstractOperation';
import JSXModifier from './JSXModifier';

export interface Babel {
    types: typeof BabelTypes,
    parseSync: typeof parseSync
}

// Sadly Babel doesn't export their JSXAttribute type, so we need to narrow the entire Node type down to just JSXAttribute
export type JSXAttribute = Extract<BabelTypes.Node, { type: 'JSXAttribute' }>
export type JSXSpreadAttribute = Extract<BabelTypes.Node, { type: 'JSXSpreadAttribute' }>

export interface JSXTransformOptions {
    requestsByFile: Record<string, OperationRequest[]>;
}

export type Warning = [string, Record<string, unknown>]|string;

export interface FileMetadata extends BabelFileMetadata{
    warnings?: Warning[]
}

export interface FileResult extends BabelFileResult {
    metadata?: FileMetadata | undefined
}

export interface JSXTransformPluginState {
    modifyingJSX: JSXModifier;
    opts: JSXTransformOptions;
    filename: string;
    file: FileResult
}
