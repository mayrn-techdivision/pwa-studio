import buildpackMagentoResolverPlugin, { MagentoResolverConfig } from './vite-plugin-magento-resolver';
import buildpackBuildBusPlugin from './vite-plugin-buildbus';

interface BuildpackConfig {
    magentoResolver: MagentoResolverConfig;
}

export default function buildpackPlugin({ magentoResolver }: BuildpackConfig) {
    return [buildpackMagentoResolverPlugin(magentoResolver), buildpackBuildBusPlugin()];
}
