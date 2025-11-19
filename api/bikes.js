// api/bikes.js
const http = require('http');

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 쿼리 파라미터에서 start, end 가져오기
  const { start = '1', end = '1000' } = req.query;

  const apiKey = '6f6d45546f676d6c32346f486a7955';
  const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/bikeList/${start}/${end}/`;

  try {
    const data = await new Promise((resolve, reject) => {
      http
        .get(url, (response) => {
          let body = '';

          response.on('data', (chunk) => {
            body += chunk;
          });

          response.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (error) {
              reject(error);
            }
          });
        })
        .on('error', (error) => {
          reject(error);
        });
    });

    // 성공 응답
    res.status(200).json(data);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
};
