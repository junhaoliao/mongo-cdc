import MongoReplicaCollectionCursor from "./MongoReplicaCollectionCursor.js";

class MongoReplicaCollectionReactiveCursor extends MongoReplicaCollectionCursor {
    /**
     * @type {{onData: Function, onError: Function}}
     */
    #listener;

    constructor (props) {
        super(props);

        this.socket.on("collection::find::update", (response) => {
            if (response.error) {
                return this.#listener.onError(response.error);
            }

            return this.#listener.onData(response.data);
        });
    }

    /**
     * Subscribe to the collection
     *
     * @param {{onData: Function, onError: Function}} callback
     * @return {function(): void} The cleanup function.
     */
    toReactiveArray (callback) {
        let queryHash = null;
        this.socket.emit("collection::find::toReactiveArray", {
            query: this.findQuery,
            options: this.findOptions,
        }, (response) => {
            if (response.error) {
                return callback.onError(response.error);
            }

            ({queryHash} = response);

            this.#listener = callback;
        });

        return () => {
            // TODO: the server should also rely on some heartbeat from the client
            //  for deciding when to free the resources.
            this.socket.emit("collection::find::unsubscribe", {
                queryHash: queryHash,
            });

            this.socket.off("collection::find::update");
        };
    }
}

export default MongoReplicaCollectionReactiveCursor;
