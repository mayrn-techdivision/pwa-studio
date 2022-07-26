import { resolve } from 'path'
import { defineConfig } from 'vite';
// import typescript2 from 'rollup-plugin-typescript2'
import dts from 'vite-plugin-dts'

export default defineConfig(async () => {
    return {
        plugins: [
            dts()
        ],
        build: {
            lib: {
                entry: resolve(__dirname, 'lib/index.ts'),
                name: 'PwaBuildPackVite',
                // the proper extensions will be added
                fileName: 'index',
                formats: ['es', 'cjs']
            },
            rollupOptions: {
                // make sure to externalize deps that shouldn't be bundled
                // into your library
                external: [/node_modules/],
                output: {
                    // Provide global variables to use in the UMD build
                    // for externalized deps
                    globals: {
                        vite: 'vite'
                    }
                }
            }
        },
    };
});
