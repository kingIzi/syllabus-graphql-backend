const { gql } = require("apollo-server-cloud-functions");

const typeDefs = gql`
  scalar Upload
  type File {
    filename: String!
    mimetype: String!
    encoding: String!
    url: String!
  }
  type StorageObject {
    kind: String!
    id: String!
    selfLink: String!
    mediaLink: String!
    name: String!
    bucket: String!
    generation: String!
    metageneration: String!
    contentType: String!
    storageClass: String!
    size: String!
    md5Hash: String!
    crc32c: String!
    etag: String!
    timeCreated: String!
    updated: String!
    timeStorageClassUpdated: String!
  }
  type Student {
    id: ID!
    university: String!
    yearGroup: String!
    course: String!
    favorites: [ID]
    recent: [ID]
    localId: String!
  }
  input StudentInput {
    university: String
    yearGroup: String
    course: String
    favorites: [ID]
    recent: [ID]
    localId: String!
  }
  type Course {
    id: ID!
    name: String!
    universities: [String!]!
    numSyllabus: Int!
    thumbnail: String!
    thumbnailMetadata: StorageObject!
  }
  input CourseInput {
    name: String
    universities: [String]
    numSyllabus: Int
  }
  type CourseList {
    list: [Course]
    cursor: String
  }
  type Lesson {
    name: String!
    url: String!
    metadata: StorageObject!
    description: String!
  }
  input LessonInput {
    name: String
    description: String
  }
  type Syllabus {
    id: String!
    name: String!
    author: Author!
    languages: [String!]!
    university: String!
    yearGroup: String!
    thumbnail: String!
    thumbnailMetadata: StorageObject!
    lessons: [Lesson!]
  }
  input SyllabusInput {
    name: String
    languages: [String]
    university: String
    yearGroup: String
    lessons: [LessonInput]
    author: ID
  }
  type Author {
    id: ID!
    name: String!
    universities: [String!]!
    yearGroups: [String!]!
    courses: [ID!]!
  }
  input AuthorInput {
    name: String
    universities: [String]
    yearGroups: [String]
    courses: [ID]
  }
  type User {
    id: ID!
    email: String!
    fullName: String!
    phoneNo: String
    role: String!
    localId: String!
  }
  input SignUpInput {
    email: String!
    password: String!
    fullName: String!
    phoneNo: String
    role: String!
  }
  input SignInInput {
    email: String!
    password: String!
  }
  input UploadInput {
    file: Upload
  }
  type Query {
    message: String!
    findCourseById(courseId: ID!): Course
    getCourseList(batchSize: Int!, cursor: ID!): CourseList
    findSyllabusById(syllabusId: ID!): Syllabus
    getCourseSyllabus(courseId: String!): [Syllabus]
    getSyllabusList: [Syllabus]
  }
  type Mutation {
    uploadFile(input: UploadInput!): File
    signUp(user: SignUpInput!): User
    signIn(user: SignInInput!): User
    addStudent(student: StudentInput!): Student
    addCourse(course: CourseInput!): Course
    updateCourse(courseId: ID!, course: CourseInput!): Course
    addAuthor(author: AuthorInput!): Author
    addSyllabus(courseId: ID!, syllabus: SyllabusInput!): Syllabus
    updateSyllabusLessons(
      courseId: ID!
      syllabusId: ID!
      lesson: LessonInput!
    ): Syllabus
    removeSyllabus(
      courseId: ID!
      syllabusId: ID!
      lessonName: String!
    ): Syllabus
  }
`;

module.exports = typeDefs;
