import { expect } from 'chai';
import { HsmWalletService } from '../src/services/SecurityModuleService'
import {Config} from '../src/Config';
import {Database} from '../src/Database';
import { ec as EC } from 'elliptic';
var ec = new EC('secp256k1');

const config = new Config();
const db = new Database(config);
HsmWalletService.init(config, db);

describe('generating an ecpoint', () => {
  it('checks length of the ecpoint generated', async () => {
    const ecpoint:string = await HsmWalletService.instance.generate()
    expect(ecpoint.length).to.equal(130);
  });
});
describe('signing a message', () => {
  it('validating signature generated', async () => {
    const ecpoint:string = await HsmWalletService.instance.generate()
    const pubkey = ec.keyFromPublic(ecpoint, 'hex');
    const message = "688787d8ff144c502c7f5cffaafe2cc588d86079f9de88304c26b0cb99ce91c6"
    const [r,s] = await HsmWalletService.instance.sign(ecpoint,message)
    const sig = {r,s}
    const verification = pubkey.verify(message, sig)
    expect(verification).to.equal(true);
  });
});