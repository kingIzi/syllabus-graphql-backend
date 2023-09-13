const admin = require("firebase-admin");
require("./syllabusTz_service_account.json");

admin.initializeApp({
  credential: admin.credential.cert("./syllabusTz_service_account.json"),
  databaseURL:
    "https://syllabustz-bd7fd-default-rtdb.asia-southeast1.firebasedatabase.app/",
  storageBucket: "gs://syllabustz-bd7fd.appspot.com/",
});

module.exports = admin;
