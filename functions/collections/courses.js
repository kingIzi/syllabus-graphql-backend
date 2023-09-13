const { ValidationError, ApolloError } = require("apollo-server-express");
const { getDownloadURL, deleteObject } = require("firebase-admin/storage");
const { v4: uuidv4 } = require("uuid");

class Courses {
  constructor(admin) {
    this.NAME = "courses";
    this.store = admin.firestore();
    this.storage = admin.storage();
    this.bucket = this.storage.bucket();
    this.collection = this.store.collection(this.NAME);
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

  #generateUniqueFilename(originalFilename) {
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
    let filename = this.#generateUniqueFilename(files[0].filename.filename);
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
      let filename = this.#generateUniqueFilename(files[0].filename.filename);
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
}

module.exports = Courses;
