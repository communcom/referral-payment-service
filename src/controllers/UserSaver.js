const core = require('cyberway-core-service');
const { Logger } = core.utils;

const UserModel = require('../models/User');

class UserSaver {
    async processBlock(block) {
        const meta = {
            blockTime: block.blockTime,
        };

        for (const trx of block.transactions) {
            for (const action of trx.actions) {
                if (action.code !== action.receiver || !action.args) {
                    continue;
                }

                if (action.code === 'cyber.domain' && action.action === 'newusername') {
                    try {
                        await this._saveUser(action.args, meta);
                    } catch (err) {
                        Logger.error('User saving failed:', action.args, err);
                    }
                }
            }
        }
    }

    async _saveUser({ owner: userId, name: username, creator: app }, meta) {
        if (app !== 'c') {
            return;
        }

        await UserModel.updateOne(
            {
                userId,
            },
            {
                $set: {
                    username,
                    registeredAt: meta.blockTime,
                },
            },
            {
                upsert: true,
            }
        );
    }
}

module.exports = UserSaver;
