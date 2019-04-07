import { totalmem } from 'os';

export = index;
declare function index(
  directoryPath: string,
): Promise<{ free: number; size: number }>;
declare namespace index {
  class InvalidPathError {
    constructor(message: any);
    name: any;
    message: any;
  }
  class NoMatchError {
    constructor(message: any);
    name: any;
    message: any;
  }
  function getFirstExistingParentPath(directoryPath: any): any;
}
