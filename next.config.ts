import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

// GitHub Pages 정적 export 설정.
// production 빌드 (CI) 에서만 basePath / assetPrefix 켜고, 로컬 dev 에서는 끔.
const isProd = process.env.NODE_ENV === 'production';
const repoName = 'roll20-block-editor';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd ? `/${repoName}` : '',
  assetPrefix: isProd ? `/${repoName}/` : '',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
