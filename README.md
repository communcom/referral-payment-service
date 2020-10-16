# referral-payment-service

#### Clone the repository

```bash
git clone https://github.com/communcom/referral-payment-service.git
cd referral-payment-service
```

#### Create .env file

```bash
cp .env.example .env
```

Add variables

```bash
GLS_BLOCKCHAIN_BROADCASTER_CONNECT=nats://user:password@ip:4222
CYBERWAY_HTTP_URL=http://cyberway
GLS_REGISTRATION_CONNECT=
GLS_PAYMENT_CONNECT=http://payment-node:3000
GLS_PAYMENT_API_KEY=secret
```

#### Create docker-compose file

```bash
cp docker-compose.example.yml docker-compose.yml
```

#### Run

```bash
docker-compose up -d --build
```
