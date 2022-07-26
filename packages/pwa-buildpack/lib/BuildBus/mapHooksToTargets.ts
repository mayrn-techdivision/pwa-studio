import * as Tapable from 'tapable';
import { AnyTapable, SyncOrAsyncTapable } from './types';

/**
 * The names of Tapable hooks, but without "Hook" on the end.
 * We hide the "Hook" name a little because its name overlaps
 * with React Hooks in a confusing way.
 * @private
 */
const allowedTargetTypes = [
    'Sync',
    'SyncBail',
    'SyncWaterfall',
    'SyncLoop',
    'AsyncParallel',
    'AsyncParallelBail',
    'AsyncSeries',
    'AsyncSeriesBail',
    'AsyncSeriesWaterfall'
] as const;

type AllowedTargetTypeName = typeof allowedTargetTypes[number]
/**
 * Map of Tapable hook classes to the 'Hook'-free target names in
 * `allowedTargetTypes`
 * @private
 */

type HookNameFor<T extends AllowedTargetTypeName> = `${T}Hook`

type AllowedTargetType<T extends AllowedTargetTypeName> = (typeof Tapable)[HookNameFor<T>];

type TypesDictionary<K extends AllowedTargetTypeName> = {
    [key in K]: AllowedTargetType<key>;
}

// Populate the validator map and type dictionary
const getAllowedTargets = () => {
    const validTypes = new Map<AllowedTargetType<AllowedTargetTypeName>, AllowedTargetTypeName>();
    const types = Object.fromEntries(allowedTargetTypes.map(type => {
        const typeHookName: HookNameFor<typeof type> = `${type}Hook`;
        const HookConstructor = Tapable[typeHookName];
        validTypes.set(HookConstructor, type);
        return [type, HookConstructor];
    })) as TypesDictionary<AllowedTargetTypeName>;
    return { validTypes, types };
};

export const {
    /**
     * Map of Tapable hook classes to the 'Hook'-free target names in
     * `allowedTargetTypes`
     * @private
     */
    validTypes: VALID_TYPES,
    /**
     * Dictionary of Tapable Hook classes to expose under these new names.
     * @type {Object.<string,Tapable.Hook>}
     * @see [Tapable]{@link https://github.com/webpack/tapable}
     */
    types
} = getAllowedTargets();

/**
 * Duck typing for async hooks
 * @private
 */
const hasAsyncHookInterface = (hook: Record<keyof Tapable.AsyncHook<unknown, unknown>, unknown>): hook is Tapable.AsyncHook<unknown, unknown> =>
    typeof hook.tapAsync === 'function' &&
    typeof hook.tapPromise === 'function' &&
    typeof hook.callAsync === 'function' &&
    typeof hook.promise === 'function';

/**
 * Duck typing for sync hooks
 * @private
 */
const hasSyncHookInterface = (hook: Record<keyof Tapable.SyncHook<unknown>, unknown>): hook is Tapable.SyncHook<unknown> =>
    typeof hook.tap === 'function' && typeof hook.call === 'function';

const isObject = (hookLike: unknown): hookLike is Record<string, unknown> =>
    hookLike != null && typeof hookLike === 'object';

const isHookLike = (hookLike: Record<keyof Tapable.Hook<unknown, unknown>, unknown>) =>
    typeof hookLike.intercept === 'function';

/**
 * Use duck typing to validate that the passed object seems like a Tapable hook.
 * More robust than doing `instanceof` checks; allows hooks to be proxied and
 * otherwise hacked by dependencies.
 * @param {object} hookLike - Does it look and act like a Tapable hook?
 * @returns {boolean} True if the object looks like a Tapable hook. False otherwise.
 */
export const appearsToBeTapable = (hookLike: unknown): hookLike is AnyTapable => {
    if (!isObject(hookLike)) {
        console.log('The hook does not appear to be to be an object', hookLike);
        return false
    } else if (!isHookLike(hookLike)) {
        console.log('The hook does not appear to be hook like', hookLike);
        return false
    } else if (!hasSyncHookInterface(hookLike) && !hasAsyncHookInterface(hookLike)) {
        console.log('The hook does not appear to have a sync or async interface', hookLike);
        return false;
    }
    return true;
};

export const isAsyncTapable = (tapable: SyncOrAsyncTapable): tapable is Tapable.AsyncHook<unknown, unknown> =>
    isObject(tapable) &&
    hasAsyncHookInterface(tapable as Record<string, unknown>);

export const isSyncTapable = (tapable: SyncOrAsyncTapable): tapable is Tapable.SyncHook<unknown, unknown> =>
    isObject(tapable) &&
    hasSyncHookInterface(tapable as Record<string, unknown>);
/**
 * Get the string type name of a provided object. If it is one of the base
 * Tapable Hooks supported, returns the name of that Hook (without 'Hook' on
 * the end). Otherwise, returns `<unknown>`.
 *
 * @param {object} hook Potential Tapable hook object
 *
 * @returns {string} The name of the hook without 'Hook' on the end or `<unknown>`
 */
export const getTapableType = (hook: AnyTapable | Tapable.Hook<unknown, unknown>) => VALID_TYPES.get(hook.constructor as AllowedTargetType<AllowedTargetTypeName>) ?? '<unknown>' as const;

export type TapableType = ReturnType<typeof getTapableType>;
