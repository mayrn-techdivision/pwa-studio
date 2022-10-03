import Trackable from './Trackable';
import { appearsToBeTapable, getTapableType, types } from './mapHooksToTargets';
import BuildBus from './BuildBus';
import { AnyTapable, Phase, SyncOrAsyncTapable } from './types';
import Target, { ExternalTarget } from './Target';
import { Buildpack } from '../targetables/targets';

export interface TargetProviderInterface {
    phase: Phase | null;
    name: string;
    declare: (declarations: Record<string, SyncOrAsyncTapable>) => void;
    of: (depName: string) => void;
}

type GetExternalTargets = BuildBus['requestTargets'];
export type UndefinedTargets = Record<string, Target>;
export type DefinedTargets<T extends keyof Buildpack.Targets> = Buildpack.Targets[T];
export type TargetsId = string|keyof Buildpack.Targets;
export type Targets<T extends TargetsId> = T extends keyof Buildpack.Targets ? DefinedTargets<T> : UndefinedTargets;

export type Declarations = Record<string, SyncOrAsyncTapable>

const isSameTargetsId = <T extends TargetsId>(targetProvider: TargetProvider, name: T): targetProvider is TargetProvider<T> => {
    return targetProvider.name === name;
}

export default class TargetProvider<N extends TargetsId = string> extends Trackable implements TargetProviderInterface {
    /**
     * The phase currently being executed. Either `declare` or `intercept`.
     */
    phase: Phase | null;
    file: string | null;
    name: N;
    types = types;
    private readonly getExternalTargets: GetExternalTargets;
    tapables: Record<string, AnyTapable> = {};
    private intercepted: Record<string, UndefinedTargets> = {};
    /**
     * The targets this package has declared in the `declare` phase.
     */
    own: Targets<N> = {} as Targets<N>;

    constructor(bus: BuildBus, depName: N, getExternalTargets: GetExternalTargets) {
        super();
        this.attach(depName, bus);
        this.getExternalTargets = getExternalTargets;
        this.name = depName;
        this.phase = null;
        this.file = null;
    }

    linkTarget(requestor: TargetProvider, targetName: string, tapable: AnyTapable): Target|ExternalTarget {
        const TargetClass = requestor === this ? Target : Target.External;
        return new TargetClass(
            this,
            requestor,
            targetName,
            getTapableType(tapable),
            tapable
        );
    }

    declare<T extends Declarations>(declarations: T): T {
        if (this.phase !== Phase.Declare) {
            this.track('warning', {
                type: 'lifecycle',
                message: `ran declare() in the "${this.phase}" phase. Be sure this is what you want to do; other packages that expect to intercept these targets may never see them.`
            });
        }
        for (const [targetName, hook] of Object.entries(declarations)) {
            if (!appearsToBeTapable(hook)) {
                throw new Error(
                    `Package "${
                        this.name
                    }" declared target "${targetName}" with an invalid target type "${{}.toString.call(
                        hook
                    )}". Make sure you are not using a different version or instance of the Tapable library to declare your targets.`
                );
            }
            this.track('declare', {
                targetName,
                tapableType: getTapableType(hook)
            });
            this.tapables[targetName] = hook;
            // @ts-ignore
            this.own[targetName] = this.linkTarget(this, targetName, hook);
        }
        return declarations;
    }

    of<T extends TargetsId>(depName: T): Targets<T> {
        if (this.phase !== Phase.Intercept) {
            this.track(
                'warning',

                {
                    type: 'lifecycle',
                    message: `ran of(${depName}) in the "${
                        this.phase
                    }" phase. Be sure this is what you want to do; outside the intercept phase, this behavior is not guaranteed.`
                }
            );
        }

        // need a special type predicate here, otherwise TS will complain that T and N might not overlap
        if (isSameTargetsId(this, depName)) {
            return this.own;
        }

        if (!this.intercepted[depName]) {
            this.intercepted[depName] = this.getExternalTargets(
                this,
                depName
            );
        }
        // necessary typecast because TS doesn't recognize that we've just set this property and thinks it could be undefined
        return this.intercepted[depName] as Targets<T>;
    }

}
