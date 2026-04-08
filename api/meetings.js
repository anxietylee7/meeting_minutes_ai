import db from './firebase-config.js';
import { createHash } from 'crypto';

function hashCode(code) {
  return createHash('sha256').update(code.trim()).digest('hex');
}

export default async function handler(req, res) {
  const { method } = req;
  // 보안코드: query param, body, header 순서로 확인
  const code = req.query?.code || req.body?.accessCode || req.headers['x-access-code'];

  if (!code) {
    return res.status(401).json({ error: '보안코드가 필요합니다.' });
  }

  const hashed = hashCode(code);
  const col = db.collection('workspaces').doc(hashed).collection('meetings');

  try {
    // GET: 해당 보안코드의 모든 회의록 가져오기
    if (method === 'GET') {
      const snapshot = await col.orderBy('updatedAt', 'desc').get();
      const meetings = [];
      snapshot.forEach(doc => {
        meetings.push({ id: doc.id, ...doc.data() });
      });
      return res.status(200).json({ meetings });
    }

    // POST: 회의록 저장 (신규 or 업데이트)
    if (method === 'POST') {
      const { meeting } = req.body;
      if (!meeting) {
        return res.status(400).json({ error: '회의록 데이터가 필요합니다.' });
      }

      const docId = meeting.id || Date.now().toString();
      await col.doc(docId).set({
        ...meeting,
        id: docId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return res.status(200).json({ id: docId, success: true });
    }

    // PUT: 여러 회의록 일괄 저장 (로컬 → 클라우드 마이그레이션용)
    if (method === 'PUT') {
      const { meetings } = req.body;
      if (!meetings || !Array.isArray(meetings)) {
        return res.status(400).json({ error: '회의록 배열이 필요합니다.' });
      }

      const batch = db.batch();
      meetings.forEach(m => {
        const docId = m.id || Date.now().toString() + Math.random().toString(36).slice(2);
        const ref = col.doc(docId);
        batch.set(ref, {
          ...m,
          id: docId,
          updatedAt: m.updatedAt || new Date().toISOString(),
        }, { merge: true });
      });
      await batch.commit();

      return res.status(200).json({ success: true, count: meetings.length });
    }

    // DELETE: 회의록 삭제
    if (method === 'DELETE') {
      const { meetingId } = req.body;
      if (!meetingId) {
        return res.status(400).json({ error: '삭제할 회의록 ID가 필요합니다.' });
      }

      await col.doc(meetingId).delete();
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error('Meetings API Error:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
