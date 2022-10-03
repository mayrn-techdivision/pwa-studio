import collection from './rootComponentCollection.js';
import { toRootComponentMapKey } from './toRootComponentMapKey';

export const getRootComponent = async (type:string, variant: string) => {
    return collection[toRootComponentMapKey(type, variant)];
}
