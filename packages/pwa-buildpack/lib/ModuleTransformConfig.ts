import path from 'path';
import packageJson from '../package.json';
import { TransformRequestWithRequestor as TransformRequest, TransformType, TransformTypes } from './targetables/types';
const buildpackName = packageJson.name;

export type LoaderOptions = Record<TransformTypes, Record<string, Record<string, TransformRequest[]>>>;

class CompositeError extends Error {
    public originalErrors: (Error | unknown)[] = [];
    private _stack?: string;
    private _message?: string;

    constructor(message?: string) {
        super(message);
        this.name = this.constructor.name;
        this._message = message;
        this._stack = this.stack;

        Object.defineProperty(this, 'stack', {
            get: function () {
                return this._stack + '\n\n' + this.originalErrors?.map((e: Error | unknown) => e instanceof Error ? e.stack : e).join('\n');
            },
            set: function (value) {
                this._stack = value;
            }
        });

        Object.defineProperty(this, 'message', {
            get: function () {
                return this._message;
            },
        });


        // standard way: Error.captureStackTrace(this, this.constructor.name);
        // if you do this, you couldn't set different getter for the 'stack' property
        // this._stack = new Error().stack; // do this, if you need a custom getter
    }

    //
    // get stack() {
    //     return 'extended ' + this._stack;
    // }
    //
    // set stack(stack) {
    //     this._stack = stack;
    // }

    get message() {
        return 'extended ' + this._message;
    }

}


/**
 * @typedef {function(TransformRequest)} addTransform
 * Add a request to transform a file in the build. This function is passed as
 * the first argument to an interceptor of the `transformModules` target.
 *
 * @param {TransformRequest} req - Instruction object for the requested
 * transform, including the transform to apply, the target source code, and
 * other options.
 *
 * @returns null
 */

/** @enum {string} */
const TransformTypesTmp = {
    /**
     * Process the _source code_ of `fileToTransform` through the
     * `transformModule` as text. When applying a `source` TransformRequest,
     * Buildpack will use the `transformModule` as a [Webpack
     * loader](https://v4.webpack.js.org/api/loaders/), so it must implement
     * that interface. Any Webpack loader can be used as a `transformModule`
     * for `source` TransformRequests.
     *
     * `source` transforms are fast and can run on source code of any language,
     * but they aren't as precise and safe as AST-type transforms when modifying
     * code.
     */
    source: TransformType.Source,
    /**
     * Process the _abstract syntax tree_ of the ES module specified by
     * `fileToTransform` through the `transformModule` as a [Babel
     * AST](https://github.com/babel/babel/blob/master/packages/babel-parser/ast/spec.md).
     * When applying a `babel` TransformRequest, Buildpack will use the
     * `transformModule` as a [Babel
     * plugin](https://github.com/jamiebuilds/babel-handbook), so it must
     * implement that interface. Any Babel plugin can be used as a
     * `transformModule` for `babel` TransformRequests.
     *
     * `babel` transforms are powerful and versatile, giving the transformer
     * much more insight into the structure of the source code to modify.
     * However, they are slower than `source` transforms, and they can only
     * work on ES Modules.
     */
    babel: TransformType.Babel
};

/**
 * @typedef {Object} TransformRequest
 * Instruction for configuring Webpack to apply custom transformations to one
 * particular file. The [`configureWebpack()` function]{@link /pwa-buildpack/reference/configure-webpack/}
 * gathers TransformRequests from all interceptors of the `transformModules`
 * target and turns them into a configuration of Webpack [module
 * rules](https://v4.webpack.js.org/configuration/module/#modulerules).
 *
 * @prop {TransformType} type - The type of transformation to apply.
 * @prop {string} fileToTransform - Resolvable path to the file to be transformed itself, the same path that you'd use in `import` or `require()`.
 * @prop {string} transformModule - Absolute path to the Node module that will actually be doing the transforming. This path may be resolved using different
 * rules at different times, so it's best for this path to always be absolute.
 * @prop {object} [options] - Config values to send to the transform function.
 *   _Note: Options should be serializable to JSON as Webpack loader options
 *   and/or Babel plugin options.._
 */

interface ResolverResult {
    id: string;
}

interface Resolver {
    resolve: (path: string) => Promise<ResolverResult | null>;
}

/**
 * Configuration builder for module transforms. Accepts TransformRequests
 * and emits loader config objects for Buildpack's custom transform loaders.
 *
 * Understands all transform types and normalizes them correctly. Mostly this
 * involves resolving the file paths using Webpack or Node resolution rules.
 *
 * For some special types of transform, ModuleTransformConfig has helpers to
 * apply the requested transforms itself. But `configureWebpack` consumes most
 * of the transforms by calling `transformConfig.collect()` on this object,
 * which yields a structured object that configureWebpack can use to set up
 * loader and plugin configuration.
 */
export default class ModuleTransformConfig {
    private _resolver: Resolver;
    private readonly _localProjectName: string;
    private _resolverChanges: any[];
    private _needsResolved: (() => Promise<TransformRequest>)[];
    private trustedVendors: string[];

    /**
     *
     * @static
     * @constructs
     * @param {MagentoResolver} resolver - Resolver to use when finding real paths of
     * modules requested.
     * @param {string} localProjectName - The name of the PWA project being built, taken from the package.json `name` field.
     */

