export const enum TransformType {
    Source = 'source',
    Babel = 'babel'
}

export type TransformTypes = `${TransformType}`;

export type TransformOptions = Record<string, unknown>;

export interface TransformRequest {
    type: TransformTypes;
    transformModule: string;
    fileToTransform: string;
    options: TransformOptions
    trace: string;
}

export interface TransformRequestWithRequestor extends TransformRequest{
    requestor: string;
    requestorFile: string;
}
