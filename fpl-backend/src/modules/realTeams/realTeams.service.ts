import * as realTeamsRepository from './realTeams.repository';

export async function listRealTeams() {
  const data = await realTeamsRepository.findAllRealTeams();
  return { data };
}
