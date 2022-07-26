import Target from '../BuildBus/Target';

declare namespace Buildpack {
    interface EnvVarDefinition {
        name: string;
        type: 'str' | 'bool' | 'num' | 'email' | 'host' | 'port' | 'url' | 'json';
        desc?: string;
        choices?: string[];
        default?: string;
        example?: string;
    }

    interface EnvDarDefsChangeBase {
        name: string;
        reason: string;
        dateChanged: string|number;
        warnForDays?: number;
    }

    interface EnvVarDefsChangeRemove extends EnvDarDefsChangeBase {
        type: 'removed';
    }

    interface EnvVarDefsChangeRename extends EnvDarDefsChangeBase{
        type: 'renamed';
        update: string;
        supportLegacy?: boolean;
    }

    type EnvVarDefsChange = EnvVarDefsChangeRemove|EnvVarDefsChangeRename

    interface EnvVarDefsSection {
        name: string;
        variables: EnvVarDefinition[];
    }

    interface EnvVarDefs {
        sections: EnvVarDefsSection[];
        changes: EnvVarDefsChange[];
    }

    interface SpecialFeatures {
        cssModules?: boolean;
        esModules?: boolean;
        graphqlQueries?: boolean;
        upward?: boolean;
        i18n?: boolean;
    }

    type FeaturesByModule = Record<string, SpecialFeatures>

    declare interface Targets {
        '@magento/pwa-buildpack': {
            envVarDefinitions: Target<EnvVarDefs, void>;
            specialFeatures: Target<FeaturesByModule, void>;
        };
    }
}
