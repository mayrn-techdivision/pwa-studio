import { defineConfig,loadEnv } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
// @ts-ignore
import { buildpackPlugin } from '@magento/pwa-buildpack';
// @ts-ignore
import packageJson from './package.json';

const importerFactory = `function () {
            return async function getLocale(locale) {
                return {}
            }
        }`;

export default defineConfig(async ({ mode }) => {
    Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
    // @ts-ignore
    const { getMediaURL, getStoreConfigData, getAvailableStoresConfigData, getPossibleTypes } = await import('@magento/pwa-buildpack/lib/Utilities/graphQL.js');

    const mediaUrl = await getMediaURL();
    const storeConfigData = await getStoreConfigData();
    const { availableStores } = await getAvailableStoresConfigData();

    /**
     * Loop the available stores when there is provided STORE_VIEW_CODE
     * in the .env file, because should set the store name from the
     * given store code instead of the default one.
     */
    // @ts-ignore
    const availableStore = availableStores.find(({ store_code }) => store_code === process.env.STORE_VIEW_CODE);

    // @ts-ignore
    global.MAGENTO_MEDIA_BACKEND_URL = mediaUrl;
    // @ts-ignore
    global.LOCALE = storeConfigData.locale.replace('_', '-');
    // @ts-ignore
    global.AVAILABLE_STORE_VIEWS = availableStores;

    const possibleTypes = await getPossibleTypes();

    return ({
        define: {
            POSSIBLE_TYPES: JSON.stringify(possibleTypes),
            STORE_NAME: availableStore
                ? JSON.stringify(availableStore.store_name)
                : JSON.stringify(storeConfigData.store_name),
            STORE_VIEW_CODE: process.env.STORE_VIEW_CODE
                ? JSON.stringify(process.env.STORE_VIEW_CODE)
                : JSON.stringify(storeConfigData.code),
            AVAILABLE_STORE_VIEWS: JSON.stringify(availableStores),
            // @ts-ignore
            DEFAULT_LOCALE: JSON.stringify(global.LOCALE),
            DEFAULT_COUNTRY_CODE: JSON.stringify(
                process.env.DEFAULT_COUNTRY_CODE || 'US'
            ),
            __DEV__: process.env.NODE_ENV !== 'production',
            __fetchLocaleData__: `(${importerFactory})()`,
            global: 'window' // TODO: fix jarallax error due to global being undefined
        },
        server: {
            host: 'mumzworld.pwa',
            port: 8080,
        },
        plugins: [
            createHtmlPlugin({
                template: 'template.html',
                entry: 'src/index.jsx'
            }),
            buildpackPlugin({ magentoResolver: { mode, envDir: process.cwd() },
                buildbus: {
                    projectName: packageJson.name,
                    // @ts-ignore
                    trustedVendors: packageJson['pwa-studio'].trustedVendors ?? []
                }
            })
        ]
    });
});