    constructor(resolver: Resolver, localProjectName: string, trustedVendors: string[] = []) {
        this._resolver = resolver;
        this._localProjectName = localProjectName;
        this.trustedVendors = trustedVendors;
        // TODO: Currently nothing changes the resolver, but it will definitely
        // be necessary to deal with this in the future. Trust me, you want to
        // make sure successive transforms obey the rules that their predecessor
        // transforms have set up.
        this._resolverChanges = [];
        this._needsResolved = [];
    }

    /**
     * @borrows addTransform as add
     */
    add(request: TransformRequest) {
        if (!TransformTypesTmp.hasOwnProperty(request.type)) {
            throw this._traceableError(
                `Unknown request type '${
                    request.type
                }' in TransformRequest: ${JSON.stringify(request)}`,
                request.trace
            );
        }
        this._needsResolved.push(this._resolveRequest(request));
    }

    /**
     * Resolve paths and emit as JSON.
     *
     * @returns {object} Configuration object
     */
    async toLoaderOptions() {
        // Resolver still may need updating! Updates should be in order.
        for (const resolverUpdate of this._resolverChanges) {
            await resolverUpdate();
        }
        // Now the requests can be made using the finished resolver!
        const requests = await Promise.all(
            this._needsResolved.map((doResolve) => doResolve())
        );

        const byType = requests.reduce<LoaderOptions>((acc, req) => {
            // Split them up by the transform module to use.
            // Several requests will share one transform instance.
            const { type, transformModule, fileToTransform } = req;
            const transformModulesForType = (acc[type] ??= {});
            const filesForTransformModule = (transformModulesForType[transformModule] ??= {});
            const requestsForFile = (filesForTransformModule[fileToTransform] ??= []);
            requestsForFile.push(req);
            return acc;
        }, {
            babel: {},
            source: {}
        });

        return JSON.parse(JSON.stringify(byType)) as LoaderOptions;
    }

    /**
     * Prevent modules from transforming files from other modules.
     * Preserves encapsulation and maintainability.
     * @private
     */
    _assertAllowedToTransform(request: TransformRequest) {
        const { requestor, fileToTransform } = request;
        if (
            !this._isLocal(requestor) && // Local project can modify anything
            !this._isBuiltin(requestor) && // Buildpack itself can modify anything
            !this._isTrustedExtensionVendor(requestor) && // Trusted extension vendors can modify anything
            !fileToTransform.startsWith(requestor)
        ) {
            throw this._traceableError(
                `Invalid fileToTransform path "${fileToTransform}": Extensions are not allowed to provide fileToTransform paths outside their own codebase! This transform request from "${requestor}" must provide a path to one of its own modules, starting with "${requestor}".`,
                request.trace
            );
        }
    }

    _isBuiltin(requestor: string) {
        return requestor === buildpackName;
    }

    _isLocal(requestor: string) {
        return requestor === this._localProjectName;
    }

    _isTrustedExtensionVendor(requestor: string): boolean {
        const requestorVendor = requestor.split('/')[0];
        return requestorVendor !== undefined && requestorVendor.length > 0 && this.trustedVendors.includes(requestorVendor);
    }

    _traceableError(msg: string, trace: string) {
        const capturedError = new Error(`ModuleTransformConfig: ${msg}`);
        Error.captureStackTrace(capturedError, ModuleTransformConfig);
        capturedError.stack = [capturedError.stack, trace].join("\n");
        return capturedError;
    }

    // Must throw a synchronous error so that .add() can throw early on a
    // disallowed module. So this is not an async function--instead it deals in
    // promise-returning function directly.
    _resolveRequest(request: TransformRequest) {
        this._assertAllowedToTransform(request);
        const transformModule = this._resolveWebpack(request, 'transformModule');
        const fileToTransform = this._resolveWebpack(request, 'fileToTransform');
        return async () => {
            return {
                ...request,
                fileToTransform: await fileToTransform,
                transformModule: await transformModule
            };
        }
    }

    _resolveWebpack(request: TransformRequest, prop: Extract<keyof TransformRequest, 'transformModule' | 'fileToTransform'>) {
        const requestPath = request[prop];
        // make module-absolute if relative
        const toResolve = requestPath.startsWith('.')
            ? path.join(request.requestor, requestPath)
            : requestPath;
        // Capturing in the sync phase so that a resolve failure is traceable.
        const resolveError = this._traceableError(
            `could not resolve ${prop} "${toResolve}" from requestor ${
                request.requestor
            } using Vite rules.`, request.trace
        );
        return (async () => {
            try {
                const result = await this._resolver.resolve(toResolve);
                if (result) {
                    return result.id;
                }
            } catch (e) {
                // @ts-ignore
                resolveError.originalErrors = [e];
                throw resolveError;
            }
            throw resolveError;
        })()
    }

    _resolveNode(request: TransformRequest, prop: Extract<keyof TransformRequest, 'transformModule' | 'fileToTransform'>) {
        let nodeModule;
        try {
            nodeModule = require.resolve(request[prop]);
        } catch (e) {
            try {
                nodeModule = require.resolve(
                    path.join(request.requestor, request[prop])
                );
            } catch (innerE) {
                const resolveError = this._traceableError(
                    `could not resolve ${prop} ${
                        request[prop]
                    } from requestor ${request.requestor} using Node rules.`,
                    request.trace
                );
                // @ts-ignore
                resolveError.originalErrors = [e, innerE];
                // console.error(resolveError);
                throw resolveError;
            }
        }
        return nodeModule;
    }
}
