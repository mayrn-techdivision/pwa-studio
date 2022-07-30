import pertain from 'pertain';
import TargetProvider, { Targets, TargetsId } from './TargetProvider';
import { Dep, Phase, Targetable } from './types';
import Trackable, { OutCallback } from './Trackable';
import Target from './Target';
import path from 'path';

const packageJsonPath = (phase: Phase) => {
    return `pwa-studio.targets.${phase}` as const;
};

const isModuleWithDefaultExport = (module: unknown): module is Record<'default', unknown> =>
    module != null && typeof module === 'object' && module.hasOwnProperty('default');

const isTargetable = (targetable: unknown): targetable is Targetable => {
    if (isModuleWithDefaultExport(targetable) && typeof targetable.default === 'function') {
        return true;
    }
    console.log('targetable is not a function', targetable);
    return false;
};

/**
 * @ignore
 * A given project root (context) should always produce the same bus, so we can
 * cache the heavy pertain operation.
 */
const busCache = new Map<string, BuildBus>();

/**
 * @ignore
 * A way to strongly encourage users to use the BuildBus.for factory and not the
 * BuildBus constructor.
 */
const INVOKE_FLAG = Symbol.for('FORCE_BUILDBUS_CREATE_FACTORY');

export default class BuildBus extends Trackable {
    /**
     * The project root of the build bus.
     */
    private context: string;
    private additionalDeps: string[];
    private hasRun = new Set<Phase>();
    private targetProviders = new Map<string, TargetProvider>();
    public depFiles: string[] = [];

    /**
     * Remove the cached BuildBus for the given context.
     *
     * @static
     * @param {string} context - Root directory whose BuildBus to delete.
     */
    static clear(context: string) {
        const absContext = path.resolve(context);
        busCache.delete(absContext);
    }

    /**
     * Remove all cached BuildBus objects.
     *
     * @static
     */
    static clearAll() {
        busCache.clear();
    }

    /**
     * Get or create the BuildBus for the given context.
     * This factory is the supported way to construct BuildBus instances.
     * It caches the instances and connects them to the logging infrastructure.
     *
     * Only one BuildBus is active for a project root directory (context) at any given time.
     * This way, Buildpack code can retrieve the BuildBus for a context even if the bus
     * instance hasn't been sent as a parameter.
     *
     * @example <caption>Get or create the BuildBus for the package.json file in `./project-dir`, then bind targets, then call a target.</caption>
     * ```js
     * const bus = BuildBus.for('./project-dir);
     * bus.init();
     * bus.getTargetsOf('my-extension').myTarget.call();
     * ```
     *
     * @param {string} context - Root directory of the BuildBus to get or create.
     * @param trackingOwner
     * @returns {BuildBus}
     */
    static for(context: string, trackingOwner?: Trackable | OutCallback) {
        const absContext = path.resolve(context);
        const cached = busCache.get(absContext);
        if (cached) {
            return cached;
        }
        const bus = new BuildBus(INVOKE_FLAG, absContext);
        busCache.set(absContext, bus);
        bus.attach(context, trackingOwner ?? console.log);
        return bus;
    }

    private constructor(invoker: typeof INVOKE_FLAG | unknown, context: string) {
        super();
        if (invoker !== INVOKE_FLAG) {
            throw new Error(
                `BuildBus must not be created with its constructor. Use the static factory method BuildBus.for(context) instead.`
            );
        }
        this.requestTargets = this.requestTargets.bind(this);
        this.context = context;
        this.additionalDeps = this.getEnvOverrides();
    }

    /** @private */
    getEnvOverrides() {
        const envDepsAdditional = process.env.BUILDBUS_DEPS_ADDITIONAL;
        return envDepsAdditional?.split(',') ?? [];
    }

    /**
     * Get {@link TargetProvider} for the given named dependency. Use this to
     * retrieve and run targets in top-level code, when you have a reference to
     * the BuildBus. Declare and intercept functions should not, and cannot,
     * use this method. Instead, they retrieve external targets through their
     * `targets.of()` methods.
     *
     * @param {string} depName - Dependency whose targets to retrieve.
     * @returns {Object.<string, Target>} TargetProvider for the dependency.
     */
    getTargetsOf<T extends TargetsId>(depName: T) {
        return this.getTargets(depName).own as Targets<T>;
    }

    async init() {
        await this.runPhase(Phase.Declare);
        await this.runPhase(Phase.Intercept);
    }

    /**
     * Run the specified phase. The BuildBus finds all dependencies which say
     * in their `package.json` that they need to run code in this phase.
     *
     * @example <caption>Find all dependencies whith have `pwa-studio: { targets: { declare: './path/to/js' }} defined, and run those functions.
     * bus.runPhase('declare')
     *
     * @param {string} phase 'declare' or 'intercept'
     */
    async runPhase<P extends Phase>(phase: P) {
        if (this.hasRun.has(phase)) {
            return;
        }
        this.hasRun.add(phase);
        this.track('runPhase', { phase });
        console.group(`running phase "${phase}"`);
        const pertaining = this.getPertaining(phase);
        for (const dep of pertaining) {
            // if (dep.name !== '@magento/pwa-buildpack') {
            //     continue;
            // }
            console.log(`loading target provider for "${dep.name}"`);
            let targetProvider = this.targetProviders.get(dep.name);
            if (!targetProvider) {
                targetProvider = new TargetProvider(
                    this,
                    dep.name,
                    this.requestTargets
                );
                this.targetProviders.set(dep.name, targetProvider);
            }
            targetProvider.phase = phase;
            targetProvider.file = dep[phase];
            this.track('loadDep', { phase, dep });
            const targetable = await import(dep[phase]);
            if (isTargetable(targetable)) {
                console.log(`${phase}ing targets for "${dep.name}"`);
                targetable.default(targetProvider);
                this.depFiles.push(dep[phase]);
            }
            targetProvider.phase = null;
            targetProvider.file = null;
        }
        console.groupEnd();
    }

    private getTargets(depName: string) {
        const targetProvider = this.targetProviders.get(depName);
        if (!targetProvider) {
            throw new Error(
                `${
                    this._identifier
                }: Cannot getTargetsOf("${depName}"): ${depName} has not yet declared`
            );
        }
        return targetProvider;
    }

    private requestTargets(requestor: TargetProvider, requested: string) {
        this.track('requestTargets', { source: requestor.name, requested });

        const targets: Record<string, Target> = {};
        const targetProvider = this.getTargets(requested);
        for (const [name, tapable] of Object.entries(targetProvider.tapables)) {
            targets[name] = targetProvider.linkTarget(requestor, name, tapable);
        }
        return targets;
    }

    private getPertaining<P extends Phase>(phase: P) {
        return pertain(
            this.context,
            packageJsonPath(phase),
            foundDeps => foundDeps.concat(this.additionalDeps)
        ).map(({ name, path }): Dep<P> => ({
            name,
            [phase]: path
        }) as Dep<P>);
    }
}
