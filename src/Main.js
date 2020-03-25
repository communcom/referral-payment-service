const core = require('cyberway-core-service');
const { BasicMain } = core.services;
const env = require('./data/env');
const Connector = require('./services/Connector');
const BlockListener = require('./services/BlockListener');
const Worker = require('./services/Worker');

class Main extends BasicMain {
    constructor() {
        super(env);

        this.startMongoBeforeBoot();

        const worker = new Worker();
        const listener = new BlockListener({
            worker,
        });

        this.addNested(new Connector(), worker, listener);
    }
}

module.exports = Main;
