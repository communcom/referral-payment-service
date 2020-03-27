module.exports = {
    GLS_NATS_START: process.env.GLS_NATS_START,
    GLS_REGISTRATION_CONNECT: process.env.GLS_REGISTRATION_CONNECT,
    GLS_PAYMENT_CONNECT: process.env.GLS_PAYMENT_CONNECT,
    GLS_PAYMENT_API_KEY: process.env.GLS_PAYMENT_API_KEY,
    GLS_TOKEN_SELLERS: process.env.GLS_TOKEN_SELLERS
        ? JSON.parse(process.env.GLS_TOKEN_SELLERS)
        : [],
    GLS_BONUS_PERCENT: Number(process.env.GLS_BONUS_PERCENT) || 0,
    GLS_BONUS_DAYS_LIMIT: process.env.GLS_BONUS_DAYS_LIMIT || 90,
};
