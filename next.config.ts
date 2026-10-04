import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "export",
    trailingSlash: true,
    images: {
        unoptimized: true,
    },
    experimental: {
        // TypeScript 7 (the Go port) ships only the `tsc` binary, not the JS
        // compiler API Next uses for build-time type checking by default.
        useTypeScriptCli: true,
    },
};

export default nextConfig;
