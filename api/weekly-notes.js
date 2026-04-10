import db from './firebase-config.js';
import { createHash } from 'crypto';

function hashCode(code) {
  return createHash('sha256').update(code.trim()).digest('hex');
}

export default async function handler(req, res) {
  const { method } = req;
  const code = req.query?.code || req.body?.accessCode || req.headers['x-access-code'];

  if (!code) {
    return res.status(401).json({ error: '보안코드가 필요합니다.' });
  }

  const hashed = hashCode(code);
  const col = db.collection('workspaces').doc(hashed).collection('weekly-notes');

  try {
    // GET: 주간 메모 불러오기
    if (method === 'GET') {
      const key = req.query.key;
      if (!key) {
        // key 없으면 전체 목록 반환
        const snapshot = await col.orderBy('updatedAt', 'desc').get();
        const notes = [];
        snapshot.forEach(doc => {
          notes.push({ key: doc.id, ...doc.data() });
        });
        return res.status(200).json({ notes });
      }
      // key 있으면 해당 주간 메모만 반환
      const doc = await col.doc(key).get();
      if (doc.exists) {
        return res.status(200).json({ key, text: doc.data().text || '' });
      }
      return res.status(200).json({ key, text: '' });
    }

    // POST: 주간 메모 저장
    if (method === 'POST') {
      const { key, text } = req.body;
      if (!key) {
        return res.status(400).json({ error: 'key가 필요합니다.' });
      }
      await col.doc(key).set({
        text: text || '',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      return res.status(200).json({ success: true, key });
    }

    // DELETE: 주간 메모 삭제
    if (method === 'DELETE') {
      const { key } = req.body;
      if (!key) {
        return res.status(400).json({ error: 'key가 필요합니다.' });
      }
      await col.doc(key).delete();
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Weekly Notes API Error:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
