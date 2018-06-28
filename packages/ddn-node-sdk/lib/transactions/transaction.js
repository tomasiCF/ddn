var crypto = require("./crypto.js")
var constants = require("../constants.js")
var transactionTypes = require("../transaction-types.js")
var slots = require("../time/slots.js")
var options = require('../options')
var bignum = require('bignum-utils');

function calculateFee(amount) {
    var min = constants.fees.send;
    
    var fee = bignum.multiply(amount, 0.0001).toFixed(0);

    if (bignum.isLessThan(fee, min)) {
        return min;
    } else {
        return fee + "";
    }
}

function createTransaction(recipientId, amount, message, secret, secondSecret) {
	var transaction = {
		type: transactionTypes.SEND,
		nethash: options.get('nethash'),
		amount: amount + "",
		fee: constants.fees.send,
		recipientId: recipientId,
		message: message,
		timestamp: slots.getTime() - options.get('clientDriftSeconds'),
		asset: {}
	};

	var keys = crypto.getKeys(secret);
	transaction.senderPublicKey = keys.publicKey;

	crypto.sign(transaction, keys);

	if (secondSecret) {
		var secondKeys = crypto.getKeys(secondSecret);
		crypto.secondSign(transaction, secondKeys);
	}

	transaction.id = crypto.getId(transaction);
	return transaction;
}

function createLock(height, secret, secondSecret) {
	var transaction = {
		type: 100,
		amount: "0",    
		nethash: options.get('nethash'),
		fee: "10000000",    
		recipientId: null,
		args: [ String(height) ],
		timestamp: slots.getTime() - options.get('clientDriftSeconds'),
		asset: {}
	};

	var keys = crypto.getKeys(secret);
	transaction.senderPublicKey = keys.publicKey;

	crypto.sign(transaction, keys);

	if (secondSecret) {
		var secondKeys = crypto.getKeys(secondSecret);
		crypto.secondSign(transaction, secondKeys);
	}

	transaction.id = crypto.getId(transaction);
	return transaction;
}

module.exports = {
	createTransaction: createTransaction,
	calculateFee: calculateFee,
	createLock: createLock
}