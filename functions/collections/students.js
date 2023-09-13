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
}

module.exports = Students;
