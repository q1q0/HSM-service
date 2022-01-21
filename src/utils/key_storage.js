"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webcrypto = require("webcrypto-core");
const WebCryptoError = webcrypto.WebCryptoError;
const graphene_pk11_1 = require("graphene-pk11");
const webcrypto_core_1 = require("webcrypto-core");
const rsa_1 = require("./crypto/rsa");
const key_1 = require("./key");
const OBJECT_TYPES = [graphene_pk11_1.ObjectClass.PRIVATE_KEY, graphene_pk11_1.ObjectClass.PUBLIC_KEY, graphene_pk11_1.ObjectClass.SECRET_KEY];
class KeyStorage {
    constructor(crypto) {
        this.crypto = crypto;
    }
    async keys() {
        const keys = [];
        OBJECT_TYPES.forEach((objectClass) => {
            this.crypto.session.find({ class: objectClass, token: true }, (obj) => {
                const item = obj.toType();
                keys.push(key_1.CryptoKey.getID(item));
            });
        });
        return keys;
    }
    async indexOf(item) {
        if (item instanceof key_1.CryptoKey && item.key.token) {
            return key_1.CryptoKey.getID(item.key);
        }
        return null;
    }
    async clear() {
        const keys = [];
        OBJECT_TYPES.forEach((objectClass) => {
            this.crypto.session.find({ class: objectClass, token: true }, (obj) => {
                keys.push(obj);
            });
        });
        keys.forEach((key) => {
            key.destroy();
        });
    }
    async getItem(key, algorithm, usages) {
        const subjectObject = this.getItemById(key);
        if (subjectObject) {
            const p11Key = subjectObject.toType();
            let alg;
            if (algorithm) {
                alg = webcrypto_core_1.PrepareAlgorithm(algorithm);
            }
            else {
                alg = {};
                switch (p11Key.type) {
                    case graphene_pk11_1.KeyType.RSA: {
                        if (p11Key.sign || p11Key.verify) {
                            alg.name = "RSASSA-PKCS1-v1_5";
                        }
                        else {
                            alg.name = "RSA-OAEP";
                        }
                        alg.hash = { name: "SHA-256" };
                        break;
                    }
                    case graphene_pk11_1.KeyType.EC: {
                        if (p11Key.sign || p11Key.verify) {
                            alg.name = "ECDSA";
                        }
                        else {
                            alg.name = "ECDH";
                        }
                        const attributes = p11Key.getAttribute({ paramsECDSA: null });
                        const pointEC = graphene_pk11_1.NamedCurve.getByBuffer(attributes.paramsECDSA);
                        let namedCurve;
                        switch (pointEC.name) {
                            case "secp192r1":
                                namedCurve = "P-192";
                                break;
                            case "secp256r1":
                                namedCurve = "P-256";
                                break;
                            case "secp256k1":
                                namedCurve = "K-256";
                                break;
                            case "secp384r1":
                                namedCurve = "P-384";
                                break;
                            case "secp521r1":
                                namedCurve = "P-521";
                                break;
                                
                            default:
                                throw new Error(`Unsupported named curve for EC key '${pointEC.name}'`);
                        }
                        alg.namedCurve = namedCurve;
                        break;
                    }
                    case graphene_pk11_1.KeyType.AES: {
                        if (p11Key.sign || p11Key.verify) {
                            alg.name = "AES-HMAC";
                        }
                        else {
                            alg.name = "AES-CBC";
                        }
                        break;
                    }
                    default:
                        throw new Error(`Unsupported type of key '${graphene_pk11_1.KeyType[p11Key.type] || p11Key.type}'`);
                }
            }
            let CryptoKeyClass;
            switch (alg.name.toUpperCase()) {
                case webcrypto_core_1.AlgorithmNames.RsaOAEP.toUpperCase():
                case webcrypto_core_1.AlgorithmNames.RsaSSA.toUpperCase():
                case webcrypto_core_1.AlgorithmNames.RsaPSS.toUpperCase():
                    CryptoKeyClass = rsa_1.RsaCryptoKey;
                    break;
                default:
                    CryptoKeyClass = key_1.CryptoKey;
            }
            return new CryptoKeyClass(p11Key, alg);
        }
        else {
            return null;
        }
    }
    async removeItem(key) {
        const sessionObject = this.getItemById(key);
        if (sessionObject) {
            sessionObject.destroy();
        }
    }
    async setItem(data) {
        if (!(data instanceof key_1.CryptoKey)) {
            throw new WebCryptoError("Parameter 1 is not P11CryptoKey");
        }
        const p11Key = data;
        if (!(this.hasItem(data) && p11Key.key.token)) {
            const obj = this.crypto.session.copy(p11Key.key, {
                token: true,
            });
            return key_1.CryptoKey.getID(obj.toType());
        }
        else {
            return data.id;
        }
    }
    hasItem(key) {
        const item = this.getItemById(key.id);
        return !!item;
    }
    getItemById(id) {
        let key = null;
        OBJECT_TYPES.forEach((objectClass) => {
            this.crypto.session.find({ class: objectClass, token: true }, (obj) => {
                const item = obj.toType();
                if (id === key_1.CryptoKey.getID(item)) {
                    key = item;
                    return false;
                }
            });
        });
        return key;
    }
}
exports.KeyStorage = KeyStorage;
