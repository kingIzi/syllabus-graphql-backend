// const functions = require("firebase-functions");

// const express = require("express");
// const { ApolloServer, gql } = require("apollo-server-express");

// const typeDefs = gql`
//   type Query {
//     message: String!
//   }
// `;
// const resolvers = {
//   Query: {
//     message: (parent, args, context, info) => {
//       return "Hello graphql";
//     },
//   },
// };

// const app = express();

// const server = new ApolloServer({ typeDefs, resolvers });

// (async () => {
//   await server.start();
//   server.applyMiddleware({ app, path: "/", cors: true });
//   console.log("Server running...");
// })();

// exports.graphql = functions.https.onRequest(app);

const { onRequest, functions } = require("firebase-functions/v2/https");
const { ApolloServer } = require("apollo-server-cloud-functions");
const Busboy = require("busboy");
const typeDefs = require("./typeDefs");
const resolvers = require("./resolvers");

const context = ({ req }) => ({ req });

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
});

const graphqlHandler = server.createHandler({ cors: true });

const uploadFile = (req, res) => {
  const busboy = Busboy({ headers: req.headers });
  let query = "";
  let variables = {};
  const files = [];

  const addFile = (file, files) => {
    files.push(file);
    return files;
  };

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    req.body = {
      files: addFile(
        { fieldname, createReadStream: () => file, filename, mimetype },
        files
      ),
      query,
      variables,
    };
    busboy.emit("finish");
  });

  busboy.on("field", (fieldname, value) => {
    if (fieldname === "operations") {
      const { query: extractedQuery, variables: extractedVariables } =
        JSON.parse(value);
      query = extractedQuery;
      variables = extractedVariables || {};
    }
  });

  busboy.on("finish", () => {
    graphqlHandler(req, res);
  });

  busboy.end(req.rawBody);
};

exports.helloWorld = onRequest((req, res) => {
  if (
    req.method === "POST" &&
    req.headers["content-type"] &&
    req.headers["content-type"].startsWith("multipart/form-data")
  ) {
    uploadFile(req, res);
  } else {
    graphqlHandler(req, res);
  }
});
