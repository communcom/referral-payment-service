const core = require('cyberway-core-service');
const { Service } = core.services;
const { Logger } = core.utils;
const env = require('../data/env');
const TransferModel = require('../models/Transfer');
const { getConnector } = require('../utils/globals');

const BATCH_SIZE = 20;
const DEFAULT_PENALTY_MS = 5000;
const MAX_PENALTY_MULTIPLIER = 100;

class Worker extends Service {
    async start() {
        this._startWorkLoop();
    }

    wakeUp() {
        if (this._stopIdle) {
            this._stopIdle();
        }
    }

    async _startWorkLoop() {
        while (true) {
            if (this._stopping) {
                this._stopResolve();
                return;
            }

            let hasMore = false;

            try {
                hasMore = await this._tick();
            } catch (err) {
                Logger.error('Tick failed:', err);
            }

            if (!hasMore) {
                await this._idle(5000);
            }
        }
    }

    async stop() {
        return new Promise(resolve => {
            this._stopResolve = resolve;
            this._stopping = true;
            this.wakeUp();
        });
    }

    _idle(ms) {
        return new Promise(resolve => {
            this._stopIdle = resolve;

            setTimeout(() => {
                this._stopIdle = null;
                resolve();
            }, ms);
        });
    }

    async _tick() {
        const transfers = await TransferModel.find(
            {
                status: 'pending',
                nextTryAt: {
                    $lte: Date.now(),
                },
            },
            {
                receiverUserId: true,
                quantity: true,
                failCount: true,
            },
            {
                limit: BATCH_SIZE,
                lean: true,
                sort: {
                    nextTryAt: 1,
                },
            }
        );

        for (const transfer of transfers) {
            if (this._stopping) {
                break;
            }

            await this._processTransfer(transfer);
        }

        return transfers.length === BATCH_SIZE;
    }

    async _processTransfer(transfer) {
        await this._updateTransferStatus(transfer, 'inprogress');

        try {
            const { user, referralParent } = await getConnector().callService(
                'registration',
                'getReferralParent',
                {
                    userId: transfer.receiverUserId,
                }
            );

            // If account don't have referralId then set status "no-referral" and do nothing
            if (!referralParent) {
                await this._updateTransferStatus(transfer, 'no-referral');
                return;
            }

            const bonusQuantity = this._calculateBonus(transfer.quantity);

            if (!bonusQuantity) {
                await this._updateTransferStatus(transfer, 'empty-bonus');
                return;
            }

            const { id: paymentId } = await getConnector().callService('payment', 'sendPayment', {
                apiKey: env.GLS_PAYMENT_API_KEY,
                userId: referralParent.userId,
                quantity: bonusQuantity,
                memo: `referral purchase bonus (${env.GLS_BONUS_PERCENT}%) for: ${user.username} (${user.userId})`,
            });

            try {
                await this._updateTransferStatus(transfer, 'sent', { paymentId, bonusQuantity });
            } catch (err) {
                Logger.error(
                    `Transfer status update to "sent" failed for "${transfer._id}, paymentId: "${paymentId}"`
                );
            }
        } catch (err) {
            Logger.error(`Transfer "${transfer._id}" processing failed:`, err);

            await this._updateTransferStatus(transfer, 'pending', {
                failCount: transfer.failCount + 1,
                nextTryAt: Date.now() + this._calculatePenalty(transfer.failCount + 1),
            });
        }
    }

    async _updateTransferStatus(transfer, status, updates = null) {
        await TransferModel.updateOne(
            {
                _id: transfer._id,
            },
            {
                $set: {
                    ...updates,
                    status: status,
                    statusChangedAt: new Date(),
                },
            }
        );
    }

    _calculatePenalty(failCount) {
        // base in range [0.8, 1.2)
        const penaltyBase = 0.8 + Math.random() * 0.4;
        let penaltyMultiplier;

        if (failCount === 1) {
            penaltyMultiplier = 1;
        } else {
            penaltyMultiplier = Math.min((failCount * 0.89) ** 1.5, MAX_PENALTY_MULTIPLIER);
        }

        return Math.floor(DEFAULT_PENALTY_MS * penaltyBase * penaltyMultiplier);
    }

    _calculateBonus(quantity) {
        const [amount, symbol] = quantity.split(' ');
        const value = parseFloat(amount);

        if (!value) {
            return null;
        }

        const bonus = value * (env.GLS_BONUS_PERCENT / 100);
        const bonusFixed = bonus.toFixed(4);

        if (!bonus || bonusFixed === '0.0000') {
            return null;
        }

        return `${bonusFixed} ${symbol}`;
    }
}

module.exports = Worker;
