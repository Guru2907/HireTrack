const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try{
    const authHeader = req.headers.authorization;
    let token;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }else{
      return res.status(401).json({message:"Invalid Request"})
    }

    const isVerify = await jwt.verify(token,process.env.JWT_SECRET)
    const Person = await User.findById(isVerify.id)

    req.user = Person;
    next();

  }catch(err){
    res.status(401).json({ message: err.message });
  }
};