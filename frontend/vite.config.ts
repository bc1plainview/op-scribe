import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
    base: '/',
    plugins: [
        nodePolyfills({
            globals: {
                Buffer: true,
                global: true,
                process: true,
            },
            overrides: {
                crypto: 'crypto-browserify',
            },
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@noble/hashes/sha256': '@noble/hashes/sha2.js',
            '@noble/hashes/sha512': '@noble/hashes/sha2.js',
            '@noble/hashes/ripemd160': '@noble/hashes/legacy.js',
            global: 'global',
            undici: resolve(__dirname, 'node_modules/opnet/src/fetch/fetch-browser.js'),
        },
        mainFields: ['module', 'main', 'browser'],
        dedupe: [
            '@noble/curves',
            '@noble/hashes',
            '@scure/base',
            'buffer',
            'react',
            'react-dom',
        ],
    },
    build: {
        commonjsOptions: {
            strictRequires: true,
            transformMixedEsModules: true,
        },
        rollupOptions: {
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'js/[name]-[hash].js',
                manualChunks: {
                    crypto: ['@noble/curves', '@noble/hashes'],
                    btcvision: [
                        '@btc-vision/transaction',
                        '@btc-vision/bitcoin',
                        '@btc-vision/bip32',
                        '@btc-vision/ecpair',
                    ],
                    opnet: ['opnet'],
                    react: ['react', 'react-dom', 'react-router-dom'],
                },
            },
            external: [
                'worker_threads',
                'node:sqlite',
                'node:diagnostics_channel',
                'node:async_hooks',
                'node:perf_hooks',
                'node:worker_threads',
            ],
        },
        target: 'esnext',
        modulePreload: false,
        cssCodeSplit: false,
        chunkSizeWarningLimit: 3000,
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'buffer', 'process', 'stream-browserify'],
        exclude: ['@btc-vision/transaction', 'crypto-browserify'],
    },
});
