import {io} from "socket.io-client";

import MongoReplicaCollectionReactiveCursor from "./MongoReplicaCollectionReactiveCursor.js";


class MongoReplicaCollection {
    #socket;

    constructor (collectionName) {
        // TODO: use the server URL from the environment / constructor args
        this.#socket = io();

        this.#socket.emit("collection::init", {
            collectionName: collectionName,
        });
    }

    find (query, options) {
        return new MongoReplicaCollectionReactiveCursor({
            options: options,
            query: query,
            socket: this.#socket,
        });
    }
}

/**
 *
 */
const main = async () => {
    const collection = new MongoReplicaCollection("3");
    const cursor = collection.find({}, {}, {});

    console.log(await cursor.toArray());
};

//
// await main();

export default MongoReplicaCollection;
