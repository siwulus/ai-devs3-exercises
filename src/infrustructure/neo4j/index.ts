import { pipe } from 'fp-ts/function';
import { chain, left, map, orElse, TaskEither } from 'fp-ts/TaskEither';
import { tryExecute } from '../../util/functional.ts';
import { Neo4JConnectionConfig } from './types.ts';
import { Driver, driver, auth } from 'neo4j-driver';

export const withNeo4J =
  <T>({ url, username, password }: Neo4JConnectionConfig) =>
  (fn: (neo4j: Driver) => TaskEither<Error, T>): TaskEither<Error, T> =>
    pipe(
      tryExecute('Connect to neo4j')(async () => {
        const neo4jDriver = driver(url, auth.basic(username, password));
        const info = await neo4jDriver.getServerInfo();
        console.info(`Connected to neo4j ${info}`);
        return neo4jDriver;
      }),
      chain(neo4jDriver =>
        pipe(
          fn(neo4jDriver),
          chain(result =>
            pipe(
              tryExecute('Close neo4j connection')(() => neo4jDriver.close()),
              map(() => result),
            ),
          ),
          orElse(error =>
            pipe(
              tryExecute('Close neo4j connection')(() => neo4jDriver.close()),
              chain(() => left(error)),
            ),
          ),
        ),
      ),
    );
