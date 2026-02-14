// Seeds an initial admin using env vars if none exists.
// This is helpful for demos, internships, and evaluations.
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';

const seedAdminIfNeeded = async () => {
  try {
    const count = await Admin.countDocuments();
    if (count > 0) return; // Already seeded

    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
      console.warn('Admin not seeded: ADMIN_USERNAME/ADMIN_PASSWORD missing in .env');
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    await Admin.create({ username, password: hashed });
    console.log('Seeded initial admin');
  } catch (err) {
    console.error('Failed to seed admin:', err.message);
  }
};

export default seedAdminIfNeeded;
