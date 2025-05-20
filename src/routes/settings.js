const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { verifyToken } = require('../middleware/auth');

const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

// Ensure the data directory exists
async function ensureDataDirectory() {
  const dataDir = path.join(__dirname, '../../data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Read settings from file
async function readSettings() {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return default settings
    return {
      businessName: 'Gildardo Rochin Landscaping',
      email: '',
      phone: '',
      address: '',
      website: '',
      businessHours: '',
    };
  }
}

// Write settings to file
async function writeSettings(settings) {
  await ensureDataDirectory();
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// Get settings
router.get('/', async (req, res) => {
  try {
    const settings = await readSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// Update settings
router.put('/', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get current settings
    const currentSettings = await readSettings();

    // Update settings
    const newSettings = req.body;
    const updatedSettings = {
      ...currentSettings,
      ...newSettings,
    };

    // Save updated settings
    await writeSettings(updatedSettings);

    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router; 