import { AsyncHook, Hook, SyncHook } from 'tapable';
import { TargetProviderInterface } from './TargetProvider';

export enum Phase {
    Declare = 'declare',
    Intercept = 'intercept'
}

export enum TapMethod {
    Tap = 'tap',
    TapAsync = 'tapAsync',
    TapPromise = 'tapPromise'
}

export type Dep<T extends Phase> = Record<'name' | T, string>;

export interface Targetable {
    default: (targets: TargetProviderInterface) => void;
}

export type CompleteHook<T, R> = Pick<Hook<T, R> & AsyncHook<T, R> & SyncHook<T, R>, 'tap' | 'tapAsync' | 'tapPromise' | 'intercept' | 'promise' | 'call' | 'callAsync'>;

export type AnyTapable = CompleteHook<unknown[], unknown>;

export type TapCallback<M extends TapMethod, T = unknown, R = unknown> = Parameters<CompleteHook<T, R>[M]>[1];


export interface TapOptions<M extends TapMethod, T = unknown, R = unknown> {
    name: string;
    fn: TapCallback<M, T, R>;
}

export interface InvokeTapOptions<M extends TapMethod, T = unknown, R = unknown> extends TapOptions<M, T, R> {
    file: string;
}

// type TapMethod = (options: TapOptions, fn?: TapCallback) => void

export type TapableCallback = (...returned: unknown[]) => void;

export type SyncOrAsyncTapable = Hook<unknown, unknown> | AsyncHook<unknown, unknown> | SyncHook<unknown, unknown>;
