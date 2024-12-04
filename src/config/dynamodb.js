const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const awsConfig = require("./config");

const client = new DynamoDBClient(awsConfig);

const dynamo = DynamoDBDocumentClient.from(client);

module.exports = dynamo;
