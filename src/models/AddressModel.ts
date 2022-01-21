import * as sequelize from 'sequelize';

export class AddressModel {
  public btcAddress: string;
  public privateKeyId: string;
  public publicKeyId: string;
  public ecdsaX: string;
  public ecdsaY: string;

  public static schema = {
    privateKeyId: {type: sequelize.STRING, allowNull: false},
    publicKeyId: {type: sequelize.STRING, allowNull: false},
    ecPoint: {type: sequelize.STRING, primaryKey: true}
  };
}
