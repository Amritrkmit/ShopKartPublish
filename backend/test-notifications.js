const db = require('./db');

// Simple test using callback style
console.log('🔍 Testing Notifications Database...\n');

db.query('SELECT COUNT(*) as total FROM messages', (err, results) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }

  console.log('📊 Messages table:');
  console.log(`   Total messages: ${results[0].total}`);

  // Test user messages
  db.query(`SELECT COUNT(*) as count FROM messages WHERE sender = 'user'`, (err2, results2) => {
    if (err2) {
      console.error('❌ Error:', err2);
      process.exit(1);
    }

    console.log(`   User messages: ${results2[0].count}`);

    // Test recent messages
    db.query(`
      SELECT COUNT(*) as count 
      FROM messages 
      WHERE sender = 'user' 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `, (err3, results3) => {
      if (err3) {
        console.error('❌ Error:', err3);
        process.exit(1);
      }

      console.log(`   Recent user messages (24h): ${results3[0].count}\n`);

      // Fetch sample messages
      db.query(`
        SELECT 
          m.id, m.message, m.created_at, m.sender,
          t.subject, u.name as user_name
        FROM messages m
        LEFT JOIN tickets t ON m.ticket_id = t.id
        LEFT JOIN users u ON t.user_id = u.id
        WHERE m.sender = 'user'
        ORDER BY m.created_at DESC
        LIMIT 5
      `, (err4, messages) => {
        if (err4) {
          console.error('❌ Error:', err4);
          process.exit(1);
        }

        console.log('📝 Sample messages:');
        if (messages.length === 0) {
          console.log('   No messages found!');
        } else {
          messages.forEach((msg, i) => {
            console.log(`   ${i + 1}. ${msg.user_name || 'Unknown'}: "${msg.message.substring(0, 30)}..." (${msg.created_at})`);
          });
        }

        console.log('\n✅ Test complete!');
        process.exit(0);
      });
    });
  });
});
