import { errorMessage } from './errorMessage.js';

/**
 * Generates the string which packages are missing and
 * how to install them
 *
 * @param names The names of the packages
 * @param reason The reason why these packages are important
 *
 * @internal
 */
const MISSING_REQUIRED_DEPENDENCY = (names: string[], reason: string): string =>
  `The "${names.join('", "')}" package${
    names.length > 1 ? 's are' : ' is'
  } missing. Please, make sure to install the librar${
    names.length > 1 ? 'ies' : 'y'
  } ($ npm install ${names.join(' ')}) to take advantage of ${reason}.`;

/**
 * Cache of already-loaded packages, so that a health check does not pay for a
 * dynamic import on every probe.
 *
 * @internal
 */
const packageCache = new Map<string, any>();

/**
 * Whether the error says that a module could not be found. Node throws the
 * first code for `import()`, the second one for `require()`, which is what
 * bundlers turn an external import into.
 */
function isModuleNotFound(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND';
}

/**
 * Loads an optional peer package, caching it after its first load.
 *
 * The indicators call this from `onModuleInit`, so a missing peer aborts the
 * bootstrap, and again from their check methods.
 *
 * The import itself is the check on purpose. Asking Node whether the package
 * is on disk (`import.meta.resolve`) gives the wrong answer in a bundle, where
 * the package is part of the bundle and not on disk.
 *
 * @param packageNames The packages the indicator needs. They are named in the
 * error when the import fails
 * @param loader Imports the package with a literal specifier, which bundlers
 * can follow unlike an import of a variable
 * @param reason The reason why these packages are important
 *
 * @throws {Error} If the package, or a package it imports, cannot be found
 *
 * @internal
 */
export async function loadPackage(
  packageNames: string[],
  loader: () => Promise<any>,
  reason: string,
): Promise<any> {
  const cacheKey = packageNames.join();
  const cached = packageCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let pkg: any;
  try {
    pkg = await loader();
  } catch (error) {
    if (isModuleNotFound(error)) {
      // The first line names the module that was not found. It can also be
      // a package that a peer imports, so it is part of the message.
      const [notFound] = errorMessage(error).split('\n');
      throw new Error(
        `${MISSING_REQUIRED_DEPENDENCY(packageNames, reason)} (${notFound})`,
        { cause: error },
      );
    }
    throw error;
  }

  packageCache.set(cacheKey, pkg);
  return pkg;
}
