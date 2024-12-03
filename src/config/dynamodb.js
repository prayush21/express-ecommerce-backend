const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: "ASIAWRWAVBBBRYJ4C4WF",
    secretAccessKey: "QpUCHWauPVeX+Dbj8ig3IsocUefB2SRWkEl37qTN",
    sessionToken:
      "IQoJb3JpZ2luX2VjECIaCXVzLXdlc3QtMiJHMEUCIQDaQ8RGI3LEe1r8mN1845Z000YjGaqPI/rJGytaYiizEQIgVZupCWfYbWmaLC2OAC7wCNsSssfF0pVbCe+C+Z1PPhgqsAIIy///////////ARABGgw0NTAzMDE4NTU4MTEiDDGzWOW64vcBkZsI6SqEAuIU8e1oYK7VL+85Pc4+a+oGPUbv/YHQFgB16Q6aNbIr3LKtrO8msRojJs7oj3azjQV1irIv+CAE1wvV9M/vsh09rnuuiYowrvBQ83gmCNXU+QCpOa6eD30XI6A9ovSiCopOVKhrxXaEtOv1+Jglqt4WSgNDjqKVxNwx/ciRfjNx83f503XIgyfmr9dAwVt9IXmTjRR4t0tBiyNGqjxDnElnXsMrwVz/J8ZxHaojosGFQWv/YgF86uxCRrft4TkgI5uDujnHKUO3I7XpPOkHPxE3tcUpLm1dtmr6sPnLS3/7Sc0FTolkbaICYHVjsrZtYSURtMno/TsEmZBH0coonoog/F9pMI3MuboGOp0Be85iUEcjHwbk+C78jTgnyGsmUgdulxv1ervW+lx1FKosCXZL0VpE2qZZCJB82k/RUGXN0Xi7AAaRT92b79oCgbMwCuk2KGErWQ+cKY9TcfEl60Nf6kniYOuLXwVocXK0cbgnCodlwQphGbIUOLj4u0Fv61KjTQOvkg6U3g/vVRsVXt2PeJj04w+hu1DX6gA2KIFdNs9+BByrCeP1Cw==",
  },
});

const dynamo = DynamoDBDocumentClient.from(client);

module.exports = dynamo;
