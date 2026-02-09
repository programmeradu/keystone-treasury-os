import * as Babel from '@babel/standalone';

export interface CompilationResult {
  code: string;
  error?: {
    message: string;
    loc?: { line: number; column: number };
  };
}

export const compileCode = (sourceCode: string): CompilationResult => {
  try {
    const result = Babel.transform(sourceCode, {
      filename: 'MiniApp.tsx',
      presets: [
        ['react', { runtime: 'automatic' }], // Use React 19 JSX transform
        ['typescript', { isTSX: true, allExtensions: true }]
      ],
      retainLines: true, // CRITICAL: Keeps line numbers 1:1 for debugging
      sourceMaps: 'inline'
    });
    
    return { code: result.code || '' };
  } catch (error: any) {
    return {
      code: '',
      error: {
        message: error.message,
        loc: error.loc
      }
    };
  }
};

/**
 * Generates the Import Map script from the lockfile
 */
export const generateImportMap = (lockfile: any, localOverrides: Record<string, string> = {}): string => {
  const imports: Record<string, string> = {};
  
  Object.entries(lockfile.packages).forEach(([name, pkg]: [string, any]) => {
    // If it's a blob override (like keystone-sdk), use the passed override URL
    if (pkg.url.startsWith('blob:') && localOverrides[name]) {
      imports[name] = localOverrides[name];
    } else {
      imports[name] = pkg.url;
    }
  });

  return JSON.stringify({ imports }, null, 2);
};
