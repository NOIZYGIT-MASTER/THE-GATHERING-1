// ============================================
// Liner → Notion Sync Script
// Polls Liner API and pushes highlights to Notion
// ============================================
require('dotenv').config({ path: '../config/.env' });

const LINER_API = 'https://api.getliner.com/v1';
const NOTION_API = 'https://api.notion.com/v1';

async function syncHighlights() {
  console.log('🔍 Fetching Liner highlights...');

  const highlights = await fetch(`${LINER_API}/highlights`, {
    headers: { 'Authorization': `Bearer ${process.env.LINER_API_KEY}` }
  }).then(r => r.json());

  console.log(`📚 Found ${highlights.length} highlights — pushing to Notion...`);

  for (const h of highlights) {
    await fetch(`${NOTION_API}/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: process.env.NOTION_DATABASE_ID },
        properties: {
          Name: { title: [{ text: { content: h.text?.substring(0, 100) } }] },
          Source: { url: h.url },
          Tags: { multi_select: (h.tags || []).map(t => ({ name: t })) },
          Date: { date: { start: new Date().toISOString() } }
        }
      })
    });
    console.log(`  ✅ Synced: "${h.text?.substring(0, 50)}..."`);
  }

  console.log('🎉 Liner → Notion sync complete!');
}

syncHighlights().catch(console.error);
