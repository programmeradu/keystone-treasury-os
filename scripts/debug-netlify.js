#!/usr/bin/env node

/**
 * Debug utility for Netlify deployment issues
 * Checks common configuration problems that cause API route 404s
 */

const fs = require('fs');
const path = require('path');

const warnings = [];
const errors = [];
const info = [];

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    info.push(`✅ ${description} exists: ${filePath}`);
    return true;
  } else {
    errors.push(`❌ ${description} missing: ${filePath}`);
    return false;
  }
}

function checkPackageJson() {
  const packagePath = './package.json';
  if (!checkFile(packagePath, 'package.json')) return;
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Check Next.js version
    const nextVersion = pkg.dependencies?.next;
    if (nextVersion) {
      info.push(`✅ Next.js version: ${nextVersion}`);
    } else {
      errors.push(`❌ Next.js not found in dependencies`);
    }
    
    // Check Netlify plugin
    const netlifyPlugin = pkg.dependencies?.['@netlify/plugin-nextjs'];
    if (netlifyPlugin) {
      info.push(`✅ Netlify Next.js plugin: ${netlifyPlugin}`);
    } else {
      errors.push(`❌ @netlify/plugin-nextjs not found in dependencies`);
    }
    
    // Check Node engine
    const nodeEngine = pkg.engines?.node;
    if (nodeEngine) {
      info.push(`✅ Node.js engine requirement: ${nodeEngine}`);
    } else {
      warnings.push(`⚠️  No Node.js engine specified in package.json`);
    }
    
  } catch (e) {
    errors.push(`❌ Error reading package.json: ${e.message}`);
  }
}

function checkNetlifyToml() {
  const tomlPath = './netlify.toml';
  if (!checkFile(tomlPath, 'netlify.toml')) return;
  
  try {
    const content = fs.readFileSync(tomlPath, 'utf8');
    
    // Check for plugin
    if (content.includes('@netlify/plugin-nextjs')) {
      info.push(`✅ Netlify Next.js plugin configured in netlify.toml`);
    } else {
      errors.push(`❌ @netlify/plugin-nextjs not found in netlify.toml`);
    }
    
    // Check for problematic publish directory
    if (content.includes('publish =')) {
      warnings.push(`⚠️  Publish directory set in netlify.toml - this may conflict with Next.js plugin`);
    }
    
    // Check for manual API redirects
    if (content.includes('from = "/api/*"')) {
      warnings.push(`⚠️  Manual API redirects found - these may conflict with Next.js plugin`);
    }
    
    // Check Node version
    if (content.includes('NODE_VERSION') && content.includes('20')) {
      info.push(`✅ Node.js 20 configured in netlify.toml`);
    } else {
      warnings.push(`⚠️  Node.js 20+ not explicitly set in netlify.toml`);
    }
    
  } catch (e) {
    errors.push(`❌ Error reading netlify.toml: ${e.message}`);
  }
}

function checkApiRoutes() {
  const apiDir = './src/app/api';
  if (!fs.existsSync(apiDir)) {
    errors.push(`❌ API routes directory not found: ${apiDir}`);
    return;
  }
  
  const countRoutes = (dir) => {
    let count = 0;
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
          count += countRoutes(itemPath);
        } else if (item === 'route.ts' || item === 'route.js') {
          count++;
        }
      }
    } catch (e) {
      warnings.push(`⚠️  Error reading directory "${dir}": ${e.message}`);
    }
    return count;
  };
  
  const routeCount = countRoutes(apiDir);
  info.push(`✅ Found ${routeCount} API routes in ${apiDir}`);
  
  // Check for common problematic routes
  const criticalRoutes = [
    'jupiter/price/route.ts',
    'solana/rpc/route.ts'
  ];
  
  for (const route of criticalRoutes) {
    const routePath = path.join(apiDir, route);
    if (fs.existsSync(routePath)) {
      info.push(`✅ Critical route exists: /api/${route.replace('/route.ts', '')}`);
    } else {
      warnings.push(`⚠️  Critical route missing: /api/${route.replace('/route.ts', '')}`);
    }
  }
}

function checkBuildOutput() {
  const buildDir = './.next';
  if (!fs.existsSync(buildDir)) {
    warnings.push(`⚠️  No build output found. Run 'npm run build' first.`);
    return;
  }
  
  info.push(`✅ Build output exists: ${buildDir}`);
  
  // Check server routes
  const serverApiDir = './.next/server/app/api';
  if (fs.existsSync(serverApiDir)) {
    const countServerRoutes = (dir) => {
      let count = 0;
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          if (stat.isDirectory()) {
            count += countServerRoutes(itemPath);
          } else if (item === 'route.js') {
            count++;
          }
        }
      } catch (e) {
        // ignore
      }
      return count;
    };
    
    const serverRouteCount = countServerRoutes(serverApiDir);
    info.push(`✅ Built ${serverRouteCount} serverless functions for API routes`);
  } else {
    warnings.push(`⚠️  No server-side API routes found in build output`);
  }
}

console.log('🔍 Netlify Deployment Debug Check\n');

checkPackageJson();
checkNetlifyToml();
checkApiRoutes();
checkBuildOutput();

console.log('\n📋 Results:\n');

if (info.length > 0) {
  console.log('ℹ️  Information:');
  info.forEach(msg => console.log(`  ${msg}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  Warnings:');
  warnings.forEach(msg => console.log(`  ${msg}`));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ Errors:');
  errors.forEach(msg => console.log(`  ${msg}`));
  console.log('');
}

if (errors.length === 0) {
  console.log('🎉 No critical errors found! Your configuration should work on Netlify.');
  console.log('If you still see 404s, check:');
  console.log('  1. Build logs in Netlify dashboard');
  console.log('  2. Function logs in Netlify dashboard');
  console.log('  3. Environment variables are set correctly');
} else {
  console.log('🚨 Critical errors found. Fix these before deploying to Netlify.');
  process.exit(1);
}