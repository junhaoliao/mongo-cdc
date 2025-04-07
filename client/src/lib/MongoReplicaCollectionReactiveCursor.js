import MongoReplicaCollectionCursor from "./MongoReplicaCollectionCursor.js";

class MongoReplicaCollectionReactiveCursor extends MongoReplicaCollectionCursor {
    /**
     * @type {Set<{onData: Function, onError: Function}>}
     */
    #listeners;

    constructor (props) {
        super(props);

        this.#listeners = new Set();

        this.socket.on("collection::find::update", (response) => {
            if (response.error) {
                return this.#listeners.forEach(({onError}) => onError(response.error));
            }

            return this.#listeners.forEach(({onData}) => onData(response.data));
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

            return this.#listeners.add(callback);
        });

        return () => {
            // TODO: the server should also rely on some heartbeat from the client
            //  for deciding when to free the resources.
            this.socket.emit("collection::find::unsubscribe", {
                queryHash: queryHash,
            });

            this.#listeners.delete(callback);
        };
    }
}

export default MongoReplicaCollectionReactiveCursor;
