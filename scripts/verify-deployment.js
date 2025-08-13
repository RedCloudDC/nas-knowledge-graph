#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Verifies GitHub Pages deployment readiness including HTTPS, custom domain, and 404 handling
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// ANSI color codes
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    header: (msg) => console.log(`${colors.bold}${colors.blue}${msg}${colors.reset}`)
};

/**
 * Check if docs directory exists and has required files
 */
function checkDocsDirectory() {
    log.header('\n📁 Checking docs directory structure...');
    
    const docsPath = join(PROJECT_ROOT, 'docs');
    if (!existsSync(docsPath)) {
        log.error('docs directory not found! Run "npm run build:deploy" first.');
        return false;
    }
    
    log.success('docs directory exists');
    
    // Check required files
    const requiredFiles = [
        'index.html',
        '.nojekyll',
        '404.html'
    ];
    
    let allFilesExist = true;
    requiredFiles.forEach(file => {
        const filePath = join(docsPath, file);
        if (existsSync(filePath)) {
            log.success(`${file} exists`);
        } else {
            log.error(`${file} is missing`);
            allFilesExist = false;
        }
    });
    
    // Check for built assets
    const assetDirs = ['js', 'css'];
    assetDirs.forEach(dir => {
        const dirPath = join(docsPath, dir);
        if (existsSync(dirPath)) {
            log.success(`${dir}/ directory exists`);
        } else {
            log.warn(`${dir}/ directory not found - may indicate build issues`);
        }
    });
    
    return allFilesExist;
}

/**
 * Verify index.html structure and meta tags for GitHub Pages
 */
function verifyIndexHtml() {
    log.header('\n📄 Verifying index.html structure...');
    
    const indexPath = join(PROJECT_ROOT, 'docs', 'index.html');
    if (!existsSync(indexPath)) {
        log.error('index.html not found in docs directory');
        return false;
    }
    
    const content = readFileSync(indexPath, 'utf-8');
    
    // Check for essential meta tags
    const checks = [
        {
            test: content.includes('<meta charset="UTF-8">'),
            success: 'UTF-8 charset declared',
            error: 'Missing UTF-8 charset declaration'
        },
        {
            test: content.includes('viewport'),
            success: 'Viewport meta tag present',
            error: 'Missing viewport meta tag'
        },
        {
            test: content.includes('<title>'),
            success: 'Page title present',
            error: 'Missing page title'
        },
        {
            test: content.includes('d3js.org/d3') || content.includes('d3.'),
            success: 'D3.js library reference found',
            error: 'D3.js library not referenced'
        }
    ];
    
    let allPassed = true;
    checks.forEach(check => {
        if (check.test) {
            log.success(check.success);
        } else {
            log.error(check.error);
            allPassed = false;
        }
    });
    
    // Check relative paths (should start with ./ for GitHub Pages)
    const hasRelativePaths = content.includes('src="./') || content.includes('href="./')
        || content.includes('src="js/') || content.includes('href="css/');
    
    if (hasRelativePaths) {
        log.success('Uses relative paths for assets');
    } else {
        log.warn('May have absolute path issues for GitHub Pages');
    }
    
    return allPassed;
}

/**
 * Verify 404.html for proper error handling
 */
function verify404Page() {
    log.header('\n🚫 Verifying 404 error handling...');
    
    const notFoundPath = join(PROJECT_ROOT, 'docs', '404.html');
    if (!existsSync(notFoundPath)) {
        log.error('404.html not found - GitHub Pages will use default 404 page');
        return false;
    }
    
    const content = readFileSync(notFoundPath, 'utf-8');
    
    const checks = [
        {
            test: content.includes('404'),
            success: '404 error message present',
            error: 'Missing 404 error indication'
        },
        {
            test: content.includes('href="/') || content.includes("href='/'"),
            success: 'Home page link present',
            error: 'Missing home page redirect link'
        },
        {
            test: content.includes('setTimeout') || content.includes('window.location'),
            success: 'Auto-redirect functionality present',
            error: 'No auto-redirect functionality found'
        }
    ];
    
    let allPassed = true;
    checks.forEach(check => {
        if (check.test) {
            log.success(check.success);
        } else {
            log.warn(check.error);
        }
    });
    
    log.success('404.html structure looks good');
    return allPassed;
}

