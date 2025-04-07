import {MongoClient} from "mongodb";
import {Server} from "socket.io";


/**
 * Initialize the MongoDB replica set.
 *
 * @param {import("fastify").FastifyInstance} fastify
 * @return {Promise<void>}
 * @throws {Error} If the replica set initialization fails.
 */
const initializeReplicaSet = async (fastify) => {
    try {
        const directMongoClient = new MongoClient(
            "mongodb://localhost:27017",
            {replicaSet: "rs0", directConnection: true}
        );
        const response = await directMongoClient.db("admin").admin()
            .command({replSetInitiate: {}});

        fastify.log("Replica set initialized:", response);
    } catch (e) {
        if ("MongoServerError" === e.name && "AlreadyInitialized" === e.codeName) {
            return;
        }
        throw new Error(
            "Failed to initialize replica set",
            {cause: e}
        );
    }
};


/**
 * TODO: Improve this? Think about security (other queries should not be able to kick others
 *  offline; maybe add a ref count then), performance, and collision chances.
 *
 * @param {string} query
 * @param options
 * @return {string}
 */
const getQueryHash = (query, options) => JSON.stringify({query, options});


class MongoReplicaServerCollection {
    #count;

    #collection;

    #watchers;

    constructor (mongoDb, collectionName) {
        this.#count = 0;

        this.#collection = mongoDb.collection(collectionName);
        this.#watchers = new Map();
    }

    refAdd () {
        this.#count++;
    }

    /**
     * Decrement the reference count;
     */
    refRemove () {
        this.#count--;
    }

    /**
     * Check if the collection is being referenced.
     *
     * @return {boolean}
     */
    isReferenced () {
        return 0 < this.#count;
    }

    find (query, options) {
        return this.#collection.find(query, options);
    }

    getWatcher (query, options) {
        const queryHash = getQueryHash(query, options);

        let watcher = this.#watchers.get(queryHash);
        if ("undefined" === typeof watcher) {
            watcher = this.#collection.watch({
                $match: query,
            });

            this.#watchers.set(queryHash, watcher);
        }

        return {queryHash, watcher};
    }

    removeWatcher (queryHash) {
        if (this.#watchers.has(queryHash)) {
            this.#watchers.get(queryHash).close();
            this.#watchers.delete(queryHash);
        }
    }
}

class MongoReplicaServer {
    /**
     * @type {import("fastify").FastifyInstance}
     */
    #fastify;

    #collections = new Map();

    #mongoDb;

    constructor ({fastify, mongoDb}) {
        this.#fastify = fastify;
        this.#mongoDb = mongoDb;

        this.#initializeSocketServer(fastify.server);
    }

    #initializeSocketServer (httpServer) {
        const io = new Server(httpServer);

        io.on("connection", (socket) => {
            this.#fastify.log.info(`Socket connected: ${socket.id}`);
            socket.on("disconnect", () => {
                this.#fastify.log.info(`Socket disconnected: ${socket.id}`);
                const {collectionName} = socket.data;
                const collection = this.#collections.get(collectionName);
                if ("undefined" !== typeof collection) {
                    collection.refRemove();
                    if (false === collection.isReferenced()) {
                        this.#fastify.log.info(`Collection ${collectionName} removed`);
                        this.#collections.delete(collectionName);
                    }
                }
            });

            socket.on("collection::init", async ({collectionName}, callback) => {
                this.#fastify.log.info(`Collection name ${collectionName} requested`);

                let collection = this.#collections.get(collectionName);
                if ("undefined" === typeof collection) {
                    collection = new MongoReplicaServerCollection(
                        this.#mongoDb,
                        collectionName
                    );
                    this.#collections.set(collectionName, collection);
                }
                collection.refAdd();

                socket.data = {collectionName};
            });

            socket.on(
                "collection::find::toArray",
                async ({query, options}, callback) => {
                    const {collectionName} = socket.data;
                    const collection = this.#collections.get(collectionName);

                    if ("undefined" === typeof collection) {
                        return callback({
                            error: "Collection not initialized",
                        });
                    }

                    const documents = await collection.find(query, options).toArray();

                    return callback({data: documents});
                }
            );

            socket.on(
                "collection::find::toReactiveArray",
                async ({query, options}, callback) => {
                    this.#fastify.log.info(`Collection name ${socket.data.collectionName} requested subscription`);
                    const {collectionName} = socket.data;
                    const collection = this.#collections.get(collectionName);

                    if ("undefined" === typeof collection) {
                        return callback({
                            error: "Collection not initialized",
                        });
                    }

                    const {queryHash, watcher} = collection.getWatcher(query, options);
                    callback({queryHash});
                    watcher.on("change", async (change) => {
                        socket.emit("collection::find::update", {
                            data: await collection.find(query, options).toArray(),
                        });
                    });

                    socket.emit("collection::find::update", {
                        data: await collection.find(query, options).toArray(),
                    });
                }
            );

            socket.on(
                "collection::find::unsubscribe",
                ({queryHash}) => {
                    this.#fastify.log.info(`Collection name ${socket.data.collectionName} requested unsubscription`);

                    const {collectionName} = socket.data;
                    const collection = this.#collections.get(collectionName);

                    if ("undefined" === typeof collection) {
                        return;
                    }

                    collection.removeWatcher(queryHash);
                }
            );
        });
    }

    static async create ({
        fastify,
        dbName,
        mongoUri,
    }) {
        const mongoDb = await MongoReplicaServer.#initializeMongoClient({mongoUri, dbName});

        return new MongoReplicaServer({
            fastify,
            mongoDb,
        });
    }

    static async #initializeMongoClient ({mongoUri, dbName}) {
        const mongoClient = new MongoClient(mongoUri);
        try {
            await mongoClient.connect();

            return mongoClient.db(dbName);
        } catch (e) {
            throw new Error("MongoDB connection error", {cause: e});
        }
    }
}

/**
 * @typedef {object} MongoReplicaServerPluginOptions
 * @property {string} mongoUri MongoDB URI
 * @property {string} dbName Database name
 */

/**
 * MongoDB replica set plugin for Fastify.
 *
 * @param {import("fastify").FastifyInstance} app
 * @param {MongoReplicaServerPluginOptions} options
 */
const MongoReplicaServerPlugin = async (app, options) => {
    await initializeReplicaSet(app);

    app.decorate(
        "MongoReplicaServer",
        MongoReplicaServer.create({
            fastify: app,
            mongoUri: options.mongoUri,
            dbName: options.dbName,
        })
    );
};

export default MongoReplicaServerPlugin;
