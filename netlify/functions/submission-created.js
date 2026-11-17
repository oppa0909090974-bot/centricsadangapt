// Netlify가 폼 제출 때마다 자동 실행하는 함수: 관심고객 등록 내용을 솔라피로 문자 발송
const crypto = require('crypto');

exports.handler = async (event) => {
  try {
    const { payload } = JSON.parse(event.body || '{}');
    const d = (payload && payload.data) || {};
    const { SOLAPI_API_KEY, SOLAPI_API_SECRET, SMS_FROM, SMS_TO } = process.env;
    if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET || !SMS_FROM || !SMS_TO) {
      console.log('SMS env vars missing');
      return { statusCode: 200, body: 'skip' };
    }
    const text = `[센트릭사당]\n이름: ${d['이름'] || '-'}\n연락처: ${d['연락처'] || '-'}\n평형: ${d['관심평형'] || '-'}\n타분양: ${d['마케팅수신동의'] ? '동의' : '미동의'}`;
    const date = new Date().toISOString();
    const salt = crypto.randomBytes(16).toString('hex');
    const signature = crypto.createHmac('sha256', SOLAPI_API_SECRET).update(date + salt).digest('hex');
    const to = SMS_TO.split(',').map(s => s.replace(/[^0-9]/g, '')).filter(Boolean);
    const res = await fetch('https://api.solapi.com/messages/v4/send-many/detail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`,
      },
      body: JSON.stringify({ messages: to.map(t => ({ to: t, from: SMS_FROM.replace(/[^0-9]/g, ''), text })) }),
    });
    console.log('solapi', res.status, await res.text());
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    console.log('error', e);
    return { statusCode: 200, body: 'error' };
  }
};
