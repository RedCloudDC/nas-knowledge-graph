#!/usr/bin/env node

/**
 * API Documentation Generator
 * Generates comprehensive API documentation from JSDoc comments
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const jsdoc2md = require('jsdoc-to-markdown');

const SRC_DIR = path.join(__dirname, '../src');
const DOCS_DIR = path.join(__dirname, '../docs');
const API_DOCS_DIR = path.join(DOCS_DIR, 'api');

/**
 * Ensure directory exists
 * @param {string} dir - Directory path
 */
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Get all JavaScript files in src directory
 * @param {string} dir - Directory to scan
 * @param {string[]} files - Array to store file paths
 * @returns {string[]} Array of file paths
 */
function getJsFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            getJsFiles(fullPath, files);
        } else if (item.endsWith('.js') && !item.includes('.test.') && !item.includes('.spec.')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

/**
 * Generate module documentation
 * @param {string[]} files - Array of file paths
 * @returns {Promise<void>}
 */
async function generateModuleDocs(files) {
    console.log('📚 Generating module documentation...');
    
    const modules = {};
    
    for (const file of files) {
        try {
            const relativePath = path.relative(SRC_DIR, file);
            const moduleName = relativePath.replace(/\.js$/, '').replace(/\//g, '/');
            
            console.log(`  Processing: ${moduleName}`);
            
            const templateData = await jsdoc2md.getTemplateData({ files: file });
            
            if (templateData.length > 0) {
                const markdown = await jsdoc2md.render({ 
                    data: templateData,
                    'heading-depth': 3
                });
                
                if (markdown.trim()) {
                    const moduleDir = path.dirname(moduleName);
                    if (!modules[moduleDir]) {
                        modules[moduleDir] = [];
                    }
                    
                    modules[moduleDir].push({
                        name: path.basename(moduleName),
                        path: moduleName,
                        markdown: markdown
                    });
                }
            }
        } catch (error) {
            console.warn(`  ⚠️  Warning: Could not process ${file}: ${error.message}`);
        }
    }
    
    return modules;
}

/**
 * Create main API index
 * @param {Object} modules - Modules organized by directory
 */
function createApiIndex(modules) {
    console.log('📖 Creating API index...');
    
    let indexContent = `# API Documentation

This section provides comprehensive API documentation for all modules in the NAS Knowledge Graph Demo application.

## Module Overview

The application is organized into the following module categories:

`;

    const sortedDirs = Object.keys(modules).sort();
    
    for (const dir of sortedDirs) {
        const dirName = dir === '.' ? 'Core' : dir.charAt(0).toUpperCase() + dir.slice(1);
        indexContent += `### ${dirName}\n\n`;
        
        const sortedModules = modules[dir].sort((a, b) => a.name.localeCompare(b.name));
        
        for (const module of sortedModules) {
            const moduleLink = `${module.path}.md`.replace(/\//g, '-');
            indexContent += `- [${module.name}](${moduleLink}) - Module documentation\n`;
        }
        
        indexContent += '\n';
    }

    indexContent += `
## Documentation Conventions

### JSDoc Tags Used

- \`@class\` - Class definitions
- \`@param\` - Method parameters
- \`@returns\` - Return values
- \`@throws\` - Exceptions that may be thrown
- \`@example\` - Usage examples
- \`@since\` - Version information
- \`@deprecated\` - Deprecated methods
- \`@static\` - Static methods
- \`@private\` - Private methods (not included in docs)

### Type Definitions

Types are documented using JSDoc type expressions:

- \`{string}\` - String type
- \`{number}\` - Number type
- \`{boolean}\` - Boolean type
- \`{Object}\` - Generic object
- \`{Array<string>}\` - Array of strings
- \`{Promise<Object>}\` - Promise returning object
- \`{string|null}\` - Union types

### Navigation

Use the links above to navigate to specific module documentation. Each module page includes:

- Class and function definitions
- Parameter descriptions
- Return value specifications
- Usage examples
- Cross-references to related modules

---

*Generated on ${new Date().toISOString()}*
`;

    fs.writeFileSync(path.join(API_DOCS_DIR, 'README.md'), indexContent);
}

/**
 * Write individual module documentation files
 * @param {Object} modules - Modules organized by directory
 */
function writeModuleDocs(modules) {
    console.log('📝 Writing module documentation files...');
    
    for (const [dir, moduleList] of Object.entries(modules)) {
        for (const module of moduleList) {
            const filename = `${module.path}.md`.replace(/\//g, '-');
            const filepath = path.join(API_DOCS_DIR, filename);
            
            let content = `# ${module.name}

**Module**: \`${module.path}\`

${module.markdown}

---

*Auto-generated from JSDoc comments*
`;
            
            fs.writeFileSync(filepath, content);
            console.log(`  ✅ Created: ${filename}`);
        }
    }
}

/**
 * Generate comprehensive API documentation
 */
async function generateApiDocs() {
    console.log('🚀 Starting API documentation generation...\n');
    
    try {
        // Ensure directories exist
        ensureDir(API_DOCS_DIR);
        
        // Get all JS files
        const files = getJsFiles(SRC_DIR);
        console.log(`📁 Found ${files.length} JavaScript files\n`);
        
        // Generate module documentation
        const modules = await generateModuleDocs(files);
        
        // Create main index
        createApiIndex(modules);
        
        // Write individual module files
        writeModuleDocs(modules);
        
        console.log(`\n✅ API documentation generated successfully!`);
        console.log(`📍 Location: ${API_DOCS_DIR}`);
        console.log(`📖 Main index: ${path.join(API_DOCS_DIR, 'README.md')}`);
        
    } catch (error) {
        console.error('❌ Error generating API documentation:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    generateApiDocs();
}

module.exports = {
    generateApiDocs,
    getJsFiles,
    ensureDir
};
