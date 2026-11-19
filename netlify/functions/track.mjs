// 방문 기록: 두 사이트(centricsadangapt.com, centricsadang.kr)의 페이지 방문을 날짜별로 저장
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const ALLOWED = [
  'https://centricsadangapt.com', 'https://www.centricsadangapt.com',
  'https://centricsadang.kr', 'https://www.centricsadang.kr',
  'https://sadangcentric.netlify.app',
];
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|yeti|daum|bingpreview|python|curl|wget/i;

function kstDate() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function refSource(ref, host) {
  if (!ref) return '직접 방문';
  let h = '';
  try { h = new URL(ref).hostname.replace(/^www\./, ''); } catch { return '기타'; }
  if (!h || h === host.replace(/^www\./, '')) return '사이트 내부';
  if (/naver/.test(h)) return '네이버';
  if (/google/.test(h)) return '구글';
  if (/daum|kakao/.test(h)) return '다음·카카오';
  if (/instagram/.test(h)) return '인스타그램';
  if (/facebook|fb\./.test(h)) return '페이스북';
  if (/youtube/.test(h)) return '유튜브';
  if (/tiktok/.test(h)) return '틱톡';
  if (/hogangnono/.test(h)) return '호갱노노';
  return h;
}

export default async (req) => {
  const origin = req.headers.get('origin') || '';
  const cors = {
    'Access-Control-Allow-Origin': ALLOWED.includes(origin) ? origin : ALLOWED[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('ok', { status: 200, headers: cors });

  try {
    const ua = req.headers.get('user-agent') || '';
    if (BOT.test(ua)) return new Response('skip', { status: 200, headers: cors });

    let body = {};
    try { body = JSON.parse(await req.text() || '{}'); } catch {}
    const site = body.site === 'kr' ? 'kr' : 'apt';
    const host = site === 'kr' ? 'centricsadang.kr' : 'centricsadangapt.com';
    const page = String(body.path || '/').slice(0, 80);
    const ref = String(body.ref || '');
    const utm = String(body.utm || '').slice(0, 40);

    const date = kstDate();
    const ip = (req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const vid = crypto.createHash('sha256').update(`${ip}|${ua}|${date}|centric`).digest('hex').slice(0, 16);
    const mobile = /Mobi|Android|iPhone|iPad/i.test(ua);

    const store = getStore({ name: 'visits', consistency: 'strong' });
    const key = `${site}/${date}`;
    const d = (await store.get(key, { type: 'json' })) || { pv: 0, uv: 0, ids: [], ref: {}, dev: { 모바일: 0, PC: 0 }, page: {} };

    d.pv += 1;
    d.page[page] = (d.page[page] || 0) + 1;
    if (!d.ids.includes(vid)) {
      d.ids.push(vid);
      d.uv += 1;
      const src = utm ? `광고:${utm}` : refSource(ref, host);
      d.ref[src] = (d.ref[src] || 0) + 1;
      d.dev[mobile ? '모바일' : 'PC'] += 1;
    }
    await store.setJSON(key, d);
    return new Response('ok', { status: 200, headers: cors });
  } catch (e) {
    console.log('track error', e);
    return new Response('err', { status: 200, headers: cors });
  }
};

export const config = { path: '/api/track' };
