export const toRootComponentMapKey = function (type: string, variant: string) {
    return 'RootCmp_' + type + '__' + (variant || 'default');
};
