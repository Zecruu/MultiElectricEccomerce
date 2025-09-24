import 'dotenv/config';
import { connectMongo } from '../src/db/mongoose';
import { User } from '../src/models/User';
import bcrypt from 'bcryptjs';

async function main(){
  const email = (process.argv[2] || '').toLowerCase();
  const passwordArg = (process.argv[3] || '');
  if (!email) {
    console.error('Usage: npm run bootstrap:admin -- <email> [password]');
    process.exit(1);
  }
  await connectMongo();
  let user = await User.findOne({ email, deletedAt: null });
  if (!user) {
    const plain = passwordArg || Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const passwordHash = await bcrypt.hash(plain, 12);
    user = await User.create({ name: 'Admin', email, passwordHash, role: 'admin', emailVerified: true });
    console.log(`Created new admin user ${email}. ${passwordArg ? 'Password set from arg.' : 'Temp password: ' + plain}`);
  } else {
    user.role = 'admin';
    user.emailVerified = true;
    if (passwordArg) {
      user.passwordHash = await bcrypt.hash(passwordArg, 12);
      user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
      console.log('Password updated for existing user.');
    }
    await user.save();
    console.log(`Promoted ${email} to admin.`);
  }
  process.exit(0);
}

main().catch((e)=>{ console.error(e); process.exit(1); });

