// @angular/build and @angular-devkit/build-angular must be the same version: each Angular
// build deletes the .angular/cache folders of other versions (journal 024).
// Run: pnpm check:angular-builders (also a CI step).
import { createRequire } from 'node:module';

const require = createRequire(new URL('../package.json', import.meta.url));
const build = require('@angular/build/package.json').version;
const devkit = require('@angular-devkit/build-angular/package.json').version;

if (build !== devkit) {
  console.error(
    `@angular/build ${build} != @angular-devkit/build-angular ${devkit}. ` +
      'Update both together to the same exact version (journal 024).',
  );
  process.exit(1);
}
console.log(`@angular/build and @angular-devkit/build-angular: ${build} - ok`);
