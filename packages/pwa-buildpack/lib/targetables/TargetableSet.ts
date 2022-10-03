import TargetableModule from './TargetableModule';
import TargetableESModule from './TargetableESModule';
import TargetableESModuleArray from './TargetableESModuleArray';
import TargetableESModuleObject from './TargetableESModuleObject';
import { Buildpack } from './targets';
import TargetProvider, { TargetsId, Targets } from '../BuildBus/TargetProvider';
import Targetables from './Targetables';
import TargetableReactComponent from './TargetableReactComponent';
import EnvVarDefinition = Buildpack.EnvVarDefinition;
import SpecialFeatures = Buildpack.SpecialFeatures;
import TargetableLazyModuleObject from './TargetableLazyModuleObject';

// const types = {
//     ReactComponent: require('./TargetableReactComponent')
// };

type TargetableCls<T extends TargetableModule
    = TargetableModule> = new(...args: ConstructorParameters<typeof TargetableModule>) => T;

type PublishCallback<T extends TargetableModule = TargetableModule, N extends TargetsId = string> = (this: T, ownTargets: Targets<N>, self: T) => unknown;

type Publisher<T extends TargetableModule = TargetableModule, N extends TargetsId = string> = {
    publish: PublishCallback<T, N>
} | PublishCallback<T, N>;

interface ModuleConfig<T extends TargetableModule = TargetableModule, N extends TargetsId = string> {
    module: string;
    publish: PublishCallback<T, N>;
}

type ModuleConfigParams<T extends TargetableModule, N extends TargetsId = string> = [string, Publisher<T, N>] | [ModuleConfig<T, N>];

type Extant<T extends TargetableModule = TargetableModule, N extends TargetsId = string> = [T, ModuleConfig<T, N>];

/**
 * A factory and manager for Targetable instances.
 * This class wraps around a TargetProvider, which identifies it as "your"
 * Targetable and enables automatic interception of targets.
 */
export default class TargetableSet<N extends TargetsId = string> extends Targetables<'@magento/pwa-buildpack', N> {
    static Module = TargetableModule;
    static ESModule = TargetableESModule;
    static ESModuleArray = TargetableESModuleArray;
    static ESModuleObject = TargetableESModuleObject;
    static ReactComponent = TargetableReactComponent;
    static LazyModuleObject = TargetableLazyModuleObject;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _connectedFiles: Map<string, Extant<any>> = new Map();

    /**
     * Creates a new TargetableSet bound to a TargetProvider
     *
     * @param {TargetProvider} targets - TargetProvider for the current dependency. This is the object passed by BuildBus to an intercept function.
     * @returns {TargetableSet}
     */
    static using<N extends TargetsId = string>(targets: TargetProvider<N>) {
        return new TargetableSet(targets);
    }

    /** @hideconstructor  */
    constructor(targetProvider: TargetProvider<N>) {
        super(targetProvider, '@magento/pwa-buildpack');
        this._bind();
    }

    /**
     * @param {string} modulePath - Path to the module file this Targetable represents.
     * @param {TargetablePublisher} [publisher] - Callback function to execute when this module
     * is about to commit its requested transforms to a build. If this function is passed,
     * the module will automatically bind to `builtins.transformModules`.
     * @returns {TargetableModule} Returns an instance of TargetableModule.
     */
    module(...configParams: ModuleConfigParams<TargetableModule, N>) {
        return this._provide(TargetableSet.Module, ...configParams);
    }

    /**
     * @param {string} modulePath - Path to the module file this Targetable represents.
     * @param {TargetablePublisher} [publisher] - Callback function to execute when this module
     * is about to commit its requested transforms to a build. If this function is passed,
     * the module will automatically bind to `builtins.transformModules`.
     * @returns {TargetableESModule} Returns an instance of TargetableESModule.
     */
    esModule(...configParams: ModuleConfigParams<TargetableESModule, N>) {
        return this._provide(TargetableSet.ESModule, ...configParams);
    }

    /**
     * @param {string} modulePath - Path to the module file this Targetable represents.
     * @param {TargetablePublisher} [publisher] - Callback function to execute when this module
     * is about to commit its requested transforms to a build. If this function is passed,
     * the module will automatically bind to `builtins.transformModules`.
     * @returns {TargetableESModuleArray} Returns an instance of TargetableESModuleArray.
     */
    esModuleArray(...configParams: ModuleConfigParams<TargetableESModuleArray, N>) {
        return this._provide(TargetableSet.ESModuleArray, ...configParams);
    }

    /**
     * @param {string} modulePath - Path to the module file this Targetable represents.
     * @param {TargetablePublisher} [publisher] - Callback function to execute when this module
     * is about to commit its requested transforms to a build. If this function is passed,
     * the module will automatically bind to `builtins.transformModules`.
     * @returns {TargetableESModuleObject} Returns an instance of TargetableESModuleObject.
     */
    esModuleObject(...configParams: ModuleConfigParams<TargetableESModuleObject, N>) {
        return this._provide(TargetableSet.ESModuleObject, ...configParams);
    }

