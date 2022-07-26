// import * as path from 'path';
// import * as fs from 'fs';
import { Plugin, loadEnv } from 'vite';
import 'promise-any-polyfill';

export interface MagentoResolverConfig {
    envDir: string;
    mode: string;
}

export default async function buildpackMagentoResolverPlugin({ mode, envDir }: MagentoResolverConfig): Promise<Plugin> {
    const env = await loadEnv(mode, envDir);
    const isAdobeCommerce = env.MAGENTO_BACKEND_EDITION === 'AC';
    const versionExtensions = (isAdobeCommerce ? ['ac', 'ee'] : ['mos', 'ce']);

    return {
        name: 'buildpack:magento-resolver',
        async resolveId(source, importer, options) {
            try {
                const actualSource = await Promise.any(
                    versionExtensions.map(ext => {
                        const magentoSource = `${source}.${ext}`;
                        return this.resolve(magentoSource, importer, {
                            ...options, skipSelf: true
                        }).then((result) => {
                            if (!result) {
                                throw new Error('Could not resolve');
                            }
                            return result;
                        });
                    })
                );

                console.log('[Buildpack:MagentoResolver] Found', actualSource.id, 'from', importer);
                return actualSource;
            } catch (error) {
                return;
            }
        }
    };
}
