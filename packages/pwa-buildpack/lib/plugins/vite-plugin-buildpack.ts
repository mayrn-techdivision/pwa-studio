import buildpackMagentoResolverPlugin, { MagentoResolverConfig } from './vite-plugin-magento-resolver';
import buildpackBuildBusPlugin, { BuildbusConfig } from './vite-plugin-buildbus';
import buildpackUPWARDServerPlugin from './vite-plugin-upward-server';

interface BuildpackConfig {
    magentoResolver: MagentoResolverConfig;
    buildbus: BuildbusConfig
}

export default function buildpackPlugin({ magentoResolver, buildbus }: BuildpackConfig) {
    return [buildpackMagentoResolverPlugin(magentoResolver), buildpackBuildBusPlugin(buildbus), buildpackUPWARDServerPlugin()];
}
