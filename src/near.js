import * as NearApi from "near-api-js";

function loadNativeBalance(account_id) {
    return new Promise(function (resolve, reject) {
        const nearConfig = getConfig("mainnet");
        NearApi.connect({
            deps: {
                keyStore: new NearApi.keyStores.BrowserLocalStorageKeyStore()
            },
            ...nearConfig
        }).then((near) => {
            near.account(account_id).then((account) => {
                account.getAccountBalance().then((balance) => {
                    if (balance) {
                        resolve(parseFloat(NearApi.utils.format.formatNearAmount(balance?.available, 4)));
                    } else {
                        resolve(0);
                    }
                }).catch((e) => {
                    console.log(e);
                    resolve(0);
                });
            });
        });
    });
}

function getSignUrl(account_id, method, params, deposit, gas, receiver_id, meta, callback_url, network) {
    if (!network)
        network = "mainnet";

    return new Promise(function (resolve, reject) {

        let actions = [];
        if (typeof receiver_id == 'string') {
            const deposit_value = typeof deposit == 'string' ? deposit : NearApi.utils.format.parseNearAmount('' + deposit);
            actions = [NearApi.transactions.functionCall(method, Buffer.from(JSON.stringify(params)), gas, deposit_value)];
        } else if (receiver_id.length === method.length
            && receiver_id.length === params.length
            && receiver_id.length === gas.length
            && receiver_id.length === deposit.length
        ) {
            for (let i = 0; i < receiver_id.length; i++) {
                const deposit_value = typeof deposit[i] == 'string' ? deposit[i] : NearApi.utils.format.parseNearAmount('' + deposit[i]);
                actions.push([NearApi.transactions.functionCall(method[i], Buffer.from(JSON.stringify(params[i])), gas[i], deposit_value)]);
            }
        } else {
            alert("Illegal parameters");
            reject();
        }

        const keypair = NearApi.utils.KeyPair.fromRandom('ed25519');
        const provider = new NearApi.providers.JsonRpcProvider('https://rpc.' + network + '.near.org');
        provider.block({finality: 'final'}).then((block) => {

            let txs = [];
            if (typeof receiver_id == 'string') {
                txs = [NearApi.transactions.createTransaction(account_id, keypair.publicKey, receiver_id, 1, actions, NearApi.utils.serialize.base_decode(block.header.hash))];
            } else {
                for (let i = 0; i < receiver_id.length; i++) {
                    txs.push(NearApi.transactions.createTransaction(account_id, keypair.publicKey, receiver_id[i], i, actions[i], NearApi.utils.serialize.base_decode(block.header.hash)));
                }
            }

            const newUrl = new URL('sign', 'https://wallet.' + network + '.near.org/');
            newUrl.searchParams.set('transactions', txs
                .map(transaction => NearApi.utils.serialize.serialize(NearApi.transactions.SCHEMA, transaction))
                .map(serialized => Buffer.from(serialized).toString('base64'))
                .join(','));
            if (callback_url)
                newUrl.searchParams.set('callbackUrl', callback_url);
            if (meta)
                newUrl.searchParams.set('meta', meta);

            resolve(newUrl.href);
        }).catch(() => {
            reject()
        });
    });
}



function getConfig(env) {
    switch (env) {
        case 'mainnet':
            return {
                networkId: 'mainnet',
                nodeUrl: 'https://rpc.mainnet.near.org',
                walletUrl: 'https://wallet.near.org',
                helperUrl: 'https://helper.mainnet.near.org'
            }
        case 'testnet':
            return {
                networkId: 'default',
                nodeUrl: 'https://rpc.testnet.near.org',
                walletUrl: 'https://wallet.testnet.near.org',
                helperUrl: 'https://helper.testnet.near.org'
            }
        default:
            throw Error(`Unconfigured environment '${env}'. Can be configured in src/config.js.`)
    }
}

export {getSignUrl, loadNativeBalance}