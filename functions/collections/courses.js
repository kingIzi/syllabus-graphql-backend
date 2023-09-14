const { ValidationError, ApolloError } = require("apollo-server-express");
const { getDownloadURL, deleteObject } = require("firebase-admin/storage");
const { v4: uuidv4 } = require("uuid");
const Syllabus = require("./syllabus");
const Authors = require("./authors");

class Courses {
  constructor(admin) {
    this.NAME = "courses";
    this.store = admin.firestore();
    this.storage = admin.storage();
    this.bucket = this.storage.bucket();
    this.collection = this.store.collection(this.NAME);
    this.authors = new Authors(admin);
  }

  async uploadStreamToStorage(fileObject, storageFileName) {
    return new Promise(async (resolve, reject) => {
      try {
        const file = this.bucket.file(storageFileName);
        const buffer = [];
        const readableStream = fileObject.createReadStream();
        readableStream.on("data", (chunk) => {
          buffer.push(chunk);
        });
        readableStream.on("end", async () => {
          const fileBuffer = Buffer.concat(buffer);
          await file.save(fileBuffer, {
            metadata: {
              contentType: fileObject.filename.mimeType,
            },
          });
          console.log(
            `Stream uploaded to Firebase Storage as ${storageFileName}`
          );
          resolve();
        });

        readableStream.on("error", (error) => {
          console.error("Error reading stream:", error);
          reject(error);
        });
      } catch (error) {
        console.error("Error uploading stream:", error);
        reject(error);
      }
    });
  }

  generateUniqueFilename(originalFilename) {
    const uniqueId = uuidv4();
    const fileExtension = originalFilename.slice(
      ((originalFilename.lastIndexOf(".") - 1) >>> 0) + 2
    );
    const uniqueFilename = `${uniqueId}.${fileExtension}`;
    return uniqueFilename;
  }

