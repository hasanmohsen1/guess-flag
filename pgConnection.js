const dotenv = require("dotenv");
const { Pool } = require("pg");
//.env file
dotenv.config();

//POSTGRESQL Database
const isProduction = process.env.NODE_ENV === "production";
//const connectionString = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    max: 10,
    idleTimeoutMillis: 30000,
    ssl: isProduction,
});

// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on("error", (err, client) => {
    console.error("Unexpected error in database-pool", err);
});

const query = (sql_query, params) => {
    params = Array.isArray(params) ? params : [];

    return new Promise(function (resolve, reject) {
        (async () => {
            try {
                const result = await pool.query(sql_query, params);
                resolve(result.rows);
            } catch (error) {
                reject(error.stack);
            }
        })();
    });
};

module.exports = query;
