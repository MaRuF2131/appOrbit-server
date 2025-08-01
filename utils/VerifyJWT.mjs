import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
const verifyJWT = (req, res, next) => {
  const token = req.cookies.token;
  const user = JSON.parse(req.headers['authorization']);

  if (!token || !user) {
    console.log("⛔ Missing token or user information");
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
       console.log('JWT verification error:', err);
       return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = decoded;
    console.log("cookies", user);
    console.log("Decoded user:", req.user);
    
    if (req.user.email !== user.email || req.user.username !== user.username || req.user.uid !== user.uid) {
       console.log("⛔ User information does not match the token");
       return res.status(401).json({ message: 'Unauthorized' });
    }
    // Check if the token has expired
      if (!decoded.exp) {
        console.log("⛔ Token does not have an expiration time");
        return res.status(401).json({ message: 'Unauthorized' });
      }
    const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp < currentTime) {
           console.log("⛔ Token has expired");
            res.clearCookie('token', {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'none',
              path: '/',
            });
            const payload = {
               username: user.displayName,
                uid: user.uid,
                 email: user.email,
                  role: user.role || 'user'
             };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
            // Set the new token in the cookie
            res.cookie('token', token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'none',
              path: '/',
              maxAge: 7 * 24 * 60 * 60 * 1000
            });
      }
    next();
  });
};

export default verifyJWT;
