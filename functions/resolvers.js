const admin = require("./init-firebase");
const Users = require("./collections/users");
const Students = require("./collections/students");
const Courses = require("./collections/courses");
const Authors = require("./collections/authors");

const resolvers = {
  Query: {
    message: (parent, args, context, info) => {
      return "Hello graphql";
    },
    findCourseById: async (parent, args, context, info) => {
      const courses = new Courses(admin);
      return await courses
        .findById(args.courseId)
        .then((data) => {
          return data;
        })
        .catch((err) => {
          throw err;
        });
    },
    getCourseList: (parent, args, context, info) => {
      const courses = new Courses(admin);
      return courses.getCourseList(args.batchSize, args.cursor);
    },
  },
  Mutation: {
    uploadFile: async (parent, args, context, info) => {
      console.log(args);
      return null;
    },
    signUp: async (parent, args, context, info) => {
      const users = new Users(admin);
      return users.registerUser(args.user);
    },
    signIn: async (parent, args, context, info) => {
      const users = new Users(admin);
      return users.loginUser(args.user);
    },
    addStudent: async (parent, args, context, info) => {
      const students = new Students(admin);
      return students.insertNewStudent(args.student);
    },
    addCourse: async (parent, args, context, info) => {
      const courses = new Courses(admin);
      return courses.insertNewCourse(args.course, context.req.body.files);
    },
    updateCourse: async (parent, args, context, info) => {
      const courses = new Courses(admin);
      return courses.updateCourse(
        args.courseId,
        args.course,
        context.req.body.files
      );
    },
    addAuthor: async (parent, args, context, info) => {
      const authors = new Authors(admin);
      return authors
        .addNewAuthor(args.author)
        .then((data) => {
          return data;
        })
        .catch((err) => {
          throw err;
        });
    },
  },
};

module.exports = resolvers;
