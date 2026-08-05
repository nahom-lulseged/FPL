import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = __ENV.LOAD_TEST_ACCESS_TOKEN;

export const options = {
  vus: Number(__ENV.LOAD_TEST_VUS || 5),
  duration: __ENV.LOAD_TEST_DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

function getPlayers(token) {
  const res = http.get(`${BASE_URL}/api/players?limit=15`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(res, { 'players ok': (r) => r.status === 200 });
  return res.json('data').map((player) => player.id);
}

export default function () {
  const token = ACCESS_TOKEN;
  if (!token) {
    check(null, { 'LOAD_TEST_ACCESS_TOKEN set': () => false });
    return;
  }

  const playerIds = getPlayers(token);
  if (!playerIds || playerIds.length < 15) {
    return;
  }

  const createRes = http.post(
    `${BASE_URL}/api/teams`,
    JSON.stringify({
      name: `K6 Squad ${__VU}-${__ITER}`,
      season: '2025/26',
      playerIds: playerIds.slice(0, 15),
    }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  let teamId = null;
  if (createRes.status === 201) {
    teamId = createRes.json('id');
  } else if (createRes.status === 409) {
    const teamRes = http.get(`${BASE_URL}/api/me/team`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (teamRes.status === 200) {
      teamId = teamRes.json('id');
    }
  }

  check(createRes, {
    'squad create ok or conflict': (r) => r.status === 201 || r.status === 409,
  });

  if (!teamId) {
    sleep(1);
    return;
  }

  const lineup = playerIds.slice(0, 15).map((playerId, index) => ({
    playerId,
    isStarter: index < 11,
    benchOrder: index < 11 ? null : index - 10,
  }));

  const lineupRes = http.patch(
    `${BASE_URL}/api/teams/${teamId}/lineup`,
    JSON.stringify({ lineup }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  check(lineupRes, { 'lineup ok': (r) => r.status === 200 });

  const captainRes = http.patch(
    `${BASE_URL}/api/teams/${teamId}/captain`,
    JSON.stringify({
      captainId: playerIds[0],
      viceCaptainId: playerIds[1],
    }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  check(captainRes, { 'captain ok': (r) => r.status === 200 });
  sleep(1);
}
