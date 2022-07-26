/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly MAGENTO_BACKEND_EDITION: 'AC' | 'EE' | 'MOS' | 'CE';
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
