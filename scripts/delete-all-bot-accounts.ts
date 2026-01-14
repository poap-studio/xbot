/**
 * Delete All Bot Accounts Script
 *
 * WARNING: This script will DELETE ALL bot accounts from the database.
 * Use this when you need to reset and reconnect all bot accounts.
 *
 * Usage:
 *   npx tsx scripts/delete-all-bot-accounts.ts
 */

import prisma from '@/lib/prisma';

async function deleteAllBotAccounts() {
  console.log('🗑️  Deleting all bot accounts from database...\n');

  try {
    // First, get count of bot accounts
    const count = await prisma.botAccount.count();

    if (count === 0) {
      console.log('✅ No bot accounts found in database. Nothing to delete.');
      return;
    }

    console.log(`Found ${count} bot account(s) to delete.\n`);

    // List all bot accounts before deletion
    const accounts = await prisma.botAccount.findMany({
      select: {
        id: true,
        twitterId: true,
        username: true,
        displayName: true,
        isConnected: true,
        webhookId: true,
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });

    console.log('Bot accounts to be deleted:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    accounts.forEach((account, index) => {
      console.log(`${index + 1}. @${account.username}`);
      console.log(`   Twitter ID: ${account.twitterId}`);
      console.log(`   Display Name: ${account.displayName || 'N/A'}`);
      console.log(`   Connected: ${account.isConnected ? '✓' : '✗'}`);
      console.log(`   Webhook ID: ${account.webhookId || 'None'}`);
      console.log(`   Assigned Projects: ${account._count.projects}`);
      console.log('');
    });

    // Confirm deletion
    console.log('⚠️  WARNING: This will permanently delete all bot accounts!');
    console.log('⚠️  Projects will be unassigned but NOT deleted.');
    console.log('⚠️  You will need to reconnect bot accounts after this.\n');

    // Delete all bot accounts (CASCADE will unassign from projects)
    const result = await prisma.botAccount.deleteMany({});

    console.log(`\n✅ Successfully deleted ${result.count} bot account(s)!`);
    console.log('\n📝 Next steps:');
    console.log('   1. Go to admin dashboard: /admin');
    console.log('   2. Navigate to any project');
    console.log('   3. Go to "Bot Config" tab');
    console.log('   4. Click "Connect New Bot" to reconnect your bot accounts');

  } catch (error) {
    console.error('\n❌ Error deleting bot accounts:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deleteAllBotAccounts()
  .then(() => {
    console.log('\n✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });
