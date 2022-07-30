import Trackable from './Trackable';
import { TapableType } from './mapHooksToTargets';
import { CompleteHook, InvokeTapOptions, TapableCallback, TapCallback, TapMethod, TapOptions } from './types';
import TargetProvider from './TargetProvider';

const interceptionTypes: Record<TapMethod, string> = {
    tap: 'sync',
    tapAsync: 'async',
    tapPromise: 'promise'
} as const;

export default class Target<T = unknown, R = unknown> extends Trackable {
    protected readonly owner: TargetProvider;
    protected readonly tapable: CompleteHook<T, R>;
    protected readonly requestor: TargetProvider;
    protected readonly name: string;
    protected readonly type: TapableType;
    static External: typeof ExternalTarget;

    static get SOURCE_SEP() {
        return '::';
    }

    constructor(owner: TargetProvider, requestor: TargetProvider, targetName: string, tapableType: TapableType, tapable: CompleteHook<T, R>) {
        super();
        this.owner = owner;
        this.tapable = tapable;
        this.requestor = requestor;
        this.name = targetName;
        this.type = tapableType;
        this.attach(`${targetName}[${tapableType}]`, this.owner);
    }

    protected invokeTap<M extends TapMethod>(method: M, info: TapOptions<M, T, R> | string | TapCallback<M, T, R>, callback?: TapCallback<M, T, R>) {
        const [options, fn] = this.createTapOptions(info, callback);
        this.track('intercept', {
            source: this.requestor.name,
            type: interceptionTypes[method]
        });
        // @ts-ignore TODO: make typescript believe me that it's getting the right callback type
        return this.tapable[method](options, fn);
    }

    private createTapOptions<M extends TapMethod>(info: TapOptions<M, T, R> | string | TapCallback<M, T, R>, fn?: TapCallback<M, T, R>): [Omit<InvokeTapOptions<M, T, R>, 'fn'>, TapCallback<M, T, R>] {
        switch (typeof info) {
            case 'object': {
                // a tapInfo object was passed! extract its name...
                const { name, fn, ...otherInfo } = info;
                return [
                    { name: this.getTapName(name), ...otherInfo, file: this.requestor.file ?? '' },
                    fn
                ];
            }
            case 'string': {
                if (fn) {
                    return [{ name: this.getTapName(info), file: this.requestor.file ?? '' }, fn];
                }
                break;
            }
            case 'function': {
                return [{ name: this.getTapName(), file: this.requestor.file ?? '' }, info];
            }
        }
        throw new Error(`Could not create tap options from provided params: ${JSON.stringify([info, fn])}`);
    }

    private getTapName(name?: string) {
        return name ? this.requestor.name + Target.SOURCE_SEP + name : this.requestor.name;
    }


    /**
     * Run `.call(...args)` on the underlying Tapable Hook.
     * Calls interceptors synchronously and in subscription order with the
     * provided arguments. Returns the final value if it's a Waterfall target,
     * or the value returned by the first interceptor that returns a value if
     * it's a Bail target.
     *
     * @param {...*} [args] All arguments are passed to the interceptor functions that have tapped this Target.
     *
     * @return {*} Returns whatever the underlying Tapable Hook returns.
     */
    call(...args: Parameters<CompleteHook<T, R>['call']>) {
        this.track('beforeCall', { type: 'sync', args });
        const returned = this.tapable.call(...args);
        this.track('afterCall', { type: 'sync', returned });
        return returned;
    }

    /**
     * Run `.callAsync(...args)` on the underlying Tapable Hook. Calls
     * interceptors asynchronously with the provided arguments. Depending on
     * the Target type, calls interceptors in parallel or in subscription
     * order. Last argument must be a callback. It will be invoked when all
     * interceptors have run, or when the first returning interceptor has run
     * if it's a Bail target.
     */
    callAsync(...incomingArgs: [...unknown[], TapableCallback]) {
        const callbackIndex = incomingArgs.length - 1;
        const callback = incomingArgs[callbackIndex] as TapableCallback;
        const args = incomingArgs.slice(0, callbackIndex);
        this.track('beforeCall', { type: 'async', args });
        args.push((...returned: unknown[]) => {
            this.track('afterCall', { type: 'async', returned });
            callback(...returned);
        });
        // @ts-ignore Need to ignore this as we don't know the amount of params and tapable.callAsync expects a fixed, known amount
        return this.tapable.callAsync(...args);
    }

