import { sequenceS } from 'fp-ts/Apply';
import { pipe } from 'fp-ts/function';
import { ApplyPar, chain, fromOption, map, TaskEither } from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { Driver } from 'neo4j-driver';
import { z } from 'zod';
import { reportToHeadquarter } from '../infrustructure/headquoter';
import { withNeo4J } from '../infrustructure/neo4j';
import { Neo4JConnectionConfig } from '../infrustructure/neo4j/types.ts';
import { toPromise, tryExecute } from '../util/functional.ts';
import { logPipe } from '../util/log.ts';
import { query } from './data.ts';

const config: Neo4JConnectionConfig = {
  url: process.env.NEO4J_URL || '',
  username: process.env.NEO4J_USERNAME || '',
  password: process.env.NEO4J_PASSWORD || '',
};

const User = z.object({
  id: z.string(),
  username: z.string(),
});
type User = z.infer<typeof User>;

const Connection = z.object({
  user1_id: z.string(),
  user2_id: z.string(),
});
type Connection = z.infer<typeof Connection>;

const createGraph = (neo4jDriver: Driver) =>
  pipe(
    sequenceS(ApplyPar)({
      users: getUsers(),
      connections: getConnections(),
    }),
    map(({ users, connections }) => createGraphQuery(users, connections)),
    chain(query => tryExecute('Create graph')(() => neo4jDriver.executeQuery(query))),
  );

const getUsers = (): TaskEither<Error, User[]> => query(User)('select id, username from users;');
const getConnections = (): TaskEither<Error, Connection[]> =>
  query(Connection)('select * from connections;');

const createGraphQuery = (users: User[], connections: Connection[]) =>
  [...users.map(createUserQuery), ...connections.map(createKnowsRelationQuery)].join('\n');

const createUserQuery = ({ id, username }: User) =>
  `CREATE (u${id}:User {id: "${id}", username: "${username}"})`;

const createKnowsRelationQuery = ({ user1_id, user2_id }: Connection) =>
  `CREATE (u${user1_id})-[:KNOWS]->(u${user2_id})`;

const findKnowsChain =
  (neo4jDriver: Driver) =>
  (from: string, to: string): TaskEither<Error, string> => {
    const query = `
MATCH p = shortestPath((a:User)-[:KNOWS*]-(b:User))
WHERE a.username = "${from}" AND b.username = "${to}"
RETURN [n IN nodes(p) | n.username] AS names;
`;
    return pipe(
      tryExecute('Find knows chain')(() => neo4jDriver.executeQuery(query)),
      map(({ records }) => A.head(records)),
      chain(fromOption(() => new Error('No result'))),
      map(record => record.get('names') as string[]),
      map(names => names.join(',')),
    );
  };

const removeGraph = (neo4jDriver: Driver) =>
  tryExecute('Remove graph')(() => neo4jDriver.executeQuery('MATCH (n) DETACH DELETE n;'));

const findRelationToBarbara = () =>
  withNeo4J(config)(neo4jDriver =>
    pipe(
      createGraph(neo4jDriver),
      chain(() => findKnowsChain(neo4jDriver)('Rafał', 'Barbara')),
      logPipe('Found knows chain'),
      chain(reportToHeadquarter('connections')),
      chain(() => removeGraph(neo4jDriver)),
    ),
  );

await pipe(findRelationToBarbara(), toPromise);
