const mongoose = require("mongoose");
const User = require("../models/User");
const { PDFParse } = require('pdf-parse');

exports.addResume = async (req, res) => {
  try {
    const { label, text } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { resumes: { label, text } } },
      { new: true },
    );
    res.status(201).json(updatedUser.resumes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteResume = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { resumes: { _id: req.params.id } } },
      { new: true },
    );
    res.status(200).json(updatedUser.resumes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getResumes = async (req,res) => {
    try{
        const getUsers = await User.findById(req.user._id)
        res.status(200).json(getUsers.resumes);
    }catch(err){
        res.status(500).json({ message: err.message });
    }
}

exports.updateResume = async (req, res) => {
  try {
    const resumeId = req.params.id;
    const { label, text } = req.body;

    if (!mongoose.isValidObjectId(resumeId)) {
      return res.status(400).json({ message: "Invalid resume id" });
    }
    if (typeof label !== "string" || !label.trim() || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ message: "Both a label and resume text are required" });
    }

    // Scoped to the logged-in user: another user's resume id simply won't match.
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id, "resumes._id": resumeId },
      {
        $set: {
          "resumes.$.label": label.trim(),
          "resumes.$.text": text.trim(),
        },
      },
      { new: true },
    ).select("resumes");

    if (!updatedUser) {
      return res.status(404).json({ message: "Resume not found" });
    }

    res.status(200).json(updatedUser.resumes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file was uploaded.' });
    }

    const { label } = req.body;
    if (!label) {
      return res.status(400).json({ message: 'Please provide a label for this resume.' });
    }

    let extractedText;
    try {
      const parser = new PDFParse({ data: req.file.buffer });
      const result = await parser.getText();
      await parser.destroy();
      extractedText = result.text.trim();
    } catch (parseErr) {
      return res.status(422).json({ message: 'Could not read this PDF. It may be corrupted or password-protected.' });
    }

    if (!extractedText) {
      return res.status(422).json({ message: 'No readable text found in this PDF. It may be a scanned image rather than real text.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { resumes: { label, text: extractedText } } },
      { new: true },
    );

    res.status(201).json(updatedUser.resumes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};