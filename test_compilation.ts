/**
 * Test script to verify that the fixed TypeScript files compile correctly
 * with exactOptionalPropertyTypes enabled
 */

// Import the TypeScript compiler API
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

// Define the directory containing the fixed files - use relative paths
const FIXED_FILES_DIR = './';
const OUTPUT_DIR = './test_output';

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Get all fixed TypeScript files
const fixedFiles = fs.readdirSync(FIXED_FILES_DIR)
  .filter(file => file.startsWith('fixed_') && file.endsWith('.ts'))
  .map(file => path.join(FIXED_FILES_DIR, file));

console.log(`Found ${fixedFiles.length} fixed TypeScript files to test`);

// Create a TypeScript compiler options object with exactOptionalPropertyTypes enabled
const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
  forceConsistentCasingInFileNames: true,
  exactOptionalPropertyTypes: true,
  outDir: OUTPUT_DIR
};

// Create a program
const program = ts.createProgram(fixedFiles, compilerOptions);

// Get pre-emit diagnostics
const diagnostics = ts.getPreEmitDiagnostics(program);

// Check if there are any errors
if (diagnostics.length > 0) {
  console.error('Compilation errors found:');
  
  diagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      const fileName = path.basename(diagnostic.file.fileName);
      
      console.error(`${fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
  });
  
  process.exit(1);
} else {
  console.log('All files compiled successfully with exactOptionalPropertyTypes enabled!');
  
  // Emit the files
  const emitResult = program.emit();
  
  if (emitResult.emitSkipped) {
    console.error('Error: Emit was skipped');
    process.exit(1);
  } else {
    console.log(`Successfully emitted ${fixedFiles.length} files to ${OUTPUT_DIR}`);
    process.exit(0);
  }
}

