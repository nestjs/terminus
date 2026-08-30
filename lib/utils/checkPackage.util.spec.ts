import { assertPackages } from './checkPackage.util.js';

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
