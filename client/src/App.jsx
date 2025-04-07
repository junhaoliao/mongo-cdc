import {useMemo} from "react";

import MongoReplicaCollection from "./lib/MongoReplicaCollection.js";
import {useTracker} from "./lib/useTracker.jsx";


/**
 * Main application component.
 *
 * @return {React.ReactNode} The rendered component.
 */
const App = () => {
    const resultsCollection = useMemo(
        () => new MongoReplicaCollection("3"),
        []
    );

    const results = useTracker(
        () => resultsCollection.find({}),
        [resultsCollection]
    );

    return (
        <>
            {results.map((doc, index) => (
                <p key={index}>
                    {JSON.stringify(doc)}
                </p>
            ))}
        </>
    );
};

export default App;
