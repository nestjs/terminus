<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

  <p align="center">A progressive <a href="http://nodejs.org" target="blank">Node.js</a> framework for building efficient and scalable server-side applications, heavily inspired by <a href="https://angular.io" target="blank">Angular</a>.</p>
    <p align="center">
<a href="https://www.npmjs.com/package/@nestjs/terminus"><img src="https://img.shields.io/npm/v/@nestjs/terminus.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/package/@nestjs/terminus"><img src="https://img.shields.io/npm/l/@nestjs/terminus.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/package/@nestjs/terminus"><img src="https://img.shields.io/npm/dm/@nestjs/terminus.svg" alt="NPM Downloads" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec"><img src="https://img.shields.io/badge/Donate-PayPal-dc3d53.svg"/></a>
  <a href="https://twitter.com/nestframework"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

This module contains integrated healthchecks for [Nest](https://github.com/nestjs/nest).

## Installation

`@nestjs/terminus` integrates with a lot of cool technologies, such as `typeorm`, `grpc`, `mongodb`, and many more!
In case you have missed a dependency, `@nestjs/terminus` will throw an error and prompt you to install the required dependency.
So you will only install what is actually required!

```bash

npm install --save @nestjs/terminus

```

## Usage

1. Import the Terminus module
2. Make sure the additionally needed modules are available to (e.g. `TypeOrmModule`), in case you want to do Database Health Checks.

```typescript
// app.module.ts

@Module({
  controllers: [HealthController],
  imports:[
    // Make sure TypeOrmModule is available in the module context
    TypeOrmModule.forRoot({ ... }),
    TerminusModule
  ],
})
export class HealthModule { }

```

3. Setup your `HealthController` which executes your Health Check.

```typescript
// health.controller.ts

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  readiness() {
    return this.health.check([
      async () => this.db.pingCheck('database', { timeout: 300 }),
    ]);
  }
}
```

If everything is set up correctly, you can access the healthcheck on `http://localhost:3000/health`.

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

For more information, [see docs](https://docs.nestjs.com/recipes/terminus).
You can find more samples in the [samples/](https://github.com/nestjs/terminus/tree/master/sample) folder of this repository.

## Contribute

In order to get started, first read through our [Contributing guidelines](https://github.com/nestjs/terminus/blob/master/CONTRIBUTING.md).

### Setup

Setup the development environment by following these instructions:

1. Fork & Clone the repository
2. Install the dependencies

```bash
npm install

# To rebuild the project, run
npm run build
```

### Test

For unit testing run the following command:

```bash
npm run test
```

For e2e testing, make sure you have docker installed

```bash
docker-compose up -d
npm run test:e2e
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com) and [Livio Brunner](https://brunnerliv.io)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
