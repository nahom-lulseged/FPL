import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = __ENV.LOAD_TEST_ACCESS_TOKEN;
const GAMEWEEK = Number(__ENV.LOAD_TEST_GAMEWEEK || 1);

export const options = {
  vus: Number(__ENV.LOAD_TEST_VUS || 10),
  duration: __ENV.LOAD_TEST_DURATION || '30s',
  thresholds: {
    checks: ['rate>0.99'],
  },
};

function getTeamId(token) {
  const res = http.get(`${BASE_URL}/api/me/team`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status !== 200) {
    return null;
  }
  return res.json('id');
}

export default function () {
  const token = ACCESS_TOKEN;
  if (!token) {
    check(null, { 'LOAD_TEST_ACCESS_TOKEN set': () => false });
    return;
  }

  const teamId = getTeamId(token);
  if (!teamId) {
    sleep(1);
    return;
  }

  const wsUrl = BASE_URL.replace('http', 'ws');
  const url = `${wsUrl}/socket.io/?EIO=4&transport=websocket`;

  const res = ws.connect(url, { headers: { Authorization: `Bearer ${token}` } }, (socket) => {
    socket.on('open', () => {
      socket.send(`40{"token":"${token}"}`);
      socket.send(`42["join:gw",${GAMEWEEK}]`);
      socket.send(`42["join:team","${teamId}"]`);
    });

    socket.on('message', (data) => {
      if (typeof data === 'string' && data.includes('team:score:updated')) {
        check(data, { 'score event received': () => true });
        socket.close();
      }
    });

    socket.setTimeout(() => {
      socket.close();
    }, 5000);
  });

  check(res, { 'websocket connected': (r) => r && r.status === 101 });
  sleep(1);
}
