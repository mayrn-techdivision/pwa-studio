import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
// import * as path from 'path';
// import * as fs from 'fs';
// import { promisify } from 'util';
// @ts-ignore
// import pwaBuildpack from '@magento/pwa-buildpack';
import { buildpackPlugin } from '@magento/pwa-buildpack';

// const { graphQL: { getMediaURL, getStoreConfigData, getAvailableStoresConfigData, getPossibleTypes } } = pwaBuildpack;
//
// const importerFactory = `function () {
//             return async function getLocale(locale) {
//                 return {}
//             }
//         }`;

export default defineConfig(async ({ mode }) => {
    // const mediaUrl = await getMediaURL();
    // const storeConfigData = await getStoreConfigData();
    // const { availableStores } = await getAvailableStoresConfigData();
    // const writeFile = promisify(fs.writeFile);

    /**
     * Loop the available stores when there is provided STORE_VIEW_CODE
     * in the .env file, because should set the store name from the
     * given store code instead of the default one.
     */
    // const availableStore = availableStores.find(
    //     ({ store_code }) => store_code === process.env.STORE_VIEW_CODE
    // );
    //
    // global.MAGENTO_MEDIA_BACKEND_URL = mediaUrl;
    // global.LOCALE = storeConfigData.locale.replace('_', '-');
    // global.AVAILABLE_STORE_VIEWS = availableStores;
    //
    // const possibleTypes = await getPossibleTypes();

    return ({
        // define: {
        //     POSSIBLE_TYPES: JSON.stringify(possibleTypes),
        //     STORE_NAME: availableStore
        //         ? JSON.stringify(availableStore.store_name)
        //         : JSON.stringify(storeConfigData.store_name),
        //     STORE_VIEW_CODE: process.env.STORE_VIEW_CODE
        //         ? JSON.stringify(process.env.STORE_VIEW_CODE)
        //         : JSON.stringify(storeConfigData.code),
        //     AVAILABLE_STORE_VIEWS: JSON.stringify(availableStores),
        //     DEFAULT_LOCALE: JSON.stringify(global.LOCALE),
        //     DEFAULT_COUNTRY_CODE: JSON.stringify(
        //         process.env.DEFAULT_COUNTRY_CODE || 'US'
        //     ),
        //     __DEV__: process.env.NODE_ENV !== 'production',
        //     __fetchLocaleData__: `(${importerFactory})()`
        // },
        server: {
            host: 'mumzworld.pwa',
            port: 8080,
        },
        plugins: [
            createHtmlPlugin({
                template: 'template.html',
                entry: 'src/index.jsx'
            }),
            buildpackPlugin({ magentoResolver: { mode, envDir: process.cwd() } })
        ]
    });
});
