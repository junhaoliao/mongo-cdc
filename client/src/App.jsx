import {useEffect, useRef, useState} from "react";
import {io} from "socket.io-client";

const App = () => {
    const [documents, setDocuments] = useState([]);
    const hasInitedRef = useRef(false);

    useEffect(() => {
        if (true === hasInitedRef.current) {
            return;
        }
        hasInitedRef.current = true;

        const collectionName = "result-cache-0";

        const socket = io("http://localhost:5000");

        socket.emit("getCollection", {
            collectionName: collectionName,
        });

        socket.on("initialDocuments", ({data}) => {
            setDocuments(data);
        });
        socket.on("updateDocuments", ({change}) => {
            setDocuments((prevDocs) => {
                if (change.operationType === "insert") {
                    return [...prevDocs, change.fullDocument];
                } else if (change.operationType === "delete") {
                    return prevDocs.filter(doc => doc._id !== change.documentKey._id);
                } else if (change.operationType === "update") {
                    return prevDocs.map(doc => doc._id === change.documentKey._id
                        ? {...doc, ...change.updateDescription.updatedFields}
                        : doc);
                } else {
                    console.log(change);
                }

                return prevDocs;
            });
        });
    }, []);

    return (<>
        {documents.map((doc, index) => (<p key={index}>{JSON.stringify(doc)}</p>))}
    </>);
};

export default App;
