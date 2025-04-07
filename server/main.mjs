import Fastify from "fastify";

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

await app.listen({port: 5000});
