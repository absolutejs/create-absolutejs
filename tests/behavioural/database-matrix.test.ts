import { DATABASE_MATRIX_DEFINITIONS } from './database-matrix-definitions';
import { describeDatabaseMatrix } from './database-matrix';

DATABASE_MATRIX_DEFINITIONS.forEach(describeDatabaseMatrix);