  async addNewCourse(course) {
    const added = await this.collection.add(course);
    let inserted = await added.get();
    return { id: inserted.id, ...inserted.data() };
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

  async insertNewCourse(course, files) {
    if (!course.numSyllabus || course.numSyllabus !== 0) course.numSyllabus = 0;
    if (!files) return new ValidationError("Missing image thumbnail file.");
    let courses = await this.findWhere("name", course.name, "==")
      .then((data) => {
        return data;
      })
      .catch((err) => {
        throw err;
      });
    if (courses.length !== 0)
      return new ValidationError(`${course.name} course already exists.`);
    let filename = this.generateUniqueFilename(files[0].filename.filename);
    let downloadUrl = await this.uploadStreamToStorage(
      files[0],
      `courses/${filename}`
    )
      .then(async () => {
        let fileRef = this.bucket.file(`courses/${filename}`);
        await fileRef
          .getMetadata()
          .then((data) => {
            course.thumbnailMetadata = data[0];
          })
          .catch((error) => {
            throw error;
          });
        await getDownloadURL(fileRef)
          .then((downloadUrl) => {
            course.thumbnail = downloadUrl;
          })
          .catch((err) => {
            throw err;
          });
      })
      .catch((err) => {
        throw err;
      });

    return this.addNewCourse(course)
      .then((data) => {
        return data;
      })
      .catch((err) => {
        throw err;
      });
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

  async updateCourse(courseId, course, files) {
    if (course.name) {
      let courses = await this.findWhere("name", course.name, "==")
        .then((data) => {
          return data;
        })
        .catch((err) => {
          throw err;
        });
      if (courses.length !== 0)
        return new ValidationError(`${course.name} course already exists.`);
    }
    let foundCourse = await this.findById(courseId)
      .then((data) => {
        return data;
      })
      .catch((err) => {
        throw new ApolloError(`Item not found.`);
      });

    if (files.length > 0) {
      let filename = this.generateUniqueFilename(files[0].filename.filename);
      await this.uploadStreamToStorage(files[0], `courses/${filename}`)
        .then(async () => {
          let fileRef = this.bucket.file(`courses/${filename}`);
          await fileRef
            .getMetadata()
            .then((data) => {
              course.thumbnailMetadata = data[0];
            })
            .catch((error) => {
              throw error;
            });
          await getDownloadURL(fileRef)
            .then((downloadUrl) => {
              course.thumbnail = downloadUrl;
            })
            .catch((err) => {
              throw err;
            });
        })
        .catch((err) => {
          throw err;
        });
      this.bucket
        .file(`courses/${foundCourse.thumbnailMetadata.name}`)
        .delete()
        .then(() => {
          console.log(`File deleted successfully.`);
        })
        .catch((error) => {
          console.error(`Error deleting thumbnail file:`, error);
        });
    }
    let update = await this.collection
      .doc(courseId)
      .update(course)
      .then(async (doc) => {
        return this.findById(courseId)
          .then((data) => {
            return data;
          })
          .catch((err) => {
            throw err;
          });
      })
      .catch((err) => {
        throw new ApolloError(
          `[ERROR] Failed to update ${foundCourse.name} course.`
        );
      });
    return update;
  }

  async getCourseList(batchSize, cursor) {
    let documents = this.collection;
    if (cursor) {
      let cursorDocRef = documents.doc(cursor);
      documents = documents.startAfter(cursorDocRef);
    }
    documents = documents.limit(batchSize);
    let results = await documents
      .get()
      .then((snapshot) => {
        return snapshot.docs.map((docRef) => {
          return { id: docRef.id, ...docRef.data() };
        });
      })
      .catch((error) => {
        throw new ApolloError(error);
      });
    return {
      list: results,
      cursor: results[results.length - 1]
        ? results[results.length - 1].id
        : null,
    };
  }

  async insertNewSyllabus(courseId, payload, files) {
    let syllabus = new Syllabus(this.collection.doc(courseId));
    let exists = await syllabus.existsNameUniversity(
      payload.name,
      payload.university,
      payload.yearGroup
    );
    if (exists !== 0)
      return new ValidationError(
        `${payload.name} at ${payload.university} for ${payload.yearGroup} students already exists.`
      );
    if (!files || files.length !== 1)
      return new ValidationError("Please provide a thumbnail image.");
    let author = await this.authors.findById(payload.author);
    let filename = this.generateUniqueFilename(files[0].filename.filename);
    await this.uploadStreamToStorage(files[0], `syllabus/${filename}`)
      .then(async () => {
        let fileRef = this.bucket.file(`syllabus/${filename}`);
        await fileRef
          .getMetadata()
          .then((data) => {
            payload.thumbnailMetadata = data[0];
          })
          .catch((error) => {
            throw error;
          });
        await getDownloadURL(fileRef)
          .then((downloadUrl) => {
            payload.thumbnail = downloadUrl;
          })
          .catch((err) => {
            throw err;
          });
      })
      .catch((err) => {
        throw err;
      });
    payload.lessons = [];

    let inserted = await syllabus
      .addNewSyllabus(payload)
      .then((data) => {
        return data;
      })
      .catch((err) => {
        throw new ApolloError("Failed to insert new syllabus");
      });
    return await this.findSyllabusById(inserted.id);
  }

  async getSyllabusById(syllabusId) {
    let courses = await this.collection.listDocuments();
    for (let course of courses) {
      let syllabus = new Syllabus(course);
      try {
        let found = await syllabus.findById(syllabusId);
        return found;
      } catch (error) {
        console.log("error occured");
        continue;
      }
    }
    return null;
  }

  async findSyllabusById(syllabusId) {
    let courses = await this.collection.listDocuments();
    for (let course of courses) {
      let syllabus = new Syllabus(course);
      try {
        let found = await syllabus.findById(syllabusId);
        let author = await this.authors.findById(found.author);
        found.author = author;
        return found;
      } catch (error) {
        console.log("error occured");
        continue;
      }
    }
    return null;
  }

  async getCourseSyllabus(courseId) {
    return await this.collection
      .doc(courseId)
      .collection("syllabus")
      .get()
      .then((snapshot) => {
        let data = snapshot.docs.map(async (item) => {
          let syllabus = { id: item.id, ...item.data() };
          let author = await this.authors.findById(syllabus.author);
          syllabus.author = author;
          return syllabus;
        });
        return data;
      })
      .catch((err) => {
        throw err;
      });
  }

  // async syllabusList() {
  //   let allItems = [];
  //   await this.collection
  //     .get()
  //     .then((querySnapshot) => {
  //       querySnapshot.forEach(async (doc) => {
  //         const syllabusCollectionRef = this.collection
  //           .doc(doc.id)
  //           .collection("syllabus");

  //         await syllabusCollectionRef
  //           .get()
  //           .then((syllabusSnapshot) => {
  //             syllabusSnapshot.forEach((syllabusDoc) => {
  //               const syllabusData = syllabusDoc.data();
  //               allItems.push(syllabusData);
  //               console.log(allItems);
  //             });

  //             // At this point, all items from the current subcollection have been appended to 'allItems'
  //           })
  //           .catch((error) => {
  //             console.error("Error getting subcollection documents:", error);
  //           });
  //       });
  //       // 'allItems' now contains all items from all subcollections in the 'courses' collection
  //     })
  //     .catch((error) => {
  //       console.error(
  //         "Error getting documents from the main collection:",
  //         error
  //       );
  //     });
  //   console.log(allItems);
  //   return allItems;
  // }

  async syllabusList() {
    let allItems = [];

    try {
      const querySnapshot = await this.collection.get();
      for (const doc of querySnapshot.docs) {
        const syllabusCollectionRef = this.collection
          .doc(doc.id)
          .collection("syllabus");
        const syllabusSnapshot = await syllabusCollectionRef.get();
        syllabusSnapshot.forEach(async (syllabusDoc) => {
          const syllabusData = { id: syllabusDoc.id, ...syllabusDoc.data() };
          let author = await this.authors.findById(syllabusData.author);
          syllabusData.author = author;
          allItems.push(syllabusData);
        });
      }
      return allItems;
    } catch (error) {
      console.error("Error:", error);
      throw error; // Rethrow the error to be handled by the caller
    }
  }

  async removeSyllabus(courseId, syllabusId, lessonName) {
    let syllabus = await this.getSyllabusById(syllabusId);
    syllabus.lessons = syllabus.lessons.filter(
      (item) => item.name !== lessonName
    );
    let update = {
      lessons: syllabus.lessons,
    };
    await this.collection
      .doc(courseId)
      .collection("syllabus")
      .doc(syllabusId)
      .update(update);
    return await this.findSyllabusById(syllabusId);
  }

  async updateSyllabusLessons(courseId, syllabusId, lesson, files) {
    let course = await this.findById(courseId);
    let found = await this.findSyllabusById(syllabusId);
    for (let foundLesson in found.lessons) {
      if (lesson.name === foundLesson.name)
        return new ValidationError("Lessons can not have the same name.");
    }
    if (!files) return new ValidationError("Please upload the pdf file.");
    if (files && files.length > 0) {
      let filename = this.generateUniqueFilename(files[0].filename.filename);
      await this.uploadStreamToStorage(files[0], `materials/${filename}`)
        .then(async () => {
          let fileRef = this.bucket.file(`materials/${filename}`);
          await fileRef
            .getMetadata()
            .then((data) => {
              lesson.metadata = data[0];
            })
            .catch((error) => {
              throw error;
            });
          await getDownloadURL(fileRef)
            .then((downloadUrl) => {
              lesson.url = downloadUrl;
            })
            .catch((err) => {
              throw err;
            });
        })
        .catch((err) => {
          throw err;
        });
    }
    found.lessons.push(lesson);
    let payload = { lessons: [...found.lessons] };
    let added = await this.collection
      .doc(courseId)
      .collection("syllabus")
      .doc(syllabusId)
      .update(payload);
    return await this.findSyllabusById(syllabusId);
  }
}

module.exports = Courses;
