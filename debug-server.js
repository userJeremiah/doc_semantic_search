require('dotenv').config();
const express = require('express');

const app = express();

console.log('Testing basic Express setup...');

// Test basic route
app.get('/test', (req, res) => {
  res.json({ message: 'Basic test works' });
});

// Try loading our routes one by one
try {
  console.log('Loading auth routes...');
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
}

try {
  console.log('Loading search routes...');
  const searchRoutes = require('./routes/search');
  app.use('/api/search', searchRoutes);
  console.log('✅ Search routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading search routes:', error.message);
}

try {
  console.log('Loading admin routes...');
  const adminRoutes = require('./routes/admin');
  app.use('/api/admin', adminRoutes);
  console.log('✅ Admin routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading admin routes:', error.message);
}

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
});