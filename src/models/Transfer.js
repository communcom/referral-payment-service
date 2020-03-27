const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel(
    'Transfer',
    {
        senderUserId: {
            type: String,
            required: true,
        },
        receiverUserId: {
            type: String,
            required: true,
        },
        quantity: {
            type: String,
            required: true,
        },
        blockId: {
            type: String,
            required: true,
        },
        blockTime: {
            type: Date,
            required: true,
        },
        transactionId: {
            type: String,
            required: true,
        },
        actionId: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'inprogress', 'empty-bonus', 'no-referral', 'out-date', 'sent'],
            default: 'pending',
            required: true,
        },
        statusChangedAt: {
            type: Date,
            required: true,
        },
        referralId: {
            type: String,
            default: null,
        },
        paymentId: {
            type: String,
            default: null,
        },
        bonusQuantity: {
            type: String,
            default: null,
        },
        failCount: {
            type: Number,
            required: true,
            default: 0,
        },
        nextTryAt: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    {
        index: [
            {
                fields: {
                    actionId: 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                fields: {
                    status: 1,
                    nextTryAt: 1,
                },
            },
        ],
    }
);