    /**
     * Run `.intercept(options)` on the underlying Tapable Hook.
     * Can register meta-interceptors for other activity on this target.
     * Use only for logging and debugging.
     *
     * @param {object} options Options for [Tapable#intercept](https://github.com/webpack/tapable#interception).
     *
     * @return {void}
     */
    intercept(options: Parameters<CompleteHook<T, R>['intercept']>[0]) {
        this.track('intercept', {
            type: 'intercept',
            source: this.requestor.name,
            options
        });
        return this.tapable.intercept(options);
    }

    /**
     * Run `.promise(...args)` on the underlying Tapable hook. Calls
     * interceptors asynchronously with the provided arguments. Depending on
     * the Target type, calls interceptors in parallel or in series. Returns a
     * promise. It will be fulfilled when all interceptors have run, or when
     * the first returning interceptor has run if it's a Bail target.
     *
     * @param {...*} [args] All arguments are passed to the interceptor functions that have tapped this Target.
     *
     * @return {Promise} A Promise for any output of the target's interceptors.
     */
    promise(...args: Parameters<CompleteHook<T, R>['promise']>) {
        this.track('beforeCall', { type: 'promise', args });
        return this.tapable.promise(...args).then((returned: unknown) => {
            this.track('afterCall', { type: 'promise', returned });
            return returned;
        });
    }

    /**
     *  Adds a synchronous interceptor to the target.
     *  If you just supply a function, it will use your extension's package name as the name of the tap.
     */
    tap(name: TapOptions<TapMethod.Tap, T, R> | string | TapCallback<TapMethod.Tap, T, R>, interceptor?: TapCallback<TapMethod.Tap, T, R>) {
        return this.invokeTap(TapMethod.Tap, name, interceptor);
    }

    /**
     *  Adds a callback-style asynchronous interceptor to the Target. The interceptor will receive a callback function as its last argument. Only supported on Async targets.
     */
    tapAsync(name: TapOptions<TapMethod.TapAsync, T, R> | string | TapCallback<TapMethod.TapAsync, T, R>, interceptor?: TapCallback<TapMethod.TapAsync, T, R>) {
        return this.invokeTap(TapMethod.TapAsync, name, interceptor);
    }

    /**
     *  Adds a Promise-returning async interceptor to the Target. The interceptor may return a Promise, which the Target will resolve. Only supported on Async targets.
     */
    tapPromise(name: TapOptions<TapMethod.TapPromise, T, R> | string | TapCallback<TapMethod.TapPromise, T, R>, interceptor?: TapCallback<TapMethod.TapPromise, T, R>) {
        return this.invokeTap(TapMethod.TapPromise, name, interceptor);
    }

    toJSON() {
        const json = super.toJSON();
        if (json) {
            json.requestor = this.requestor;
        }
        return json;
    }
}

export class ExternalTarget<T = unknown, R = unknown> extends Target<T, R> {
    private throwOnExternalInvoke(method: string) {
        throw new Error(
            `${this.requestor} ran targets.of("${this.owner.name}").${
                this.name
            }.${method}(). Only ${
                this.owner.name
            } can invoke its own targets. ${
                this.requestor
            } can only intercept them.`
        );
    }

    // @ts-ignore
    call() {
        this.throwOnExternalInvoke('call');
    }

    callAsync() {
        this.throwOnExternalInvoke('callAsync');
    }

    async promise() {
        this.throwOnExternalInvoke('promise');
    }
}

Target.External = ExternalTarget
