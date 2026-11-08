/**
 * Generates the string which packages are missing and
 * how to install them
 *
 * @param name The name of the packages
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
 * Cache of already-loaded packages, keyed by package name, so that a health
 * check does not pay for a dynamic import on every probe.
 *
 * @internal
 */
const packageCache = new Map<string, any>();

/**
 * Asserts that the given optional peer packages are installed, without loading
 * them. Meant for indicator constructors, which are synchronous.
 *
 * `import.meta.resolve` resolves a specifier without evaluating the module and
 * honours an `import`-only `exports` condition, which the ESM-only siblings
 * publish.
 *
 * @param packageNames The package names
 * @param reason The reason why these packages are important
 *
 * @throws {Error} If one of the packages cannot be resolved. A missing peer is
 * a wiring mistake that can never recover, so it aborts the bootstrap instead
 * of surfacing later as a failing probe.
 *
 * @internal
 */
export function assertPackages(packageNames: string[], reason: string): void {
  const missing = packageNames.filter((packageName) => {
    try {
      import.meta.resolve(packageName);
      return false;
    } catch (error) {
      // Bundlers inline the peers and compile `import.meta.resolve` away, so
      // only a resolve that ran and found nothing means the package is missing
      return (error as { code?: string })?.code === 'ERR_MODULE_NOT_FOUND';
    }
  });

  if (missing.length) {
    throw new Error(MISSING_REQUIRED_DEPENDENCY(missing, reason));
  }
}

/**
 * Loads a single optional peer package, caching it after its first load.
 * Meant for the (already asynchronous) check methods.
 *
 * @param packageName The package name, used as the cache key
 * @param loader Imports the package with a literal specifier, which bundlers
 * can follow unlike an import of a variable
 *
 * @internal
 */
export async function loadPackage(
  packageName: string,
  loader: () => Promise<any>,
): Promise<any> {
  const cached = packageCache.get(packageName);
  if (cached) {
    return cached;
  }

  const pkg = await loader();
  packageCache.set(packageName, pkg);
  return pkg;
}
