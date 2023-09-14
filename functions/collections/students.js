class Students {
  constructor(admin) {
    this.NAME = "students";
    this.store = admin.firestore();
    this.storage = admin.storage();
    this.collection = this.store.collection(this.NAME);
  }
  async addNewStudent(student) {
    const added = await this.collection.add(student);
    let inserted = await added.get();
    return { id: inserted.id, ...inserted.data() };
  }
  async insertNewStudent(student) {
    let stud = await this.addNewStudent(student)
      .then((data) => {
        return data;
      })
      .catch((err) => {
        throw err;
      });
    return stud;
  }

  async findWhere(key, value, operation) {
    return await this.collection
      .where(key, operation, value)
      .get()
      .then((querySnapshot) => {
        let matchingDocuments = [];
        querySnapshot.forEach((doc) => {
          matchingDocuments.push({ id: doc.id, ...doc.data() });
        });
        return matchingDocuments;
      })
      .catch((error) => {
        console.error("Error retrieving documents:", error);
        throw new ApolloError(fetchError);
      });
  }
}

module.exports = Students;
