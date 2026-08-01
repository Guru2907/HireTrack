const Application = require('../models/Application');

exports.getAll = async (req, res) => {
  try {
    const applications = await Application.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try{
    const applications = await Application.create({...req.body,user:req.user._id})
    res.status(201).json(applications)
  }catch(err){
    res.status(500).json({ message: err.message });
  }
};
// TODO — Plan Phase 1, Step 8 + Phase 3: update doc, then emit Socket.io 'statusUpdate' event
exports.update = async (req, res) => {
  try{
    const applications = await Application.findOneAndUpdate({_id:req.params.id,user:req.user._id},req.body,{new :true})
    if (!applications) {
      return res.status(404).json({ message: "Not found" });
    }
    res.json(applications);
  }catch(err){
    res.status(500).json({ message: err.message });
  }
};

// TODO — Plan Phase 1, Step 8: findOneAndDelete scoped to req.user._id
exports.remove = async (req, res) => {
  try{
    const applications = await Application.findOneAndDelete({_id:req.params.id,user:req.user._id})
    if (!applications) {
      return res.status(404).json({ message: "Not found" });
    }
    res.status(200).json({ message: "Successfully Deleted" });
  }catch(err){
    res.status(500).json({ message: err.message });
  }
};
