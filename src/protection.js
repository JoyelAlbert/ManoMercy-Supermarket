// protection.js
import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'fs';
import path from 'path';

console.log('🔒 Starting code obfuscation...');

// Obfuscate all JS files in dist/assets
const assetsPath = path.join(process.cwd(), 'dist/assets');

if (!fs.existsSync(assetsPath)) {
  console.error('❌ dist/assets folder not found. Build the project first.');
  process.exit(1);
}

const files = fs.readdirSync(assetsPath);

files.forEach(file => {
  if (file.endsWith('.js') && !file.endsWith('.map.js')) {
    const filePath = path.join(assetsPath, file);
    const code = fs.readFileSync(filePath, 'utf8');
    
    console.log(`🔒 Obfuscating: ${file}`);
    
    const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.4,
      debugProtection: false,
      debugProtectionInterval: 0,
      disableConsoleOutput: false,
      identifierNamesGenerator: 'hexadecimal',
      log: false,
      numbersToExpressions: true,
      renameGlobals: false,
      selfDefending: true,
      simplify: true,
      splitStrings: true,
      splitStringsChunkLength: 10,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayIndexShift: true,
      stringArrayWrappersCount: 1,
      stringArrayWrappersChainedCalls: true,
      stringArrayWrappersParametersMaxCount: 2,
      stringArrayWrappersType: 'function',
      stringArrayThreshold: 0.75,
      transformObjectKeys: true,
      unicodeEscapeSequence: false
    });

    fs.writeFileSync(filePath, obfuscatedCode.getObfuscatedCode());
    console.log(`✅ Obfuscated: ${file}`);
  }
});

// Remove source map files
files.forEach(file => {
  if (file.endsWith('.map')) {
    const filePath = path.join(assetsPath, file);
    fs.unlinkSync(filePath);
    console.log(`🗑️ Removed source map: ${file}`);
  }
});

console.log('🎉 Code obfuscation completed!');