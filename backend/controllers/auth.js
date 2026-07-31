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
    const {name,email,password} = req.body

    const existingUser = await User.findOne({email})
    if (!existingUser){
      return res.status(400).json({message:"User Not Found"})
    }

    const isMatch = bcrypt.compare(password, existingUser.password)
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
