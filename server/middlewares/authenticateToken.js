const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
  
    if (!token) return res.sendStatus(401); // Unauthorized
  
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).send('JWT Token Expired'); // Handle expired token specifically
        }
        return res.sendStatus(403); // Forbidden (other errors)
      }
      req.user = user;
      next();
    });
  };