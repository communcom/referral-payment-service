const core = require('cyberway-core-service');
const { Connector: BasicConnector } = core.services;
const env = require('../data/env');
const { setConnector } = require('../utils/globals');

class Connector extends BasicConnector {
    constructor() {
        super();
        setConnector(this);
    }

    async start() {
        await super.start({
            serverRoutes: {},
            requiredClients: {
                registration: env.GLS_REGISTRATION_CONNECT,
                payment: env.GLS_PAYMENT_CONNECT,
            },
        });
    }
}

module.exports = Connector;
