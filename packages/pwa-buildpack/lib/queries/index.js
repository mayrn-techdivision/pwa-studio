import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Normal `require` doesn't know what to do with .graphql files, so this helper function
 * simply imports their contents as a string.
 * @see https://github.com/apollographql/apollo-server/issues/1175#issuecomment-397257339.
 *
 * @param   {String} filepath - A relative path to a .graphql file to read.
 * @returns {String} - The contents of the file as a string.
 */
const requireGraphQL = filePath => {
    const absolutePath = path.resolve(__dirname, filePath);
    return stripComments(fs.readFileSync(absolutePath.replace(/(\/pwa-buildpack)(?:\/\w+){0,2}(\/lib)/, '$1$2'), { encoding: 'utf8' }));
};

const singleLineCommentRegex = /(^#.*\n)/gm;
const stripComments = string => {
    return string.replace(singleLineCommentRegex, '');
};

// Import and export all the build-time queries.
export const getMediaUrl = requireGraphQL('../queries/getStoreMediaUrl.graphql');
export const getStoreConfigData = requireGraphQL(
    '../queries/getStoreConfigData.graphql'
);
export const getAvailableStoresConfigData = requireGraphQL(
    '../queries/getAvailableStoresConfigData.graphql'
);
export const getSchemaTypes = requireGraphQL('../queries/getSchemaTypes.graphql');
