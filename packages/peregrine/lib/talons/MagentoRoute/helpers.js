// 301 is permanent; 302 is temporary.
const REDIRECT_CODES = new Set().add(301).add(302);
export const isRedirect = code => REDIRECT_CODES.has(code);

export { getRootComponent } from '@magento/pwa-buildpack/lib/RootComponents/getRootComponent.js';
