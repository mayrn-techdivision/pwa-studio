import TargetableModule from './TargetableModule';
import TargetableESModule from './TargetableESModule';
import TargetableESModuleArray from './TargetableESModuleArray';
import TargetableESModuleObject from './TargetableESModuleObject';
import { Buildpack } from './targets';
import TargetProvider from '../BuildBus/TargetProvider';
import Targetables from './Targetables';
import TargetableReactComponent from './TargetableReactComponent';
import EnvVarDefinition = Buildpack.EnvVarDefinition;
import SpecialFeatures = Buildpack.SpecialFeatures;

// const types = {
//     ReactComponent: require('./TargetableReactComponent')
// };

type TargetableCls<I extends TargetableModule
    = TargetableModule> = new(...args: ConstructorParameters<typeof TargetableModule>) => I;

type PublishCallback = (...args: unknown[]) => unknown;

type Publisher = {
    publish: PublishCallback
} | PublishCallback;

interface ModuleConfig {
    module: string;
    publish: PublishCallback;
}

type Extant = [TargetableModule, ModuleConfig];

/**
 * A factory and manager for Targetable instances.
 * This class wraps around a TargetProvider, which identifies it as "your"
 * Targetable and enables automatic interception of targets.
 */
export default class TargetableSet extends Targetables<'@magento/pwa-buildpack'> {
    static Module = TargetableModule;
    static ESModule = TargetableESModule;
    static ESModuleArray = TargetableESModuleArray;
    static ESModuleObject = TargetableESModuleObject;
    static ReactComponent = TargetableReactComponent;

    private _connectedFiles: Map<string, Extant> = new Map();

    /**
     * Creates a new TargetableSet bound to a TargetProvider
     *
     * @param {TargetProvider} targets - TargetProvider for the current dependency. This is the object passed by BuildBus to an intercept function.
     * @returns {TargetableSet}
     */
    static using(targets: TargetProvider) {
        return new TargetableSet(targets);
    }

    /** @hideconstructor  */
    constructor(targetProvider: TargetProvider) {
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
    module(modulePath: string, publisher: Publisher) {
        return this._provide(TargetableSet.Module, modulePath, publisher);
    }

    /**
     * @param {string} modulePath - Path to the module file this Targetable represents.
     * @param {TargetablePublisher} [publisher] - Callback function to execute when this module
     * is about to commit its requested transforms to a build. If this function is passed,
     * the module will automatically bind to `builtins.transformModules`.
     * @returns {TargetableESModule} Returns an instance of TargetableESModule.
     */
    esModule(modulePath: string, publisher: Publisher) {
        return this._provide(TargetableSet.ESModule, modulePath, publisher);
    }

    /**
     * @param {string} modulePath - Path to the module file this Targetable represents.
     * @param {TargetablePublisher} [publisher] - Callback function to execute when this module
     * is about to commit its requested transforms to a build. If this function is passed,
     * the module will automatically bind to `builtins.transformModules`.
     * @returns {TargetableESModuleArray} Returns an instance of TargetableESModuleArray.
     */
    esModuleArray(modulePath: string, publisher: Publisher) {
        return this._provide(TargetableSet.ESModuleArray, modulePath, publisher);
    }

    /**
     * @param {string} modulePath - Path to the module file this Targetable represents.
     * @param {TargetablePublisher} [publisher] - Callback function to execute when this module
     * is about to commit its requested transforms to a build. If this function is passed,
     * the module will automatically bind to `builtins.transformModules`.
     * @returns {TargetableESModuleObject} Returns an instance of TargetableESModuleObject.
     */
    esModuleObject(modulePath: string, publisher: Publisher) {
        return this._provide(TargetableSet.ESModuleObject, modulePath, publisher);
    }

    /**
     * @param {string} modulePath - Path to the module file this Targetable represents.
     * @param {TargetablePublisher} [publisher] - Callback function to execute when this module
     * is about to commit its requested transforms to a build. If this function is passed,
     * the module will automatically bind to `builtins.transformModules`.
     * @returns {TargetableReactComponent} Returns an instance of TargetableReactComponent
     */
    reactComponent(modulePath: string, publisher: Publisher) {
        return this._provide(TargetableSet.ReactComponent, modulePath, publisher);
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

    _normalizeConfig(modulePathOrConfig: string | ModuleConfig, publisher: Publisher): ModuleConfig {
        return typeof modulePathOrConfig === 'string'
            ? {
                module: modulePathOrConfig,
                publish: typeof publisher === 'function' ? publisher : publisher.publish
            }
            : modulePathOrConfig;
    }

    _provide<T extends TargetableModule = TargetableModule>(Targetable: TargetableCls<T>, modulePath: string, publisher: Publisher) {
        const config = this._normalizeConfig(modulePath, publisher);
        let extant = this._connectedFiles.get(config.module);
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
            `Cannot target the file "${modulePath}" using "${
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
