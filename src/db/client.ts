import { Pool, PoolClient } from "../deps.ts";
import { config } from "../config.ts";

class Database {
    private pool: Pool;

    constructor() {
        this.pool = new Pool(config.DB_URL, 10);
    }

    async withClient<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            return await operation(client);
        } finally {
            client.release();
        }
    }

    async query(sql: string, params?: unknown[]) {
        return await this.withClient((client) => client.queryObject(sql, params));
    }
}

export const db = new Database();