const core = require('cyberway-core-service');
const { Service, BlockSubscribe } = core.services;
const { Logger } = core.utils;

const MetaModel = require('../models/Meta');
const env = require('../data/env');
const TransferSaver = require('../controllers/TransferSaver');
const UserSaver = require('../controllers/UserSaver');

class BlockListener extends Service {
    constructor({ worker }) {
        super();
        this._worker = worker;
    }

    async start() {
        let meta = await MetaModel.findOne();

        if (!meta) {
            let initialMeta = {};

            if (env.GLS_NATS_START) {
                initialMeta = JSON.parse(env.GLS_NATS_START);
                Logger.info('Set meta data to:', initialMeta);
            }

            meta = await MetaModel.create(initialMeta);
        }

        this._userSaver = new UserSaver();

        this._transferSaver = new TransferSaver({
            worker: this._worker,
        });

        this._subscriber = new BlockSubscribe({
            handler: async data => {
                if (this._stopping) {
                    return;
                }

                try {
                    await this._handleEvent(data);
                } catch (err) {
                    Logger.error('Critical Error!');
                    Logger.error('Block handling failed:', err);
                    process.exit(1);
                }
            },
        });

        if (meta.lastBlockNum) {
            await this._subscriber.setLastBlockMetaData(meta);
        }

        try {
            await this._subscriber.start();
        } catch (err) {
            Logger.error('Cant start block subscriber:', err);
            process.exit(1);
        }
    }

    async stop() {
        this._stopping = true;
    }

    async _setLastBlock({ blockNum, sequence }) {
        await MetaModel.updateOne(
            {},
            {
                $set: {
                    lastBlockNum: blockNum,
                    lastBlockSequence: sequence,
                },
            }
        );
    }

    /**
     * Обработка событий из BlockSubscribe.
     * @param {'BLOCK'|'FORK'|'IRREVERSIBLE_BLOCK'} type
     * @param {Object} data
     * @private
     */
    async _handleEvent({ type, data }) {
        switch (type) {
            case BlockSubscribe.EVENT_TYPES.BLOCK:
                await this._handleBlock(data);
                break;
            case BlockSubscribe.EVENT_TYPES.IRREVERSIBLE_BLOCK:
                await this._handleIrrBlock(data);
                await this._setLastBlock(data);
                break;
            default:
            // Do nothing
        }
    }

    async _handleBlock(block) {
        try {
            await this._userSaver.processBlock(block);
        } catch (err) {
            Logger.error(
                `Users saving: Cant disperse block, num: ${block.blockNum}, id: ${block.id}`,
                err
            );
        }
    }

    async _handleIrrBlock(block) {
        try {
            await this._transferSaver.processBlock(block);
        } catch (err) {
            Logger.error(`Cant disperse block, num: ${block.blockNum}, id: ${block.id}`, err);
            process.exit(1);
        }
    }
}

module.exports = BlockListener;
