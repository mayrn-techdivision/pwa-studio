import { Plugin } from 'vite';
import BuildBus from '../BuildBus/BuildBus';
import getSpecialFlags from '../util/getSpecialFlags';
import { Console } from 'console';

const logger = new Console({ stdout: process.stdout, groupIndentation: 2 })
// noinspection JSUnusedGlobalSymbols
export default async function buildpackBuildBusPlugin(): Promise<Plugin> {
    // BuildBus.enableTracking();
    const bus = BuildBus.for(process.cwd(), logger.log);
    return {
        name: 'buildpack:buildbus', // required, will show up in warnings and errors
        async buildStart() {
            logger.log('initializing buildbus')
            await bus.init();
            for (const file of bus.depFiles) {
                this.addWatchFile(file);
            }
            logger.log('collecting special flags')
            const hasFlag = await getSpecialFlags({}, bus, this);
            logger.log('packages with flag "esModules":', hasFlag('esModules'));
        }
    };
}
