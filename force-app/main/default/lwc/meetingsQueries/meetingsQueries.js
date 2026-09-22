/**
 * meetingsQueries.js
 * GraphQL query definitions and AST documents using lightning/graphql gql tag.
 * Contains polymorphic What filter, semi-join alternative, and all-day queries.
 */
import { gql } from 'lightning/graphql';

export const TIMED_MEETINGS_POLYMORPHIC_QUERY = gql`
  query HomepageTimedMeetings(
    $sellerId: ID!
    $recordTypeIds: [ID!]!
    $statusValues: [String!]!
    $rangeStart: DateTime!
    $rangeEnd: DateTime!
    $after: String
  ) {
    uiapi {
      query {
        Event(
          first: 100
          after: $after
          where: {
            and: [
              { OwnerId: { eq: $sellerId } }
              { Status__c: { in: $statusValues } }
              { IsAllDayEvent: { eq: false } }
              { What: { Opportunity: { RecordTypeId: { in: $recordTypeIds } } } }
              { StartDateTime: { lt: { value: $rangeEnd } } }
              { EndDateTime: { gt: { value: $rangeStart } } }
            ]
          }
          orderBy: { StartDateTime: { order: ASC } }
        ) {
          edges {
            cursor
            node {
              Id
              Subject { value }
              StartDateTime { value }
              EndDateTime { value }
              IsAllDayEvent { value }
              Status__c { value }
              Topic__c { value }
              Interaction_Category__c { value }
              WhatId { value }
              WhoId { value }
              What {
                ... on Opportunity {
                  Id
                  Name { value }
                  RecordTypeId { value }
                }
              }
              Who {
                ... on Contact {
                  Id
                  Name { value }
                }
                ... on Lead {
                  Id
                  Name { value }
                }
              }
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  }
`;

export const TIMED_MEETINGS_SEMIJOIN_QUERY = gql`
  query HomepageTimedMeetingsSemiJoin(
    $sellerId: ID!
    $recordTypeIds: [ID!]!
    $statusValues: [String!]!
    $rangeStart: DateTime!
    $rangeEnd: DateTime!
    $after: String
  ) {
    uiapi {
      query {
        Event(
          first: 100
          after: $after
          where: {
            and: [
              { OwnerId: { eq: $sellerId } }
              { Status__c: { in: $statusValues } }
              { IsAllDayEvent: { eq: false } }
              {
                WhatId: {
                  inq: {
                    Opportunity: { RecordTypeId: { in: $recordTypeIds } }
                    ApiName: "Id"
                  }
                }
              }
              { StartDateTime: { lt: { value: $rangeEnd } } }
              { EndDateTime: { gt: { value: $rangeStart } } }
            ]
          }
          orderBy: { StartDateTime: { order: ASC } }
        ) {
          edges {
            cursor
            node {
              Id
              Subject { value }
              StartDateTime { value }
              EndDateTime { value }
              IsAllDayEvent { value }
              Status__c { value }
              Topic__c { value }
              Interaction_Category__c { value }
              WhatId { value }
              WhoId { value }
              What {
                ... on Opportunity {
                  Id
                  Name { value }
                  RecordTypeId { value }
                }
              }
              Who {
                ... on Contact {
                  Id
                  Name { value }
                }
                ... on Lead {
                  Id
                  Name { value }
                }
              }
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  }
`;

export const ALL_DAY_MEETINGS_QUERY = gql`
  query HomepageAllDayMeetings(
    $sellerId: ID!
    $recordTypeIds: [ID!]!
    $statusValues: [String!]!
    $startDate: Date!
    $endDate: Date!
    $after: String
  ) {
    uiapi {
      query {
        Event(
          first: 100
          after: $after
          where: {
            and: [
              { OwnerId: { eq: $sellerId } }
              { Status__c: { in: $statusValues } }
              { IsAllDayEvent: { eq: true } }
              { What: { Opportunity: { RecordTypeId: { in: $recordTypeIds } } } }
              { ActivityDate: { gte: $startDate, lte: $endDate } }
            ]
          }
          orderBy: { ActivityDate: { order: ASC } }
        ) {
          edges {
            cursor
            node {
              Id
              Subject { value }
              IsAllDayEvent { value }
              ActivityDate { value }
              StartDateTime { value }
              EndDateTime { value }
              Status__c { value }
              Topic__c { value }
              Interaction_Category__c { value }
              WhatId { value }
              WhoId { value }
              What {
                ... on Opportunity {
                  Id
                  Name { value }
                  RecordTypeId { value }
                }
              }
              Who {
                ... on Contact {
                  Id
                  Name { value }
                }
                ... on Lead {
                  Id
                  Name { value }
                }
              }
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  }
`;

/**
 * Builds standard query variables for timed meetings.
 */
export function buildTimedQueryVariables({
  sellerId,
  recordTypeIds,
  statusValues,
  rangeStartUtcIso,
  rangeEndUtcIso,
  after = null
}) {
  return {
    sellerId,
    recordTypeIds,
    statusValues,
    rangeStart: rangeStartUtcIso,
    rangeEnd: rangeEndUtcIso,
    after
  };
}

/**
 * Builds standard query variables for all-day meetings.
 */
export function buildAllDayQueryVariables({
  sellerId,
  recordTypeIds,
  statusValues,
  startDateStr,
  endDateStr,
  after = null
}) {
  return {
    sellerId,
    recordTypeIds,
    statusValues,
    startDate: startDateStr,
    endDate: endDateStr,
    after
  };
}
