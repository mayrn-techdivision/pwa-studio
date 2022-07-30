import { Plugin } from 'vite';
import BuildBus from '../BuildBus/BuildBus';
import getSpecialFlags from '../util/getSpecialFlags';
import ModuleTransformConfig, { LoaderOptions } from '../ModuleTransformConfig';
import buildBusBabelLoader from '../loaders/buildbus-babel-loader';
import path from 'path';

export interface BuildbusConfig {
    projectName: string;
    trustedVendors?: string[];
}

// noinspection JSUnusedGlobalSymbols
export default async function buildpackBuildBusPlugin(
    {
        projectName,
        trustedVendors
    }: BuildbusConfig): Promise<Plugin> {
    // BuildBus.enableTracking();
    const bus = BuildBus.for(process.cwd(), console.log);
    let transforms: ModuleTransformConfig;
    let transformRequests: LoaderOptions;
    return {
        name: 'buildpack:buildbus', // required, will show up in warnings and errors
        enforce: 'pre',
        async buildStart() {
            console.log('initializing buildbus');
            await bus.init();
            transforms = new ModuleTransformConfig(this, projectName, trustedVendors);
            // for (const file of bus.depFiles) {
            // console.log('Watching:', file)
            // this.addWatchFile(file);
            // }

            console.log('collecting special flags');
            const hasFlag = await getSpecialFlags({}, bus, this);
            await bus.getTargetsOf('@magento/pwa-buildpack').transformModules.promise(x => transforms.add(x));

            transformRequests = await transforms.toLoaderOptions();

            console.log('packages with flag "esModules":', hasFlag('esModules'));

            // console.log(transformRequests.source['/Volumes/workspace/Experiments/pwa-studio/packages/pwa-buildpack/dist/lib/loaders/splice-source-loader.js']?.['/Volumes/workspace/Experiments/pwa-studio/packages/venia-ui/lib/RootComponents/Shimmer/types/index.js']);
        },
        async transform(code, id, options) {
            let transformedCode = code;
            for (const [loaderPath, loaderTransforms] of Object.entries(transformRequests.source)) {
                const transforms = loaderTransforms[id];
                if (transforms) {
                    const loader = (await import(loaderPath)).default;
                    // console.log(`Found transforms for "${id}" using loader "${path.basename(loaderPath)}" from:\n`, transforms!.map(req => ` - ${req.requestorFile}`).filter((value, index, self) => self.indexOf(value) === index).join('\n'));
                    const query = transforms!.map((req) => {
                        // @ts-ignore
                        this.addWatchFile(req.requestorFile);
                        return req.options;
                    });
                    transformedCode = loader.call({
                        query,
                        emitError: console.error,
                        emitWarning: console.warn,
                        resourcePath: id,
                        addDependency: (dep: string) => console.log('Adding dependency: ', dep),
                    }, transformedCode);
                }
            }
            for (const [pluginPath, requestsByFile] of Object.entries(transformRequests.babel)) {
                const transforms = requestsByFile[id];
                if (transforms) {
                    // console.log(`Found transforms for "${id}" using loader "${path.dirname(pluginPath)}" from:\n`, requestsByFile!.map(req => ` - ${req.requestorFile}`).filter((value, index, self) => self.indexOf(value) === index).join('\n'));
                    const query = {
                        test: id,
                        presets: ['@babel/preset-react'],
                        plugins: [[pluginPath, { requestsByFile }]]
                    };

                    const babelPromise = new Promise<string>((resolve, reject) => {
                        buildBusBabelLoader.call({
                            query,
                            emitError: console.error,
                            emitWarning: console.warn,
                            resourcePath: id,
                            addDependency: (dep: string) => console.log('Adding dependency: ', dep),
                            async: () => (error?: Error, result?: string, maybeSourceMap?: unknown) => {
                                if (error || !result) {
                                    reject(error ?? 'An unknown error occurred while trying to perform babel transforms.');
                                    return;
                                }
                                resolve(result)
                            }
                        }, transformedCode);
                    })

                    try {
                        transformedCode = await babelPromise;
                    } catch (error) {
                        console.error(`[Buildpack:BuildBus] Error while performing Babel transform for "${id}":`, error)
                    }
                }
            }
            if (code !== transformedCode) {
                return {
                    code: transformedCode,
                    map: { mappings: '' }
                };
            }
        },
        async watchChange(id, change) {
            if (bus.depFiles.includes(id)) {
                console.log('depFile changed:', id);
            } else {
                console.log('file changed:', id);
            }
        }
    };
}
