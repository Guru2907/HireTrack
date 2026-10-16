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

    const isVerify = jwt.verify(token,process.env.JWT_SECRET,{ algorithms: ['HS256'] })
    // Never expose the password hash or full resume texts through req.user;
    // handlers that need resumes or the password re-fetch the user themselves.
    const Person = await User.findById(isVerify.id).select('-password -resumes')
    if (!Person) {
      return res.status(401).json({ message: "Not authorized" });
    }

    req.user = Person;
    next();

  }catch(err){
    res.status(401).json({ message: "Not authorized" });
  }
};
