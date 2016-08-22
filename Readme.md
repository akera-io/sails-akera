##saild-akera
 `saild-akera` is the Sails/Waterline connector for [Akera.io](http://www.akera.io) Application Server.

##Installation
```sh
npm install sails-akera
```

##Basic use

To use this connector you need and instance of [akera-server](http://repository.akera.io) running.

1. Quick start:

- Install `sails-akera` connector in your Sails.js project.
```sh
npm install sails-akera
```

- Add a connection to akera.io application server inside `connections.js` configuration file.
```json
	akeraSports: {
		adapter: 'sails-akera',
		host: 'localhost',
		port: 8383
	}
```

For information on configuring the connector in a Sails application, please refer to [Sails documentation](http://sailsjs.org/documentation/reference/configuration/sails-config-connections).

- Define models to match the tables from connected databases on akera.io application server:

```javascript

/**
 * Customer.js
 *
 * @description :: Customer model.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
 
module.exports = {
	autoCreatedAt: false,
	autoUpdatedAt: false,
	attributes: {
		CustId: {
			type: 'integer',
			primaryKey: true,
			columnName: 'CustNum',
			autoIncrement: true
		},
		Name: {
			type: 'string'
		},
		city: {
			type: 'string'
		},
	}
};

```

- Lift your Sails.js project.
```sh
sails lift
```	
