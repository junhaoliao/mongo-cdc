import Globals from "globals";

import CommonConfig from "eslint-config-yscope/CommonConfig.mjs";
import StylisticConfigArray from "eslint-config-yscope/StylisticConfigArray.mjs";


const EslintConfig = [
    CommonConfig,
    ...StylisticConfigArray,
    {
        languageOptions: {
            globals: {
                ...Globals.node,
            },
        },
    },
    {
        rules: {
            // Your own overrides
        },
    },
];


export default EslintConfig;