    /**
     * @param {string} modulePath - Path to the module file this Targetable represents.
     * @param {TargetablePublisher} [publisher] - Callback function to execute when this module
     * is about to commit its requested transforms to a build. If this function is passed,
     * the module will automatically bind to `builtins.transformModules`.
     * @returns {TargetableReactComponent} Returns an instance of TargetableReactComponent
     */
    reactComponent(...configParams: ModuleConfigParams<TargetableReactComponent, N>) {
        return this._provide(TargetableSet.ReactComponent, ...configParams);
    }


    /**
     * @param {string} modulePath - Path to the module file this Targetable represents.
     * @param {TargetablePublisher} [publisher] - Callback function to execute when this module
     * is about to commit its requested transforms to a build. If this function is passed,
     * the module will automatically bind to `builtins.transformModules`.
     * @returns {TargetableESModuleObject} Returns an instance of TargetableESModuleObject.
     */
    lazyModuleObject(...configParams: ModuleConfigParams<TargetableLazyModuleObject, N>) {
        return this._provide(TargetableSet.LazyModuleObject, ...configParams);
    }


    //
    // /**
    //  * Taps the builtin `specialFeatures` target and sets the supplied feature flags.
    //  *
    //  * @param {...(string|string[]|object<string,boolean>)} Feature flags to set, as either string arguments, an array of string arguments, or an object of flags.
    //  */
    setSpecialFeatures(...featureArgs: (keyof SpecialFeatures | (keyof SpecialFeatures)[] | SpecialFeatures)[]) {
        const owner = this.owner;

        // support args list, array of args, and flags object
        const flags = featureArgs.reduce<SpecialFeatures>((flagObj, arg) => {
            const setFlag = (name: keyof SpecialFeatures) => {
                flagObj[name] = true;
            };
            if (typeof arg === 'string') {
                setFlag(arg as keyof SpecialFeatures);
            } else if (Array.isArray(arg)) {
                arg.forEach(setFlag);
            } else {
                Object.assign(flagObj, arg);
            }
            return flagObj;
        }, {});

        this.targets.specialFeatures.tap(features => {
            features[owner] = Object.assign(features[owner] ?? {}, flags);
        });
    }

    /**
     * Tap the builtin `envVarDefinitions` target to define new environment variables.
     *
     * @param {string} sectionName - Human-readable name of section. If a
     * section with this name exists already, variables will be added to it
     * instead o a new section being created.
     * @param {EnvVarDefinition[]} variables - List of variables to add.
     */
    defineEnvVars(sectionName: string, variableDefs: EnvVarDefinition[]) {
        this.targets.envVarDefinitions.tap(defs => {
            let mySection = defs.sections.find(
                section => section.name === sectionName
            );
            if (!mySection) {
                mySection = { name: sectionName, variables: [] };
                defs.sections.push(mySection);
            }
            mySection.variables.push(...variableDefs);
        });
    }

    _bind() {
        this.targets.transformModules.tapPromise(
            'TargetableSet',
            async addTransform => {
                for (const [
                    instance,
                    config
                ] of this._connectedFiles.values()) {
                    if (typeof config.publish === 'function') {
                        await config.publish.call(
                            instance,
                            this.targetProvider.own,
                            instance
                        );
                    }
                    instance.flush().forEach(addTransform);
                }
            }
        );
    }

    _normalizeConfig<T extends TargetableModule>(...configParams: ModuleConfigParams<T, N>): ModuleConfig<T, N> {
        if (typeof configParams[0] !== 'string') {
            return configParams[0];
        }
        const [modulePath, publisher] = configParams as [string, Publisher<T>];
        return {
            module: modulePath,
            publish: typeof publisher === 'function' ? publisher : publisher.publish
        }
    }

    _provide<T extends TargetableModule>(Targetable: TargetableCls<T>, ...configParams: ModuleConfigParams<T, N>) {
        const config = this._normalizeConfig(...configParams);
        let extant = this._connectedFiles.get(config.module) as Extant<T, N>|undefined;
        if (!extant) {
            const targetable = new Targetable(
                config.module,
                this.targetProvider
            );
            extant = [targetable, config];
            this._connectedFiles.set(config.module, extant);
        }
        const [instance] = extant;
        if (instance instanceof Targetable) {
            return instance;
        }
        throw new Error(
            `Cannot target the file "${config.module}" using "${
                Targetable.name
            }", because it has already been targeted by the ${
                instance.constructor.name
            } created by "${this.targetProvider.name}".`
        );
    }
}

/** Type definitions related to: TargetableSet */

/**
 * Callback function which runs before committing this module's list of requested transforms to the build. Invoked as an intercept to `builtins.transformModules`, this is the typical time to invoke your own target with your custom API.
 *
 * @callback TargetablePublisher
 * @this {TargetableModule}
 * @param {TargetableModule} self - The TargetableModule instance (for use if `this` is not available)
 *
 */
