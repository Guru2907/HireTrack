const User = require("../models/User");
const { PDFParse } = require('pdf-parse');
const { AppError, asyncHandler } = require('../middleware/errors');
const { MAX_RESUME_TEXT } = require('../validation/resumes');

// Request bodies are validated by middleware/validate.js before these handlers run.
// Every query is scoped to req.user._id, so one user can never read or change another user's resumes.

exports.addResume = asyncHandler(async (req, res) => {
  const { label, text } = req.body;
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $push: { resumes: { label, text } } },
    { new: true },
  ).select('resumes');
  res.status(201).json(updatedUser.resumes);
});

exports.deleteResume = asyncHandler(async (req, res) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { resumes: { _id: req.params.id } } },
    { new: true },
  ).select('resumes');
  res.status(200).json(updatedUser.resumes);
});

exports.getResumes = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('resumes');
  res.status(200).json(user.resumes);
});

exports.updateResume = asyncHandler(async (req, res) => {
  const { label, text } = req.body;

  const updatedUser = await User.findOneAndUpdate(
    { _id: req.user._id, "resumes._id": req.params.id },
    { $set: { "resumes.$.label": label, "resumes.$.text": text } },
    { new: true },
  ).select("resumes");

  if (!updatedUser) throw new AppError(404, "Resume not found");

  res.status(200).json(updatedUser.resumes);
});

// A real PDF starts with "%PDF-" (the spec allows a little leading junk, so look in the first KB).
const looksLikePdf = (buffer) => buffer.subarray(0, 1024).includes('%PDF-');

exports.uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'No PDF file was uploaded.');

  // The declared content type is client-controlled, so also check the file's own header.
  if (!looksLikePdf(req.file.buffer)) {
    throw new AppError(422, 'This file is not a valid PDF.');
  }

  let extractedText;
  try {
    const parser = new PDFParse({ data: req.file.buffer });
    const result = await parser.getText();
    await parser.destroy();
    extractedText = result.text.trim();
  } catch (parseErr) {
    throw new AppError(422, 'Could not read this PDF. It may be corrupted or password-protected.');
  }

  if (!extractedText) {
    throw new AppError(422, 'No readable text found in this PDF. It may be a scanned image rather than real text.');
  }
  if (extractedText.length > MAX_RESUME_TEXT) {
    throw new AppError(422, `This PDF has too much text (maximum ${MAX_RESUME_TEXT.toLocaleString('en-US')} characters).`);
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $push: { resumes: { label: req.body.label, text: extractedText } } },
    { new: true },
  ).select('resumes');

  res.status(201).json(updatedUser.resumes);
});
