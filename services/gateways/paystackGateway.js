const axios = require('axios');
const paystack = require('stripe')(process.env.PAYSTACK_SECRET_KEY);
const PaymentGateway = require('./paymentGateway');  // Assuming the abstract gateway is in the same directory

class PaystackGateway extends PaymentGateway {

    constructor() {
        super();
        this.paystackUrl = 'https://api.paystack.co';
        this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    }

    async initiatePayment(amount, currency, data, callbackUrl) {
        try {
            // Convert amount to kobo (or smallest currency unit)
            const koboAmount = amount * 100;
            console.log(this.secretKey);
            const response = await axios({
                url: `${this.paystackUrl}/transaction/initialize`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    amount: koboAmount,
                    currency,
                    callback_url: callbackUrl,
                    email: data.email,
                    ref: data.ref
                }
            });
            console.log(response);
            return response.data;
        } catch (error) {
            console.error('Paystack Error Response:', error.response?.data);
            throw new Error(`Failed to initialize Paystack payment: ${error.message}`);
        }
    }

    async verifyPayment(paymentReference) {
        try {
            const response = await axios({
                url: `${this.paystackUrl}/transaction/verify/${paymentReference}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.secretKey}`
                }
            });
            console.log(response.data);
            return response.data;
        } catch (error) {
            // Handle or throw the error as you see fit.
            throw new Error(`Failed to verify Paystack payment: ${error.message}`);
        }
    }
}

module.exports = PaystackGateway;