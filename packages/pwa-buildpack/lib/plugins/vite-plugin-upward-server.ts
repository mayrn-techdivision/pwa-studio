import { Connect, Plugin } from 'vite';
// @ts-ignore
import request from 'request';

export default async function buildpackUPWARDServerPlugin(): Promise<Plugin> {
    return {
        name: 'buildpack:upward-server',
        async configureServer(server) {
            const middleware: Connect.SimpleHandleFunction = async (req, res) => {
                // @ts-ignore
                const url = process.env.MAGENTO_BACKEND_URL as string + req.originalUrl;
                req.pipe(request(url)).pipe(res);
            };
            server.middlewares.use('/graphql', middleware);
            server.middlewares.use('/media', middleware);
        }
    };
}
