class MongoReplicaCollectionCursor {
    socket;

    findQuery;

    findOptions;

    constructor ({socket, query, options}) {
        this.socket = socket;

        this.findQuery = query;
        this.findOptions = options;
    }

    sort (sort) {
        this.findOptions = {
            ...this.findOptions,
            sort: sort,
        };

        return this;
    }

    limit (number) {
        this.findOptions = {
            ...this.findOptions,
            limit: number,
        };

        return this;
    }

    skip (offset) {
        this.findOptions = {
            ...this.findOptions,
            skip: offset,
        };

        return this;
    }

    toArray () {
        return new Promise((resolve, reject) => {
            this.socket.emit("collection::find::toArray", {
                query: this.findQuery,
                options: this.findOptions,
            }, (response) => {
                if (response.error) {
                    return reject(response.error);
                }

                return resolve(response.data);
            });
        });
    }
}


export default MongoReplicaCollectionCursor;