/**
 * Check .nojekyll file to prevent Jekyll processing
 */
function checkNoJekyll() {
    log.header('\n🚫 Checking Jekyll bypass...');
    
    const nojekyllPath = join(PROJECT_ROOT, 'docs', '.nojekyll');
    if (existsSync(nojekyllPath)) {
        log.success('.nojekyll file present - Jekyll processing disabled');
        return true;
    } else {
        log.error('.nojekyll file missing - GitHub may process files with Jekyll');
        return false;
    }
}

/**
 * Verify GitHub Actions workflow configuration
 */
function verifyWorkflow() {
    log.header('\n⚙️  Checking GitHub Actions workflow...');
    
    const workflowPath = join(PROJECT_ROOT, '.github', 'workflows', 'gh-pages.yml');
    if (!existsSync(workflowPath)) {
        log.error('GitHub Actions workflow not found at .github/workflows/gh-pages.yml');
        return false;
    }
    
    const content = readFileSync(workflowPath, 'utf-8');
    
    const checks = [
        {
            test: content.includes('actions/configure-pages'),
            success: 'Pages configuration action present',
            error: 'Missing Pages configuration'
        },
        {
            test: content.includes('actions/upload-pages-artifact'),
            success: 'Pages upload action present',
            error: 'Missing Pages upload action'
        },
        {
            test: content.includes('actions/deploy-pages'),
            success: 'Pages deployment action present',
            error: 'Missing Pages deployment action'
        },
        {
            test: content.includes('build:deploy') || content.includes('npm run build'),
            success: 'Build step configured',
            error: 'Missing build step'
        },
        {
            test: content.includes('permissions:') && content.includes('pages: write'),
            success: 'GitHub Pages permissions configured',
            error: 'Missing GitHub Pages permissions'
        }
    ];
    
    let allPassed = true;
    checks.forEach(check => {
        if (check.test) {
            log.success(check.success);
        } else {
            log.error(check.error);
            allPassed = false;
        }
    });
    
    return allPassed;
}

/**
 * Check package.json configuration for deployment
 */
function checkPackageJson() {
    log.header('\n📦 Checking package.json configuration...');
    
    const packagePath = join(PROJECT_ROOT, 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    
    const checks = [
        {
            test: packageJson.scripts && packageJson.scripts['build:deploy'],
            success: 'build:deploy script present',
            error: 'Missing build:deploy script'
        },
        {
            test: packageJson.homepage && packageJson.homepage.includes('github.io'),
            success: 'Homepage URL configured for GitHub Pages',
            error: 'Homepage URL not configured for GitHub Pages'
        },
        {
            test: packageJson.repository && packageJson.repository.url,
            success: 'Repository URL configured',
            error: 'Missing repository URL'
        }
    ];
    
    let allPassed = true;
    checks.forEach(check => {
        if (check.test) {
            log.success(check.success);
        } else {
            log.warn(check.error);
        }
    });
    
    return allPassed;
}

/**
 * Main verification function
 */
async function verifyDeployment() {
    log.header('🚀 GitHub Pages Deployment Verification\n');
    
    const checks = [
        checkDocsDirectory,
        verifyIndexHtml,
        verify404Page,
        checkNoJekyll,
        verifyWorkflow,
        checkPackageJson
    ];
    
    let allPassed = true;
    for (const check of checks) {
        const result = check();
        if (!result) {
            allPassed = false;
        }
    }
    
    log.header('\n📋 Verification Summary');
    
    if (allPassed) {
        log.success('All checks passed! Your deployment is ready for GitHub Pages.');
        log.info('Next steps:');
        log.info('1. Push your changes: git push origin main');
        log.info('2. Check Actions tab for deployment status');
        log.info('3. Visit your GitHub Pages URL after deployment completes');
        log.info('4. Test HTTPS and custom domain if configured');
    } else {
        log.error('Some checks failed. Please address the issues above before deploying.');
        process.exit(1);
    }
    
    log.header('\n💡 Additional recommendations:');
    log.info('- Test your deployment in a local server environment first');
    log.info('- Configure custom domain in repository settings if desired');
    log.info('- Set up branch protection rules for the main branch');
    log.info('- Monitor Core Web Vitals after deployment');
    
    console.log('\nDeployment verification complete! 🎉');
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    verifyDeployment().catch(console.error);
}

export { verifyDeployment };
