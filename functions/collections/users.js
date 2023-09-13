const axios = require("axios");
const { ValidationError } = require("apollo-server-cloud-functions");

class Users {
  constructor(admin) {
    this.NAME = "users";
    this.apiKey = "AIzaSyA-qupn4cWUvOb9S2qs1SikLZPiS_cbT5g";
    this.store = admin.firestore();
    this.collection = this.store.collection(this.NAME);
  }

  async #signUp(payload) {
    try {
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.apiKey}`;
      const response = await axios.post(url, payload);
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      } else {
        return null;
      }
    }
  }

  async #signIn(payload) {
    try {
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.apiKey}`;
      const response = await axios.post(url, payload);
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      } else {
        return null;
      }
    }
  }

  #createSignUpPayload(email, password, returnSecureToken) {
    return {
      email: email,
      password: password,
      returnSecureToken: returnSecureToken,
    };
  }

  async addNewUser(user) {
    const added = await this.collection.add(user);
    let inserted = await added.get();
    return { id: inserted.id, ...inserted.data() };
  }

  async loginUser(user) {
    let signInPayload = this.#createSignUpPayload(
      user.email,
      user.password,
      true
    );
    let signInRes = await this.#signIn(signInPayload)
      .then((data) => {
        return data;
      })
      .catch((err) => {
        throw err;
      });
    if (signInRes === null) {
      return new ValidationError(
        "Internal server error. Please contact support."
      );
    } else if ("error" in signInRes) {
      return new ValidationError(signInRes.error.message);
    } else {
      let data = await this.findWhere("localId", signInRes.localId, "==")
        .then((data) => {
          return data;
        })
        .catch((err) => {
          throw err;
        });

      return data[0];
    }
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

  async registerUser(user) {
    let signUpPayload = this.#createSignUpPayload(
      user.email,
      user.password,
      true
    );
    let signUpRes = await this.#signUp(signUpPayload)
      .then((data) => {
        return data;
      })
      .catch((err) => {
        throw err;
      });
    if (signUpRes === null) {
      return new ValidationError(
        "Internal server error. Please contact support."
      );
    } else if ("error" in signUpRes) {
      return new ValidationError(signUpRes.error.message);
    } else {
      const userPayload = {
        email: signUpRes.email,
        localId: signUpRes.localId,
        role: user.role,
        phoneNo: user.phoneNo,
        fullName: user.fullName,
      };
      return await this.addNewUser(userPayload)
        .then((data) => {
          return data;
        })
        .catch((err) => {
          throw err;
        });
    }
  }
}

module.exports = Users;
