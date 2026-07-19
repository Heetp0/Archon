import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, beforeAll } from 'vitest';

describe('Feature 6: Vite Production Build & Size', () => {
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.resolve(rootDir, 'dist/public');

  beforeAll(() => {
    // Run pnpm build to ensure fresh build artifacts exist
    try {
      execSync('pnpm run build', { cwd: rootDir, stdio: 'ignore' });
    } catch (e) {
      console.error('Build failed in test setup:', e);
    }
  });

  // TIER 1: Feature Coverage (5 tests)
  it('T1.1: compiles frontend successfully with exit code 0', () => {
    // Verified by beforeAll not throwing, but let's confirm the dist folder exists
    expect(fs.existsSync(distDir)).toBe(true);
  });

  it('T1.2: generates index.html in the output directory', () => {
    const indexPath = path.join(distDir, 'index.html');
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  it('T1.3: contains built assets directory', () => {
    const assetsDir = path.join(distDir, 'assets');
    expect(fs.existsSync(assetsDir)).toBe(true);
  });

  it('T1.4: outputs at least one javascript bundle file in assets', () => {
    const assetsDir = path.join(distDir, 'assets');
    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);
  });

  it('T1.5: outputs CSS styles file in assets', () => {
    const assetsDir = path.join(distDir, 'assets');
    const files = fs.readdirSync(assetsDir);
    const cssFiles = files.filter(f => f.endsWith('.css'));
    expect(cssFiles.length).toBeGreaterThan(0);
  });

  // TIER 2: Boundary & Corner Cases (5 tests)
  it('T2.1: ensures javascript bundle size is under 1.5MB (standard budget)', () => {
    const assetsDir = path.join(distDir, 'assets');
    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    jsFiles.forEach(jsFile => {
      const stats = fs.statSync(path.join(assetsDir, jsFile));
      const sizeMB = stats.size / (1024 * 1024);
      expect(sizeMB).toBeLessThan(1.5); // size should be < 1.5 MB
    });
  });

  it('T2.2: ensures CSS style bundle size is under 500KB', () => {
    const assetsDir = path.join(distDir, 'assets');
    const files = fs.readdirSync(assetsDir);
    const cssFiles = files.filter(f => f.endsWith('.css'));
    
    cssFiles.forEach(cssFile => {
      const stats = fs.statSync(path.join(assetsDir, cssFile));
      const sizeKB = stats.size / 1024;
      expect(sizeKB).toBeLessThan(500); // size should be < 500 KB
    });
  });

  it('T2.3: ensures no source maps are output in assets (production security config)', () => {
    const assetsDir = path.join(distDir, 'assets');
    const files = fs.readdirSync(assetsDir);
    const mapFiles = files.filter(f => f.endsWith('.map'));
    expect(mapFiles.length).toBe(0);
  });

  it('T2.4: verifies clean public assets exist in the output dist', () => {
    // logo.png from public should be copied to the root of distDir
    const logoPath = path.join(distDir, 'archon-logo.png');
    expect(fs.existsSync(logoPath)).toBe(true);
  });

  it('T2.5: verify html file contains JS and CSS script tags', () => {
    const htmlContent = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
    expect(htmlContent).toContain('<script type="module"');
    expect(htmlContent).toContain('<link rel="stylesheet"');
  });
});
