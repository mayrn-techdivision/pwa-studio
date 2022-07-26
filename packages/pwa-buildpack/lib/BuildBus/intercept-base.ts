/** @ignore */
import TargetProvider from './TargetProvider';
import TargetableSet from '../targetables/TargetableSet';

/**
 * Builtin targets are called manually from inside Buildpack code. Buildpack
 * can't rely on interceptors for all its base functionality, because it still
 * has to work in projects that don't have targets installed yet, such as newly
 * scaffolded projects.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-function
export default (targets: TargetProvider) => {
    const buildpack = targets.of('@magento/pwa-buildpack');

    //
    // buildpack.specialFeatures.tap(specialFeatures =>
    //     specialFeatures['@magento/pwa-buildpack'] = {
    //         esModules: true,
    //         graphqlQueries: true,
    //         upward: true,
    //     }
    // )

    buildpack.envVarDefinitions.tap(defs => {
        defs.sections.push({
            name: 'My custom section',
            variables: [
                {
                    name: 'MY_API_KEY',
                    type: 'str',
                    desc: 'api key for stuff',
                }
            ]
        });
    });

    const targetables = TargetableSet.using(targets);

    targetables.setSpecialFeatures('esModules', 'cssModules', {
        cssModules: true,
        i18n: true
    });

    targetables.defineEnvVars('my other custom section', [
        {
            name: 'SHOULD_I_DEBUG',
            type: 'bool',
            desc: 'whether this thing should be debugging'
        }
    ]);
}
