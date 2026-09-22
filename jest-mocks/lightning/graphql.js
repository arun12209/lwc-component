import { createTestWireAdapter } from '@salesforce/sfdx-lwc-jest';

export const graphql = createTestWireAdapter();
export const refreshGraphQL = jest.fn().mockResolvedValue(undefined);
export const gql = jest.fn((strings, ...values) => strings.join(''));
