const { ValidationError, ApolloError } = require("apollo-server-express");

class Authors {
  constructor(admin) {
    this.NAME = "authors";
    this.store = admin.firestore();
    this.storage = admin.storage();
    this.collection = this.store.collection(this.NAME);
  }

  async addNewAuthor(author) {
    const added = await this.collection.add(author);
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
        throw new ApolloError(`Author not found`);
      });
  }

  async insertNewStudent(author) {
    let aut = await this.addNewAuthor(author);
    return aut;
  }
}

module.exports = Authors;
