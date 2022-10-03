import path from 'path';
import * as fs from 'fs';

import pkgDir from 'pkg-dir';
// @ts-ignore
import directiveParser from '@magento/directive-parser';

import TargetableLazyModuleObject from '../targetables/TargetableLazyModuleObject';
import { Buildpack } from '../targetables/targets';
import TargetProvider from '../BuildBus/TargetProvider';

interface RootComponent {
    file: string;
    pageType: string;
    variant: string;
    key: string;
}

import { createRequire } from 'module';
import { toRootComponentMapKey } from '../RootComponents/toRootComponentMapKey';
// @ts-ignore
const require = createRequire(import.meta.url);

async function* walk(dir: string, recursive = false): AsyncGenerator<string> {
    if (!fs.existsSync(dir)) {
        return;
    }
    for await (const d of await fs.promises.opendir(dir)) {
        const entry = path.join(dir, d.name);
        if (d.isDirectory() && recursive) yield* walk(entry);
        else if (d.isFile()) yield entry;
    }
}

const parseForRootComponents = async (file: string) => {
    const source = await fs.promises.readFile(file, 'utf-8');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { directives, errors } = directiveParser(
        '\n' + source + '\n'
    );
    const rootComponentDirectives = directives.filter(
        (d: { type: string }) => d.type === 'RootComponent'
    );

    if (rootComponentDirectives.length === 0) {
        return [];
    }

    if (rootComponentDirectives.length > 1) {
        return [];
        // todo
        // prettyLogger.warn(
        //     `Found more than 1 RootComponent Directive in ${rootComponentFile}. Only the first will be used`
        // );
    }

    const {
        pageTypes,
        variant
    }: { pageTypes: string[], variant: string } = rootComponentDirectives[0];

    return pageTypes.map((pageType: string): RootComponent => ({
        file,
        pageType,
        variant,
        key: toRootComponentMapKey(pageType, variant)
    }));
};


export default function registerRootComponents(targets: TargetProvider) {
    const buildpack = targets.of('@magento/pwa-buildpack');
    const lazyModuleObject = new TargetableLazyModuleObject('@magento/pwa-buildpack/lib/RootComponents/rootComponentCollection', targets);

    buildpack.transformModules.tapPromise(
        'RootComponents',
        async addTransform => {
            const special: Buildpack.FeaturesByModule = {};
            buildpack.specialFeatures.call(special);

            const packages = await Object.entries(special).reduce(
                async (acc: Promise<string[]>, [packageName, flags]) => {
                    if (!flags.rootComponents) {
                        return await acc;
                    }
                    const dir = await pkgDir(require.resolve(packageName));
                    return dir ? [...await acc, dir] : await acc;
                },
                Promise.resolve([])
            );


            const dirs = packages.reduce(
                (searchPaths: string[], moduleDir: string) => [
                    ...searchPaths,
                    path.join(moduleDir, 'RootComponents'),
                    path.join(moduleDir, 'src', 'RootComponents'),
                    path.join(moduleDir, 'lib', 'RootComponents')
                ],
                []
            );

            console.info('found root component packages', packages, dirs);

            const matches = (await Promise.all(
                await dirs.reduce<Promise<Promise<RootComponent[]>[]>>(
                    async (accPromise: Promise<Promise<RootComponent[]>[]>, dir): Promise<Promise<RootComponent[]>[]> => {
                        const acc = await accPromise;
                        for await (const file of walk(dir, true)) {
                            acc.push(parseForRootComponents(file));
                        }
                        return acc;
                    },
                    Promise.resolve([]) as Promise<Promise<RootComponent[]>[]>
                )
            )).flat();

            for (const match of matches) {
                lazyModuleObject.addLazyImport(`${match.key} from "${match.file}"`);
            }

            lazyModuleObject.flush().forEach(addTransform);
        }
    );
}
