import { loadPackage } from './checkPackage.util.js';

describe('loadPackage', () => {
  it('should load the package with the given loader once', async () => {
    const pkg = { name: 'pkg' };
    const loader = vi.fn().mockResolvedValue(pkg);

    await expect(loadPackage(['once'], loader, 'Test')).resolves.toBe(pkg);
    await expect(loadPackage(['once'], loader, 'Test')).resolves.toBe(pkg);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('should name the packages when the import finds no module', async () => {
    const cause = await import('not-a-real-package' as string).catch((e) => e);

    await expect(
      loadPackage(
        ['not-a-real-package', 'me-neither'],
        () => Promise.reject(cause),
        'TestIndicator',
      ),
    ).rejects.toMatchObject({
      message: `The "not-a-real-package", "me-neither" packages are missing. Please, make sure to install the libraries ($ npm install not-a-real-package me-neither) to take advantage of TestIndicator. (${cause.message})`,
      cause,
    });
  });

  it('should name the package when a bundled require finds no module', async () => {
    const cause = Object.assign(new Error("Cannot find module 'ignored'"), {
      code: 'MODULE_NOT_FOUND',
    });

    await expect(
      loadPackage(['ignored'], () => Promise.reject(cause), 'TestIndicator'),
    ).rejects.toThrow(
      'The "ignored" package is missing. Please, make sure to install the library ($ npm install ignored) to take advantage of TestIndicator.',
    );
  });

  it('should show which module was not found, without the require stack', async () => {
    const cause = Object.assign(
      new Error("Cannot find module 'axios'\nRequire stack:\n- /app/index.js"),
      { code: 'MODULE_NOT_FOUND' },
    );

    await expect(
      loadPackage(['@nestjs/axios'], () => Promise.reject(cause), 'Test'),
    ).rejects.toThrow(
      /to take advantage of Test\. \(Cannot find module 'axios'\)$/,
    );
  });

  it('should not hide an error the package throws while it loads', async () => {
    const error = new Error('boom');

    await expect(
      loadPackage(['throws'], () => Promise.reject(error), 'TestIndicator'),
    ).rejects.toBe(error);
  });

  it('should try again after a failed load', async () => {
    const pkg = { name: 'pkg' };
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(pkg);

    await expect(loadPackage(['retry'], loader, 'Test')).rejects.toThrow();
    await expect(loadPackage(['retry'], loader, 'Test')).resolves.toBe(pkg);
  });
});
