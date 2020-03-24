const core = require('cyberway-core-service');
const { Logger } = core.utils;

const TransferModel = require('../models/Transfer');

class TransferSaver {
    constructor({ worker }) {
        this._worker = worker;
    }

    async processBlock(block) {
        const blockInfo = {
            blockId: block.id,
            blockNum: block.blockNum,
            blockTime: block.blockTime,
            sequence: block.sequence,
        };

        for (const trx of block.transactions) {
            for (let i = 0; i < trx.actions.length; i++) {
                const action = trx.actions[i];

                // Process only original action and skip unparsed actions
                if (action.code === action.receiver && action.args) {
                    try {
                        await this._processAction(
                            {
                                ...blockInfo,
                                transactionId: trx.id,
                                actionId: `${blockInfo.blockId}:${trx.id}:${i}`,
                            },
                            action
                        );
                    } catch (err) {
                        Logger.error('Critical error!');
                        Logger.error('Action processing failed, block info:', blockInfo);
                        Logger.error('Action:', action);
                        Logger.error('Error:', err);
                        process.exit(1);
                    }
                }
            }
        }
    }

    async _processAction(actionInfo, { code, action, args }) {
        switch (code) {
            case 'cyber.token':
                switch (action) {
                    case 'transfer':
                        await this._processTransfer(actionInfo, args);
                        break;
                    default:
                }
                break;
            default:
            // Do nothing
        }
    }

    async _processTransfer(actionInfo, { from, to, quantity, memo }) {
        const [, symbol] = quantity.split(' ');

        if (symbol !== 'CMN' || memo !== 'carbon order') {
            return;
        }

        const { blockId, blockNum, blockTime, transactionId, actionId } = actionInfo;

        try {
            await TransferModel.create({
                senderUserId: from,
                receiverUserId: to,
                quantity,
                blockId,
                blockNum,
                blockTime,
                transactionId,
                actionId,
                status: 'pending',
                statusChangedAt: new Date(),
            });
        } catch (err) {
            if (err.name === 'MongoError' && err.code === 11000) {
                Logger.warn(`Duplicate transfer found: "${actionId}" (skip):`, err.message);
                return;
            } else {
                throw err;
            }
        }

        this._worker.wakeUp();
    }
}

module.exports = TransferSaver;
