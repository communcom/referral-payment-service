const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel(
    'User',
    {
        userId: {
            type: String,
            required: true,
        },
        username: {
            type: String,
            required: true,
        },
        registeredAt: {
            type: Date,
            required: true,
        },
    },
    {
        index: [
            {
                fields: {
                    userId: 1,
                },
                options: {
                    unique: true,
                },
            },
        ],
    }
);
