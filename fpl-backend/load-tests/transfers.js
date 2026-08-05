import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = __ENV.LOAD_TEST_ACCESS_TOKEN;

export const options = {
  vus: Number(__ENV.LOAD_TEST_VUS || 5),
  duration: __ENV.LOAD_TEST_DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

function getTeam(token) {
  const res = http.get(`${BASE_URL}/api/me/team`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status !== 200) {
    return null;
  }
  return res.json();
}

function getTransferCandidates(token, squad) {
  const position = squad[0].position;
  const res = http.get(
    `${BASE_URL}/api/players?position=${position}&limit=20`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  check(res, { 'players ok': (r) => r.status === 200 });
  const players = res.json('data');
  const squadIds = new Set(squad.map((slot) => slot.playerId));
  const playerIn = players.find((player) => !squadIds.has(player.id));
  return playerIn ? { playerInId: playerIn.id, playerOutId: squad[0].playerId } : null;
}

export default function () {
  const token = ACCESS_TOKEN;
  if (!token) {
    check(null, { 'LOAD_TEST_ACCESS_TOKEN set': () => false });
    return;
  }

  const team = getTeam(token);
  if (!team || !team.squad || team.squad.length === 0) {
    sleep(1);
    return;
  }

  const transfer = getTransferCandidates(token, team.squad);
  if (!transfer) {
    sleep(1);
    return;
  }

  const res = http.post(
    `${BASE_URL}/api/teams/${team.id}/transfers`,
    JSON.stringify({ transfers: [transfer] }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  check(res, {
    'transfer ok or rejected': (r) =>
      r.status === 200 || r.status === 400 || r.status === 403,
  });

  sleep(1);
}
