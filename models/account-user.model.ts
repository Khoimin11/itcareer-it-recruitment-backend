import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    password: String,
    avatar: String,
    phone: String,
    title: String,
    birthday: String,
    gender: String,
    address: String,
    linkedin: String,
    general: {
      experience: String, level: String, education: String, major: String,
      skills: String, workingForms: String, industries: String, salary: String,
      languages: String, availability: String
    },
    introduction: String
  },
  {
    timestamps: true, // Tự động sinh ra trường createdAt và updatedAt
  }
);

const AccountUser = mongoose.model('AccountUser', schema, "accounts-user");

export default AccountUser;
