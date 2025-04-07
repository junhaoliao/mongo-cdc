import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import axios from "axios";

import MongoReplicaCollection from "./lib/MongoReplicaCollection.js";
import {useTracker} from "./lib/useTracker.jsx";


/**
 * Main application component.
 *
 * @return {React.ReactNode} The rendered component.
 */
const App = () => {
    const [resultsCollection, setResultsCollection] = useState(
        new MongoReplicaCollection("3")
    );

    const [limit, setLimit] = useState(1000);
    const [order, setOrder] = useState(-1);
    const results = useTracker(
        () => {
            return resultsCollection.find({}).limit(limit)
                .sort({timestamp: order});
        },
        [
            resultsCollection,
            limit,
            order,
        ]
    );

    const handleButtonClick = async () => {
        const query = document.getElementById("query").value;
        const limitValue = document.getElementById("limit").value;
        const orderValue = document.getElementById("order").value;
        setLimit(Number(limitValue));
        setOrder(Number(orderValue));

        const {data} = await axios.get(`/query/${query}`);
        setResultsCollection(new MongoReplicaCollection(data.toString()));
    };

    return (
        <>
            <form>
                <label>
                    query:
                </label>
                <input
                    id={"query"}
                    name={"query"}
                    type={"text"}/>

                <label>
                    limit:
                </label>
                <input
                    id={"limit"}
                    name={"limit"}
                    type={"text"}/>

                <label>
                    order:
                </label>
                <input
                    id={"order"}
                    name={"order"}
                    type={"text"}/>
            </form>
            <button onClick={handleButtonClick}>click to submit new</button>
            {results.map((doc, index) => (
                <p key={index}>
                    {JSON.stringify(doc)}
                </p>
            ))}
        </>
    );
};

export default App;
