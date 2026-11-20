import { before as swaggerPlugin } from '@nestjs/swagger/plugin';
import ts from 'typescript';

/**
 * Compiles the API's TypeScript for Vitest with the real TypeScript compiler.
 *
 * Vitest normally strips types with a fast transpiler. That transpiler cannot do two
 * things this API depends on: decorator metadata (`emitDecoratorMetadata`) and the
 * `@nestjs/swagger` compiler plugin, which reads the DTO types and class-validator
 * decorators and writes the OpenAPI schema. So tests compile each file exactly like
 * `nx build` does: same tsconfig, same plugin, same options.
 */
export function tscWithSwaggerPlugin(
  tsconfigPath: string,
  swaggerOptions: Record<string, unknown>,
) {
  let program: ts.Program | undefined;

  function createProgram(): ts.Program {
    const config = ts.getParsedCommandLineOfConfigFile(
      tsconfigPath,
      undefined,
      {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
          throw new Error(
            ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
          );
        },
      },
    );
    if (!config) {
      throw new Error(`Cannot read ${tsconfigPath}`);
    }
    return ts.createProgram(config.fileNames, {
      ...config.options,
      sourceMap: true,
      inlineSources: true,
    });
  }

  return {
    name: 'signflow-api:tsc-with-swagger-plugin',
    // Run before Vite's own TypeScript transform; our output is plain JavaScript.
    enforce: 'pre' as const,
    transform(_code: string, id: string) {
      const fileName = id.split('?')[0];
      if (!fileName.endsWith('.ts')) {
        return null;
      }
      program ??= createProgram();
      const sourceFile = program.getSourceFile(fileName);
      if (!sourceFile) {
        return null;
      }
      let code = '';
      let map = '';
      program.emit(
        sourceFile,
        (outputName, text) => {
          if (outputName.endsWith('.js.map')) {
            map = text;
          } else if (outputName.endsWith('.js')) {
            code = text.replace(/\/\/# sourceMappingURL=.*$/m, '');
          }
        },
        undefined,
        false,
        { before: [swaggerPlugin(swaggerOptions, program)] },
      );
      return { code, map };
    },
  };
}
