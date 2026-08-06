const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
  try{
    const {name,email,password} = req.body
    const existingUser = await User.findOne({email})
    if (existingUser){
      return res.status(400).json({message:"Email Already Registered"})
    }
    const hashedPassword = await bcrypt.hash(password,12)
    const newUser = new User({
      name:name,
      email:email,
      password:hashedPassword,
    })

    await newUser.save()

    const token = jwt.sign(
      { id:newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d"}
    )
    res.status(201).json({token,name:newUser.name})
  }catch(err){
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try{
    const {email,password} = req.body

    const existingUser = await User.findOne({email})
    if (!existingUser){
      return res.status(400).json({message:"User Not Found"})
    }

    const isMatch = await bcrypt.compare(password,existingUser.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" })
    }

    const token = jwt.sign(
      { id:existingUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d"}
    )
    res.status(201).json({token,name:existingUser.name})
  }catch(err){
    res.status(500).json({ message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true }
    ).select('-password');
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};