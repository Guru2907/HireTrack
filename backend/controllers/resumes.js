const User = require("../models/User");

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