import sequelize from 'sequelize';
import {Config} from './Config';
import {AddressModel} from './models/AddressModel';

export class Database {
  private db: sequelize.Sequelize;
  private schemas: {[id: string]: sequelize.Model<{}, {}>};

  constructor(public config: Config) {
    this.config = config;
    const SQL = this.config.SQL;

    this.db = new sequelize(
        SQL.database,
        SQL.user,
        SQL.password,
        {operatorsAliases: false, dialect: SQL.dialect, host: SQL.host},
    );

    this.schemas = {'address': this.db.define('address', AddressModel.schema)};

    this.db.sync();
  }

  public schema(name: string) {
    return this.schemas[name];
  }
}
