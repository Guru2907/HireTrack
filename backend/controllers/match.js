// TODO — Plan Phase 4: call Gemini API with resumeText + jobDescription,
// prompt it to return ONLY JSON: { score, missingKeywords, suggestions }
exports.matchResume = async (req, res) => {
  res.status(501).json({ message: 'matchResume not implemented yet' });
};
