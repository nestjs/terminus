import { assertPackages, loadPackage } from './checkPackage.util.js';

describe('assertPackages', () => {
  it('should not throw when every package resolves', () => {
    expect(() =>
      assertPackages(['@nestjs/common'], 'TestIndicator'),
    ).not.toThrow();
  });

  it('should throw naming the missing package', () => {
    expect(() =>
      assertPackages(['@nestjs/common', 'not-a-real-package'], 'TestIndicator'),
    ).toThrow(
      'The "not-a-real-package" package is missing. Please, make sure to install the library ($ npm install not-a-real-package) to take advantage of TestIndicator.',
    );
  });

  it('should list every missing package', () => {
    expect(() =>
      assertPackages(['not-a-real-package', 'me-neither'], 'TestIndicator'),
    ).toThrow(
      'The "not-a-real-package", "me-neither" packages are missing. Please, make sure to install the libraries ($ npm install not-a-real-package me-neither) to take advantage of TestIndicator.',
    );
  });
});

describe('loadPackage', () => {
  it('should load the package with the given loader once', async () => {
    const pkg = { name: 'pkg' };
    const loader = vi.fn().mockResolvedValue(pkg);

    await expect(loadPackage('load-once-package', loader)).resolves.toBe(pkg);
    await expect(loadPackage('load-once-package', loader)).resolves.toBe(pkg);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
