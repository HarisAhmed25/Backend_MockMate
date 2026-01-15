/**
 * Checks MongoDB indexes for the users collection and reports duplicate emails.
 *
 * Usage (PowerShell):
 *   $env:MONGO_URI="mongodb://..."; node scripts/check-user-indexes-and-duplicates.js
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../src/models/User');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected');

  const indexes = await User.collection.indexes();
  console.log('\n### Indexes on users');
  for (const idx of indexes) {
    console.log('-', idx.name, JSON.stringify(idx.key), idx.unique ? '(unique)' : '');
  }

  console.log('\n### Duplicate emails (case-insensitive, trimmed)');
  const dups = await User.aggregate([
    {
      $project: {
        email: 1,
        normEmail: {
          $toLower: { $trim: { input: '$email' } },
        },
      },
    },
    {
      $group: {
        _id: '$normEmail',
        count: { $sum: 1 },
        ids: { $push: '$_id' },
        emails: { $addToSet: '$email' },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ]);

  if (!dups.length) {
    console.log('✅ No duplicates found');
  } else {
    for (const d of dups) {
      console.log(`- ${d._id} -> count=${d.count} emails=${JSON.stringify(d.emails)} ids=${d.ids.join(',')}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('❌ Failed:', e);
  process.exit(1);
});


