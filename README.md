<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>
</p>

[travis-image]: https://api.travis-ci.org/nestjs/nest.svg?branch=master
[travis-url]: https://travis-ci.org/nestjs/nest
[linux-image]: https://img.shields.io/travis/nestjs/nest/master.svg?label=linux
[linux-url]: https://travis-ci.org/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="blank">Node.js</a> framework for building efficient and scalable server-side applications, heavily inspired by <a href="https://angular.io" target="blank">Angular</a>.</p>
    <p align="center">
<a href="https://www.npmjs.com/package/@nestjs/terminus"><img src="https://img.shields.io/npm/v/@nestjs/terminus.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/package/@nestjs/terminus"><img src="https://img.shields.io/npm/l/@nestjs/terminus.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/package/@nestjs/terminus"><img src="https://img.shields.io/npm/dm/@nestjs/terminus.svg" alt="NPM Downloads" /></a>
<a href="https://travis-ci.org/nestjs/terminus"><img src="https://api.travis-ci.org/nestjs/terminus.svg?branch=master" alt="Travis" /></a>
<a href="https://travis-ci.org/nestjs/terminus"><img src="https://img.shields.io/travis/nestjs/terminus/master.svg?label=linux" alt="Linux" /></a>
<a href="https://gitter.im/nestjs/nestjs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=body_badge"><img src="https://badges.gitter.im/nestjs/nestjs.svg" alt="Gitter" /></a>
<a href="https://opencollective.com/nest#backer"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec"><img src="https://img.shields.io/badge/Donate-PayPal-dc3d53.svg"/></a>
  <a href="https://twitter.com/nestframework"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

This module contains integrated healthchecks for [Nest](https://github.com/nestjs/nest). These healthchecks run in an internal execution manager based on the [Terminus](https://github.com/godaddy/terminus)-package.

## Installation

```bash

npm install --save @nestjs/terminus @godaddy/terminus

```

## Usage

Import the Terminus module with the following options for a healthcheck with a **database** health inidcator.

```typescript

const getTerminusOptions = (
  db: TypeOrmHealthIndicator,
): TerminusModuleOptions => ({
  endpoints: [
    {
      // The health check will be available with /health
      url: '/health',
      // All the indicator which will be checked when requesting /health
      healthIndicators: [
        // Set the timeout for a response to 300ms
        async () => db.pingCheck('database', { timeout: 300 })
      ],
    },
  ],
});

@Module({
  imports:[
    // Make sure TypeOrmModule is available in the module context
    TypeOrmModule.forRoot({ ... }),
    TerminusModule.forRootAsync({
      // Inject the TypeOrmHealthIndicator provided by nestjs/terminus
      inject: [TypeOrmHealthIndicator],
      useFactory: db => getTerminusOptions(db),
    }),
  ],
})
export class HealthModule { }

```

If everything is set up correctly, you can access the healthcheck on `http://localhost:3000/health`.

```json

{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  }
}
    
```

For more information, [see docs](https://docs.nestjs.com/recipes/terminus) or [internal documentation](https://nestjs.github.io/terminus/). You can find further samples in the [samples/](https://github.com/nestjs/terminus/tree/master/sample) folder of this repository.

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

* Author - [Kamil Myśliwiec](https://kamilmysliwiec.com) and [Livio Brunner](https://brunnerliv.io)
* Website - [https://nestjs.com](https://nestjs.com/)
* Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
