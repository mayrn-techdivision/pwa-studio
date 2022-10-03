import { createLogger, LogLevel, Plugin } from 'vite';
import BuildBus from '../BuildBus/BuildBus';
import getSpecialFlags from '../util/getSpecialFlags';
import ModuleTransformConfig, { LoaderOptions } from '../ModuleTransformConfig';
import buildBusBabelLoader from '../loaders/buildbus-babel-loader';

export interface BuildbusConfig {
    projectName: string;
    trustedVendors?: string[];
    logLevel: LogLevel;
}

interface BabelResult {
    code: string;
    sourceMap: string;
}

// noinspection JSUnusedGlobalSymbols
export default async function buildpackBuildBusPlugin(
    {
        projectName,
        trustedVendors,
        logLevel
    }: BuildbusConfig
): Promise<Plugin> {
    // BuildBus.enableTracking();
    const logger = createLogger(logLevel);
    const bus = BuildBus.for(process.cwd(), (...args) => logger.info(args.join(' ')));
    let transforms: ModuleTransformConfig;
    let transformRequests: LoaderOptions;
    return {
        name: 'buildpack:buildbus', // required, will show up in warnings and errors
        enforce: 'pre',
        async buildStart() {
            logger.info('initializing buildbus');
            bus.reset();
            await bus.init();
            transforms = new ModuleTransformConfig(this, projectName, trustedVendors);
            // for (const file of bus.depFiles) {
            // logger.info('Watching:', file)
            // this.addWatchFile(file);
            // }

            logger.info('collecting special flags');
            const hasFlag = await getSpecialFlags({}, bus, this);
            await bus.getTargetsOf('@magento/pwa-buildpack').transformModules.promise(x => transforms.add(x));

            transformRequests = await transforms.toLoaderOptions();

            logger.info('packages with flag "esModules": ' + hasFlag('esModules'));
            logger.info('packages with flag "rootComponents": ' + hasFlag('rootComponents'));

            // logger.info(transformRequests.source['/Volumes/workspace/Experiments/pwa-studio/packages/pwa-buildpack/dist/lib/loaders/splice-source-loader.js']?.['/Volumes/workspace/Experiments/pwa-studio/packages/venia-ui/lib/RootComponents/Shimmer/types/index.js']);
        },
        async transform(code, id) {
            let transformedCode = code;
            let sourceMap = undefined;
            for (const [loaderPath, loaderTransforms] of Object.entries(transformRequests.source)) {
                const transforms = loaderTransforms[id];
                if (transforms) {
                    const loader = (await import(loaderPath)).default;
                    // logger.info(`Found transforms for "${id}" using loader "${path.basename(loaderPath)}" from:\n`, transforms!.map(req => ` - ${req.requestorFile}`).filter((value, index, self) => self.indexOf(value) === index).join('\n'));
                    const query = transforms!.map((req) => {
                        // @ts-ignore
                        this.addWatchFile(req.requestorFile);
                        return req.options;
                    });
                    transformedCode = loader.call({
                        query,
                        emitError: logger.error,
                        emitWarning: logger.warn,
                        resourcePath: id,
                        addDependency: (dep: string) => logger.info('Adding dependency: ' + dep),
                    }, transformedCode);
                }
            }
            for (const [pluginPath, requestsByFile] of Object.entries(transformRequests.babel)) {
                const transforms = requestsByFile[id];
                if (transforms) {
                    // logger.info(`Found transforms for "${id}" using loader "${path.dirname(pluginPath)}" from:\n`, requestsByFile!.map(req => ` - ${req.requestorFile}`).filter((value, index, self) => self.indexOf(value) === index).join('\n'));
                    const query = {
                        test: id,
                        presets: ['@babel/preset-react'],
                        plugins: [[pluginPath, { requestsByFile }]],
                        sourceMaps: true,
                        sourceFileName: id,
                    };

                    const babelResult = await new Promise<BabelResult>((resolve, reject) => {
                        buildBusBabelLoader.call({
                            query,
                            emitError: logger.error,
                            emitWarning: logger.warn,
                            resourcePath: id,
                            addDependency: (dep: string) => logger.info('Adding dependency: ' + dep),
                            async: () => (error?: Error, result?: string, babelSourceMap?: string) => {
                                if (error || !result || !babelSourceMap) {
                                    reject(error ?? 'An unknown error occurred while trying to perform babel transforms.');
                                    return;
                                }
                                resolve({ code: result, sourceMap: babelSourceMap });
                            }
                        }, transformedCode);
                    });

                    try {
                        transformedCode = babelResult.code;
                        sourceMap = babelResult.sourceMap;
                    } catch (error) {
                        logger.error(`[Buildpack:BuildBus] Error while performing Babel transform for "${id}":` + error);
                    }
                }
            }
            if (code !== transformedCode) {
                return {
                    code: transformedCode,
                    map: sourceMap ?? { mappings: '' }
                };
            }
        },
        async watchChange(id) {
            if (bus.depFiles.includes(id)) {
                logger.info('depFile changed: ' + id);
            } else {
                logger.info('file changed: ' + id);
            }
        }
    };
}
