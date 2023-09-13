const Busboy = require("busboy");

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
    console.log(files);
    graphqlHandler(req, res);
  });

  busboy.end(req.rawBody);
};

module.exports = uploadFile;
