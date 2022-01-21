import * as pkcs11 from 'pkcs11js';
import sequelize from 'sequelize';

import {Config} from '../Config';
import {Database} from '../Database';
import {AddressModel} from '../models/AddressModel';
import {Base64Url} from '../utils/Base64Url';

export class HsmWalletService {
  public static instance: HsmWalletService;

  public static init(config: Config, db: Database) {
    if (!HsmWalletService.instance) {
      HsmWalletService.instance = new HsmWalletService(config, db);
    }
    return HsmWalletService.instance;
  }

  private config: Config;
  private db: Database;
  private addressSchema: sequelize.Model<{}, {}>;
  private cryptoki: pkcs11.PKCS11;
  private moduleInfo: pkcs11.ModuleInfo;
  private loggedIn: boolean;

  constructor(config: Config, db: Database) {
    this.config = config;
    this.db = db;
    this.addressSchema = db.schema('address');
    this.cryptoki = new pkcs11.PKCS11();
    this.cryptoki.load(this.config.HSM_CONFIG.library);
    this.cryptoki.C_Initialize();
    this.moduleInfo = this.cryptoki.C_GetInfo();
  }

  private startSession(readOnly: boolean = true): Buffer {
    // Getting list of slots
    const slots = this.cryptoki.C_GetSlotList(true);
    if (this.config.HSM_CONFIG.slot >= slots.length) {
      throw 'Requested slot index is out of range of available slots';
    }

    const slot = slots[this.config.HSM_CONFIG.slot];

    // Getting info about slot
    const slotInfo = this.cryptoki.C_GetSlotInfo(slot);

    // Getting info about token
    const tokenInfo = this.cryptoki.C_GetTokenInfo(slot);
    const mode = readOnly ? pkcs11.CKF_SERIAL_SESSION :
                            pkcs11.CKF_RW_SESSION | pkcs11.CKF_SERIAL_SESSION;
    const session = this.cryptoki.C_OpenSession(slot, mode);

    // Getting info about Session
    const info = this.cryptoki.C_GetSessionInfo(session);
    if (this.config.HSM_CONFIG.pin) {  // CKF_LOGIN_REQUIRED
      this.cryptoki.C_Login(
          session, pkcs11.CKU_USER, this.config.HSM_CONFIG.pin);
      this.loggedIn = true;
    }
    return session;
  }

  private stopSession(session: Buffer) {
    const info = this.cryptoki.C_GetSessionInfo(session);
    if (this.loggedIn) {  // CKF_LOGIN_REQUIRED
      this.cryptoki.C_Logout(session);
      this.loggedIn = false;
    }
    this.cryptoki.C_CloseSession(session);
  }

  public async generate(): Promise<string> {
    const session = this.startSession(false);
    try {
      const random = new Buffer(32);
      this.cryptoki.C_GenerateRandom(session, random);
      console.log('radndom - ', random.toString('hex'));

      const publicKeyLabel = 'pub_' + random.toString('hex');
      const privateKeyLabel = 'priv_' + random.toString('hex');

      const publicKeyTemplate = [
        {type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PUBLIC_KEY},
        {type: pkcs11.CKA_TOKEN, value: true},
        {type: pkcs11.CKA_VERIFY, value: true},
        {type: pkcs11.CKA_LABEL, value: publicKeyLabel}, {
          type: pkcs11.CKA_EC_PARAMS,
          value: new Buffer('06052b8104000A', 'hex')
        },  // secp256k1 params 06052b8104000A
      ];

      const privateKeyTemplate = [
        {type: pkcs11.CKA_CLASS, value: pkcs11.CKO_PRIVATE_KEY},
        {type: pkcs11.CKA_TOKEN, value: true},
        {type: pkcs11.CKA_SIGN, value: true},
        {type: pkcs11.CKA_LABEL, value: privateKeyLabel}
      ];
      const mechanism: pkcs11.Mechanism = {
        mechanism: pkcs11.CKM_EC_KEY_PAIR_GEN,
        parameter: new Buffer('06052b8104000A', 'hex')
      };
      const keys = this.cryptoki.C_GenerateKeyPair(
          session, mechanism, publicKeyTemplate, privateKeyTemplate);
      const ecPointDerEnc =
          this.cryptoki
              .C_GetAttributeValue(
                  session, keys.publicKey, [{type: pkcs11.CKA_EC_POINT}])[0]
              .value! as Buffer;
      console.log(ecPointDerEnc.length);
      console.log(ecPointDerEnc.toString('hex'));
      await this.addressSchema.create({
        'privateKeyId': privateKeyLabel,
        'publicKeyId': publicKeyLabel,
        'ecPoint': ecPointDerEnc.slice(2).toString('hex')
      });
      return ecPointDerEnc.slice(2).toString('hex');
    } catch (error) {
      console.log(error);
    } finally {
      this.stopSession(session);
    }
  }

  public async sign(ecPoint: string, hash256: string):
      Promise<[string, string]> {
    const session = this.startSession();
    try {
      const res: any =
          await this.addressSchema.findOne({where: {'ecPoint': ecPoint}});
      if (res === null) {
        throw 'HSM does not have key for ' + ecPoint;
      }
      const addressModel: AddressModel = res.dataValues;

      this.cryptoki.C_FindObjectsInit(
          session,
          [{type: pkcs11.CKA_LABEL, value: addressModel.privateKeyId}]);
      const privateKey = this.cryptoki.C_FindObjects(session);
      if (!privateKey || privateKey.length === 0) {
        throw 'HSM does not have requested private key';
      }
      this.cryptoki.C_FindObjectsFinal(session);
      console.log('found private key', privateKey);
      const privateLabel =
          this.cryptoki
              .C_GetAttributeValue(
                  session, privateKey, [{type: pkcs11.CKA_LABEL}])[0]
              .value! as Buffer;

      console.log('private key label: ', privateLabel.toLocaleString());

      this.cryptoki.C_FindObjectsInit(
          session, [{type: pkcs11.CKA_LABEL, value: addressModel.publicKeyId}]);
      const publicKey = this.cryptoki.C_FindObjects(session);
      if (!publicKey || publicKey.length === 0) {
        throw 'HSM does not have requested public key';
      }
      this.cryptoki.C_FindObjectsFinal(session);
      console.log('found public key', publicKey);
      const publicLabel =
          this.cryptoki
              .C_GetAttributeValue(
                  session, publicKey, [{type: pkcs11.CKA_LABEL}])[0]
              .value! as Buffer;

      console.log('public key label: ', publicLabel.toLocaleString());

      const msgBuffer256 = Buffer.from(hash256, 'hex');
      this.cryptoki.C_SignInit(
          session, {mechanism: pkcs11.CKM_ECDSA, parameter: null}, privateKey);
      const signature =
          this.cryptoki.C_Sign(session, msgBuffer256, new Buffer(1024));

      this.cryptoki.C_VerifyInit(
          session, {mechanism: pkcs11.CKM_ECDSA, parameter: null}, publicKey);
      const verified = this.cryptoki.C_Verify(session, msgBuffer256, signature);
      if (verified) {
        const r = new Buffer(signature.slice(0, 32));
        const s = new Buffer(signature.slice(32, 64));
        return [r.toString('hex'), s.toString('hex')];
      } else {
        throw 'signing error encountered';
      }
    } catch (error) {
      console.log(error);
    } finally {
      this.stopSession(session);
    }
  }
}
