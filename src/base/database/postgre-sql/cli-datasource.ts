import { DataSource } from 'typeorm';
import { ORM_CONFIG } from './orm.config';

/**
 * Entry point for the TypeORM CLI only (`typeorm -d dist/.../cli-datasource.js`).
 * Kept out of orm.config.ts so importing the shared options never constructs a
 * DataSource as a side effect — that would require the DB driver at import time,
 * even in tests and in projects that reuse base/ without Postgres.
 */
export const connectionSource = new DataSource(ORM_CONFIG);
export default connectionSource;
