import * as msgpack from "@msgpack/msgpack";
import Fastify from "fastify";
import mysql from "mysql2/promise";

import MongoReplicaServerPlugin from "./MongoReplicaServerPlugin.mjs";


// eslint-disable-next-line new-cap
const app = Fastify({
    logger: {
        transport: {
            target: "pino-pretty",
        },
    },
});

app.register(MongoReplicaServerPlugin, {
    mongoUri: "mongodb://localhost:27017",
    dbName: "clp-query-results",
});

app.get("/query/:query", async (request, reply) => {
    const connection = await mysql.createConnection(
        "mysql://clp-user:QyRyCArzESA@localhost:3306/clp-db"
    );
    const query = await connection.query(
        "INSERT INTO query_jobs (job_config, type) VALUES (?, 0)",
        [
            Buffer.from(msgpack.encode({
                query_string: request.params.query,
                begin_timestamp: 0,
                end_timestamp: 1775560765291,
                ignore_case: true,
                max_num_results: 1000,
            })),
        ]
    );

    reply.send(query[0].insertId);

    console.log(query);
});

await app.listen({port: 5000});
