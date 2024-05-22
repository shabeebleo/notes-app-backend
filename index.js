const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/database");
const bcrypt = require("bcrypt");
const User = require("./models/userModel");
const Note = require("./models/noteModel");
const app = express();
const jwt = require("jsonwebtoken");
const authenticateToken = require("./middlewares/authMiddleware");
const PORT = process.env.PORT || 8000;
const errorHandler =require("./middlewares/errorHandlingMiddleware")
// Connect to the database
connectDB();

app.use(express.json());
app.use(cors({ origin: "*" }));
app.get("/", (req, res) => {
  res.json({ data: "hai" });
});

//create user
app.post("/create-user", async (req, res) => {
  const { fullname, email, password } = req.body;
  console.log(fullname, email, password);
  if (!fullname) {
    res.status(400).json({ error: true, message: "full name is required" });
  }
  if (!email) {
    res.status(400).json({ error: true, message: "email is required" });
  }
  if (!password) {
    res.status(400).json({ error: true, message: "password is required" });
  }

  try {
    const isUser = await User.findOne({ email: email });

    if (isUser) {
      return res
        .status(400)
        .json({ error: true, message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ fullname, email, password: hashedPassword });

    await user.save();
    console.log(
      user,
      "userrrr",
      process.env.ACCESS_TOKEN_SECRET,
      process.env.JWT_EXPIRES_IN,
      user._id
    );

    const accessToken = jwt.sign(
      { user: user },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN,
      }
    );

    return res.json({
      error: false,
      user,
      accessToken,
      message: "Registration successful",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Internal Server Error" });
  }
});

//user login

app.post("/login", async (req, res) => {


  const { email, password } = req.body;
  if (!email) {
    res.status(400).json({ error: true, message: "email is required" });
  }
  if (!password) {
    res.status(400).json({ error: true, message: "password is required" });
  }
  try {
    const userInfo = await User.findOne({ email: email });
    console.log(userInfo, "userInfo");
    if (!userInfo) {
      res.status(400).json({ error: true, message: "user not found" });
    }
    const passwordMatch = await bcrypt.compare(password, userInfo.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }
    const accessToken = jwt.sign(
      { user: userInfo },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN,
      }
    );

    res.status(200).json({
      error: false,
      message: "login successfull",
      accessToken,
      email,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Internal Server Error" });
  }
});

//get a  user
app.get("/get-user", authenticateToken, async (req, res) => {
  userId = req.user._id;

  try {
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ error: true, message: "user not found" });
    }
    return res.json({ error: false, user:{fullname:user.fullname,email:user.email,_id:user._id,createdOn:user.createdOn}, message: "user details" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "internal server error" });
  }
});

//get all notes
app.get("/all-notes", authenticateToken, async (req, res) => {
  userId = req.user._id;
  try {
    const notes = await Note.find({ userId: userId }).sort({ isPinned: -1 });
    console.log(notes, "notes");
    if (!notes) {
      notes = [];
      return res.json({ error: false, notes });
    } else {
      return res.json({
        error: false,
        notes,
        message: "all notes recieved successfully",
      });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "internal server error" });
  }
});

//add Note
app.post("/add-note", authenticateToken, async (req, res) => {
  const { title, content, tags } = req.body;
  const user = req.user;

  if (!title) {
    return res.status(400).json({ error: true, message: "title required" });
  }
  if (!content) {
    return res.status(400).json({ error: true, message: "content required" });
  }

  try {
    const note = new Note({
      title,
      content,
      tags: tags || [],
      userId: user._id,
    });
    console.log(note, "before save");
    await note.save();
    console.log(note, "after save");
    return res
      .status(201)
      .json({ error: false, note, message: "new note added" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Internal server error" });
  }
});

//edit note
app.put("/edit-note/:noteId", authenticateToken, async (req, res) => {
  const { title, content, tags, isPinned } = req.body;
  const noteId = req.params.noteId;
  const user = req.user;
  if (!title && !content && !tags && typeof isPinned === "undefined") {
    return res
      .status(400)
      .json({ error: true, message: "no changes provided" });
  }
  try {
    console.log(noteId, "noteId", user._id, "user._id...");
    const note = await Note.findOne({ _id: noteId, userId: user._id });

    console.log(note, "note");
    if (!note) {
      return res.status(404).json({ error: true, message: "note not found" });
    }

    if (title) note.title = title;
    if (content) note.content = content;
    if (tags) note.tags = tags;
    if (isPinned) note.isPinned = isPinned;

    await note.save();
    res.status(200).json({
      error: true,
      message: "successfully updated",
      note,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "internal server error" });
  }
});

//delete a  note
app.delete("/delete-note/:noteId", authenticateToken, async (req, res) => {
  const noteId = req.params.noteId;
  const userId = req.user._id;

  try {
    const note = await Note.findOne({ _id: noteId, userId: userId });
    console.log(note, "noet");
    if (!note) {
      return res.status(404).json({ error: true, message: "no such note" });
    }
    await Note.deleteOne({ _id: noteId, userId: userId });
    return res.json({
      error: false,
      message: "note deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: true, message: "internal server error" });
  }
});

//update isPinned
app.put("/update-note-pinned/:noteId", authenticateToken, async (req, res) => {
  const userId = req.user._id;
  const noteId = req.params.noteId;
  const isPinned = req.body.isPinned;
  try {
    const note = await Note.findOne({ _id: noteId, userId: userId });
    if (!note) {
      return res.status(404).json({ error: true, message: "note not found" });
    }
    if (isPinned) note.isPinned = isPinned;
    await note.save();
    return res.json({
      error: false,
      message: "note's pin changed successfully",
    });
  } catch (error) {
    res.status(500).json({ error: true, message: "internal server error" });
  }
});
app.use(errorHandler)
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// module.exports = app;
