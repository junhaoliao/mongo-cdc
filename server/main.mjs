import {MongoClient} from "mongodb";
import {Server} from "socket.io";
import Fastify from "fastify";
import FastifyCors from "@fastify/cors";

const app = Fastify({
    logger: {
        transport: {
            target: "pino-pretty",
        },
    },
});
await app.register(FastifyCors, {
    origin: "*",
});

const io = new Server(app.server, {
    cors: {
        origin: "*",
    },
});

// Init replica set if not init'ed
try {
    const mongoClient = new MongoClient("mongodb://localhost:27017",
        {replicaSet: "rs0", directConnection: true});
    const response = await mongoClient.db("admin").admin().command({replSetInitiate: {}});
    console.log(response);
} catch (error) {
    console.error(error);
}

const client = new MongoClient("mongodb://localhost:27017");
const collection = client.db("test").collection("result-cache-0");

setInterval(() => {
    collection.insertOne({timestamp: Date.now()}).then(() => {
        app.log.debug("Inserted");
    }).catch(console.error);
}, 1000);

// collectionName: string -> { 
//     collectionWatcher: WatcherObject,
//     callbacks: ChangeCallbackFunc[], // instead, maybe a Map: clientName -> ChangeCallbackFunc
// }
const watches = new Map();

collection.watch().on("change", (change) => {
    app.log.debug(change);
});

io.on("connection", (socket) => {
    socket.on("getCollection", async ({collectionName}) => {
        app.log.info(`Collection name ${collectionName} requested`);
        if ("result-cache-0" !== collectionName) {
            throw new Error(`Collection name ${collectionName} not currently supported`);
        }

        socket.emit("initialDocuments", {
            data: await collection.find().toArray(),
        });
        if (false === watches.has(collectionName)) {
            watches.set(collectionName, collection.watch());
        }
        watches.get(collectionName).on("change", (change) => {
            socket.emit("updateDocuments", {
                change: change,
            });
        });
    });
});

await app.listen({port: 5000});
