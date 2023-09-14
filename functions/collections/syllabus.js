const { ValidationError, ApolloError } = require("apollo-server-express");

class Syllabus {
  constructor(doc) {
    this.NAME = "syllabus";
    this.collection = doc.collection(this.NAME);
  }

  async addNewSyllabus(syllabus) {
    const added = await this.collection.add(syllabus);
    let inserted = await added.get();
    return { id: inserted.id, ...inserted.data() };
  }

  async findById(documentId) {
    return await this.collection
      .doc(documentId)
      .get()
      .then((doc) => {
        if (!doc.exists)
          throw new ValidationError(`${documentId} Item not found.`);
        return { id: doc.id, ...doc.data() };
      })
      .catch((error) => {
        throw new ApolloError(`Item not found`);
      });
  }

  async existsNameUniversity(name, university, yearGroup) {
    return await this.collection
      .where("name", "==", name)
      .where("university", "==", university, "yearGroup", "==", yearGroup)
      .get()
      .then((querySnapshot) => {
        return querySnapshot.size;
      })
      .catch((err) => {
        console.log("Error getting course reference", err);
      });
  }

  async getList() {
    return await this.collection.listDocuments().then((documents) => {
      let map = documents.map((ref) => {
        {
          return { id: ref.id, ...ReadableByteStreamController.data() };
        }
      });
      console.log(map);
    });
  }
}

module.exports = Syllabus;
