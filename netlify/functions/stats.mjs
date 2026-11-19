// 관리자 페이지용 방문 통계: ADMIN_PASSWORD 환경변수와 일치할 때만 응답
import { getStore } from '@netlify/blobs';

function kstDate(offsetDays = 0) {
  return new Date(Date.now() + 9 * 3600 * 1000 - offsetDays * 86400 * 1000).toISOString().slice(0, 10);
}

export default async (req) => {
  const pw = process.env.ADMIN_PASSWORD;
  const given = req.headers.get('x-admin-key') || '';
  if (!pw) return Response.json({ error: 'ADMIN_PASSWORD가 아직 설정되지 않았습니다.' }, { status: 503 });
  if (given !== pw) return Response.json({ error: '비밀번호가 맞지 않습니다.' }, { status: 401 });

  const days = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get('days') || '30', 10) || 30, 1), 90);
  const store = getStore({ name: 'visits', consistency: 'strong' });
  const out = { today: kstDate(), sites: {} };

  for (const site of ['apt', 'kr']) {
    const dates = Array.from({ length: days }, (_, i) => kstDate(i)).reverse();
    const rows = await Promise.all(dates.map(async (date) => {
      const d = await store.get(`${site}/${date}`, { type: 'json' });
      return { date, pv: d?.pv || 0, uv: d?.uv || 0, ref: d?.ref || {}, dev: d?.dev || {}, page: d?.page || {} };
    }));
    out.sites[site] = rows;
  }
  return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
};

export const config = { path: '/api/stats' };
