import DdnUtils from '@ddn/utils';

import crypto from "./crypto.js";
import constants from "../constants.js";
import transactionTypes from "../transaction-types.js";
import slots from "../time/slots.js";
import options from '../options';

function calculateFee(amount) {
    const min = constants.fees.send;
    
    const fee = DdnUtils.bignum.multiply(amount, 0.0001).toFixed(0);

    if (DdnUtils.bignum.isLessThan(fee, min)) {
        return min;
    } else {
        return `${fee}`;
    }
}

async function createTransaction(recipientId, amount, message, secret, second_secret) {
	const transaction = {
		type: transactionTypes.SEND,
		nethash: options.get('nethash'),
		amount: `${amount}`,
		fee: constants.fees.send,
		recipient_id: recipientId,
		message,
		timestamp: slots.getTime() - options.get('clientDriftSeconds'),
		asset: {}
	};

	const keys = crypto.getKeys(secret);
	transaction.sender_public_key = keys.public_key;

	await crypto.sign(transaction, keys);

	if (second_secret) {
		const secondKeys = crypto.getKeys(second_secret);
		await crypto.secondSign(transaction, secondKeys);
	}

	transaction.id = await crypto.getId(transaction);
	return transaction;
}

async function createLock(height, secret, second_secret) {
	const transaction = {
		type: 100,
		amount: "0",    
		nethash: options.get('nethash'),
		fee: "10000000",    
		recipient_id: null,
		args: [ String(height) ],
		timestamp: slots.getTime() - options.get('clientDriftSeconds'),
		asset: {}
	};

	const keys = crypto.getKeys(secret);
	transaction.sender_public_key = keys.public_key;

	await crypto.sign(transaction, keys);

	if (second_secret) {
		const secondKeys = crypto.getKeys(second_secret);
		await crypto.secondSign(transaction, secondKeys);
	}

	transaction.id = await crypto.getId(transaction);
	return transaction;
}

export default {
	createTransaction,
	calculateFee,
	createLock
};