// const path = require('path');
// const merge = require('merge');
// const debug = require('../../util/debug').makeFileLogger(__filename);
// const walk = require('../../util/klaw-bound-fs');
//
// const i18nDir = 'i18n';
// const localeFileNameRegex = /([a-z]{2}_[A-Z]{2})\.json$/;
//
import { Plugin } from 'vite';

// const findTranslationFiles(inputFileSystem, dir) {
//     return new Promise(resolve => {
//         const translations = {};
//         const done = () => resolve(translations);
//         debug(`Scanning ${dir} for matching translation files.`);
//         walk(dir, { fs: inputFileSystem })
//             .on('readable', function() {
//                 let item;
//                 while ((item = this.read())) {
//                     if (
//                         item.stats.isFile() &&
//                         localeFileNameRegex.test(item.path)
//                     ) {
//                         debug(`Found localization file: ${item.path}`);
//                         const localeMatch = item.path.match(
//                             localeFileNameRegex
//                         );
//                         if (localeMatch && localeMatch[1]) {
//                             const locale = localeMatch[1];
//                             if (!Array.isArray(translations[locale])) {
//                                 translations[locale] = [];
//                             }
//                             translations[locale].push(item.path);
//                         }
//                     } else if (item.stats.isFile()) {
//                         debug(
//                             `Found invalid item within i18n directory: ${
//                                 item.path
//                             }. File names should match locales such as en_US and have a .json extension.`
//                         );
//                     }
//                 }
//             })
//             .on('error', done)
//             .on('end', done);
//     });
// }

// noinspection JSUnusedGlobalSymbols
export default function buildpackLocalization(): Plugin {
    const virtualModuleId = 'virtual:locale-data'
    const resolvedVirtualModuleId = '\0' + virtualModuleId

    return {
        name: 'buildpack:localization', // required, will show up in warnings and errors
        resolveId(id) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId
            }
        },
        load(id) {
            if (id === resolvedVirtualModuleId) {
                return `{}`
            }
        }
    }
}
