import { Plugin } from 'vite';
import BuildBus from '../BuildBus/BuildBus';
import getSpecialFlags from '../util/getSpecialFlags';
import { Console } from 'console';
import ModuleTransformConfig from '../ModuleTransformConfig';

const logger = new Console({ stdout: process.stdout, groupIndentation: 2 });

export interface BuildbusConfig {
    projectName: string;
    trustedVendors?: string[];
}

// noinspection JSUnusedGlobalSymbols
export default async function buildpackBuildBusPlugin({projectName, trustedVendors}: BuildbusConfig): Promise<Plugin> {
    // BuildBus.enableTracking();
    const bus = BuildBus.for(process.cwd(), logger.log);
    let transforms: ModuleTransformConfig;
    return {
        name: 'buildpack:buildbus', // required, will show up in warnings and errors
        async buildStart() {
            logger.log('initializing buildbus');
            await bus.init();
            transforms = new ModuleTransformConfig(this, projectName, trustedVendors);
            for (const file of bus.depFiles) {
                this.addWatchFile(file);
            }

            logger.log('collecting special flags');
            const hasFlag = await getSpecialFlags({}, bus, this);
            await bus.getTargetsOf('@magento/pwa-buildpack').transformModules.promise(x => transforms.add(x));

            const transformRequests = await transforms.toLoaderOptions();

            logger.log('packages with flag "esModules":', hasFlag('esModules'));
        }
    };
}
