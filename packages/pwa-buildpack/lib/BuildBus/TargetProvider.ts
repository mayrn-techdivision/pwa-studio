import Trackable from './Trackable';
import { appearsToBeTapable, getTapableType, types } from './mapHooksToTargets';
import BuildBus from './BuildBus';
import { AnyTapable, Phase, SyncOrAsyncTapable } from './types';
import Target from './Target';
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

export default class TargetProvider extends Trackable implements TargetProviderInterface {
    /**
     * The phase currently being executed. Either `declare` or `intercept`.
     */
    phase: Phase | null;
    file: string | null;
    name: string;
    types = types;
    private readonly getExternalTargets: GetExternalTargets;
    tapables: Record<string, AnyTapable> = {};
    private intercepted: Record<string, UndefinedTargets> = {};
    /**
     * The targets this package has declared in the `declare` phase.
     */
    own: UndefinedTargets = {};

    constructor(bus: BuildBus, depName: string, getExternalTargets: GetExternalTargets) {
        super();
        this.attach(depName, bus);
        this.getExternalTargets = getExternalTargets;
        this.name = depName;
        this.phase = null;
        this.file = null;
    }

    linkTarget(requestor: TargetProvider, targetName: string, tapable: AnyTapable) {
        const TargetClass = requestor === this? Target : Target.External;
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
        if (depName === this.name) {
            return this.own as Targets<T>;
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
