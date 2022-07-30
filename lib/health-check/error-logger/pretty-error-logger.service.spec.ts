import { Test } from '@nestjs/testing';
import { PrettyErrorLogger } from './pretty-error-logger.service';

const GREEN = '\x1b[0m\x1b[32m';
const RED = '\x1b[0m\x1b[31m';
const STOP_COLOR = '\x1b[0m';

describe('PrettyErrorLogger', () => {
  let prettyErrorLogger: PrettyErrorLogger;

  beforeEach(async () => {
    const module = Test.createTestingModule({
      providers: [PrettyErrorLogger],
    });
    const context = await module.compile();

    prettyErrorLogger = context.get(PrettyErrorLogger);
  });

  it('should print one "up" results', () => {
    const message = prettyErrorLogger.getErrorMessage('message', {
      dog: {
        status: 'up',
      },
    });

    expect(message).toBe(`message

${GREEN}┌ ✅ dog ────────┐
│                │
│   status: up   │
│                │
└────────────────┘${STOP_COLOR}
`);
  });

  it('should print one "down" results', () => {
    const message = prettyErrorLogger.getErrorMessage('message', {
      dog: {
        status: 'down',
      },
    });

    expect(message).toBe(`message

${RED}┌ ❌ dog ──────────┐
│                  │
│   status: down   │
│                  │
└──────────────────┘${STOP_COLOR}
`);
  });

  it('should print "up" and "down" results', () => {
    const message = prettyErrorLogger.getErrorMessage('message', {
      dog: {
        status: 'up',
      },
      pug: {
        status: 'down',
      },
    });

    expect(message).toBe(`message

${GREEN}┌ ✅ dog ────────┐
│                │
│   status: up   │
│                │
└────────────────┘${STOP_COLOR}
${RED}┌ ❌ pug ──────────┐
│                  │
│   status: down   │
│                  │
└──────────────────┘${STOP_COLOR}
`);
  });

  it('should print object details', () => {
    const message = prettyErrorLogger.getErrorMessage('message', {
      dog: {
        status: 'up',
        foo: 'bar',
      },
    });

    expect(message).toBe(`message

${GREEN}┌ ✅ dog ────────┐
│                │
│   status: up   │
│   foo: bar     │
│                │
└────────────────┘${STOP_COLOR}
`);
  });

  it('should print nested object details', () => {
    const message = prettyErrorLogger.getErrorMessage('message', {
      dog: {
        status: 'up',
        foo: {
          bar: 'baz',
        },
      },
    });

    expect(message).toBe(`message

${GREEN}┌ ✅ dog ──────────┐
│                  │
│   status: up     │
│   foo:           │
│     - bar: baz   │
│                  │
└──────────────────┘${STOP_COLOR}
`);
  });

  it('should print array details', () => {
    const message = prettyErrorLogger.getErrorMessage('message', {
      dog: {
        status: 'up',
        foo: ['bar', 'baz'],
      },
    });

    expect(message).toBe(`message

${GREEN}┌ ✅ dog ────────┐
│                │
│   status: up   │
│   foo:         │
│     - 0: bar   │
│     - 1: baz   │
│                │
└────────────────┘${STOP_COLOR}
`);
  });

  it('should print symbol details', () => {
    const message = prettyErrorLogger.getErrorMessage('message', {
      dog: {
        status: 'up',
        foo: Symbol('TEST'),
      },
    });

    expect(message).toBe(`message

${GREEN}┌ ✅ dog ───────────────┐
│                       │
│   status: up          │
│   foo: Symbol(TEST)   │
│                       │
└───────────────────────┘${STOP_COLOR}
`);
  });
});
