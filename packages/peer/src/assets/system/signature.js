/**
 * Signatures
 * wangxm   2019-03-25
 */
import util from 'util';

import DdnUtils from '@ddn/utils';
import ByteBuffer from 'bytebuffer';

class Signatures {

	constructor(context) {
        Object.assign(this, context);
        this._context = context;
	}

    async create({second_keypair}, trs) {
		trs.recipient_id = null;
		trs.amount = "0";   //DdnUtils.bignum update
		trs.asset.signature = {
			public_key: second_keypair.publicKey.toString('hex')
		};
		return trs;
    }

    async calculateFee(trs, sender) {
        return DdnUtils.bignum.multiply(5, this.tokenSetting.fixedPoint);
    }

	async verify(trs, sender, cb) {
		if (!trs.asset.signature) {
            throw new Error('Invalid transaction asset');
		}

		//DdnUtils.bignum update if (trs.amount != 0) {
        if (!DdnUtils.bignum.isZero(trs.amount)) {
            throw new Error('Invalid transaction amount')
		}

		try {
			if (!trs.asset.signature.public_key || Buffer.from(trs.asset.signature.public_key, 'hex').length != 32) {
                throw new Error('Invalid signature length');
			}
		} catch (e) {
            throw new Error('Invalid signature hex');
		}

        return trs;
	}

	async process(trs, sender) {
        return trs;
	}

	async getBytes({asset}) {
		try {
			var bb = new ByteBuffer(32, true);
			const publicKeyBuffer = Buffer.from(asset.signature.public_key, 'hex');

			for (let i = 0; i < publicKeyBuffer.length; i++) {
				bb.writeByte(publicKeyBuffer[i]);
			}

			bb.flip();
		} catch (e) {
			throw Error(e.toString());
		}
		return bb.toBuffer();
    }

    async isSupportLock() {
        return false;
    }

	async apply({asset}, block, {address}, dbTrans) {
        const data = {
            address,
            second_signature: 1,
            u_second_signature: 0,
            second_public_key: asset.signature.public_key
        };
        await this.runtime.account.setAccount(data, dbTrans);

        return await this.runtime.account.getAccountByAddress(address);
	}

	async undo(trs, block, {address}, dbTrans) {
        const data = {
            address,
            second_signature: 0,
            u_second_signature: 1,
            second_public_key: null
        };
        await this.runtime.account.setAccount(data, dbTrans);

        return await this.runtime.account.getAccountByAddress(address);
	}

	async applyUnconfirmed({type}, {address}, dbTrans) {
		// if (sender.second_signature) {
        //     throw new Error('Double set second signature');
        // }

		const key = `${address}:${type}`;
		if (this.oneoff.has(key)) {
            throw new Error('Double submit second signature');
        }

		this.oneoff.set(key, true);
	}

	async undoUnconfirmed({type}, {address}, dbTrans) {
        const key = `${address}:${type}`;
        this.oneoff.delete(key);

        const data = { address, u_second_signature: 0 };
        await this.runtime.account.setAccount(data, dbTrans);

        return await this.runtime.account.getAccountByAddress(address);
	}

	async objectNormalize(trs) {
        const validateErros = await this.ddnSchema.validate({
            type: 'object',
            properties: {
                public_key: {
                    type: 'string',
                    format: 'publicKey'
                }
            },
            required: [ 'public_key' ]
        }, trs.asset.signature);
        if (validateErros) {
            throw new Error(validateErros[0].message);
        }

		return trs;
	}

	async dbRead({s_publicKey, t_id}) {
		if (!s_publicKey) {
			return null;
		} else {
			const signature = {
				transaction_id: t_id,
				public_key: s_publicKey
			};

			return { signature };
		}
	}

	async dbSave({id, asset}, dbTrans) {
		// var public_key = Buffer.from(trs.asset.signature.public_key, 'hex');
		const obj = {
			transaction_id: id,
			public_key: asset.signature.public_key
        };

        return new Promise((resolve, reject) => {
            this.dao.insert('signature', obj, dbTrans,
            (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
	}

	ready({signatures}, {multisignatures, multimin}) {
		if (util.isArray(multisignatures) && multisignatures.length) {
			if (!signatures) {
				return false;
			}
			return signatures.length >= multimin - 1;
		} else {
			return true;
		}
    }

}

export default Signatures;
