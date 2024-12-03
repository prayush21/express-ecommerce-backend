import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const tableName = "tbl_orders";

export const handler = async (event, context) => {
  let status;
  let code = 200;
  let message;
  let data;
  let meta;
  const headers = {
    "Content-Type": "application/json",
  };
  console.log('event', event)
  try {
    switch (event.httpMethod + " " + event.resource) {
      case "DELETE /orders/{id}":
        await dynamo.send(
          new DeleteCommand({
            TableName: tableName,
            Key: {
              id: event.pathParameters.id,
            },
          })
        );
        status = "success";
        code = 204;
        message = `Deleted order ${event.pathParameters.id}`;
        data = {};
        meta = {};
        break;

      case "GET /orders/{id}":
        let getResponse = await dynamo.send(
          new GetCommand({
            TableName: tableName,
            Key: {
              id: event.pathParameters.id,
            },
          })
        );

        if (!getResponse.Item) {
          // If the item is not found
          status = "error";
          code = 404; // Not Found
          message = `Order with id ${event.pathParameters.id} not found`;
          data = {};
          meta = {};
        } else {
          // If the item is found
          status = "success";
          code = 200;
          message = `Data for ${event.pathParameters.id}`;
          data = getResponse.Item;
          meta = {};
        }
        break;

      case "GET /orders":
        let filterExpression = null;
        let expressionAttributeValues = {};
      
        if (event.queryStringParameters && event.queryStringParameters.orderStatus) {
          filterExpression = "#orderStatus = :orderStatus";
          expressionAttributeValues = { ":orderStatus": event.queryStringParameters.orderStatus };
        }
      
        let scanResponse = await dynamo.send(
          new ScanCommand({
            TableName: tableName,
            FilterExpression: filterExpression,
            ExpressionAttributeNames: filterExpression ? { "#orderStatus": "orderStatus" } : undefined,
            ExpressionAttributeValues: filterExpression ? expressionAttributeValues : undefined,
          })
        );
      
        status = "success";
        code = 200;
        message = "All Orders";
        data = scanResponse.Items;
        meta = {};
        break;

      case "POST /orders":
        let requestBody = event.body;
        requestBody.id = uuidv4(); // Generate a unique id
        requestBody.orderStatus = 'pending'; // Set orderStatus to 'pending'
        requestBody.createdAt = new Date().toISOString(); // Set the current time

        await dynamo.send(
          new PutCommand({
            TableName: tableName,
            Item: requestBody,
          })
        );

        status = "success";
        code = 201;
        message = "Created new order";
        data = requestBody;
        meta = {};
        break;

      case "PATCH /orders/{id}":
        let updateBody = event.body;
        let updateExpression = "set";
        let ExpressionAttributeNames = {};
        let ExpressionAttributeValues = {};

        for (let [key, value] of Object.entries(updateBody)) {
          updateExpression += ` #${key} = :${key},`;
          ExpressionAttributeNames[`#${key}`] = key;
          ExpressionAttributeValues[`:${key}`] = value;
        }

        updateExpression = updateExpression.slice(0, -1); // Remove the trailing comma

        await dynamo.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { id: event.pathParameters.id },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
            ReturnValues: "ALL_NEW",
          })
        );

        status = "success";
        code = 200;
        message = `Updated order ${event.pathParameters.id}`;
        data = updateBody;
        meta = {};
        break;

      default:
        throw new Error("Unsupported route");
    }
  } catch (err) {
    status = "error";
    code = 400;
    message = err.message || "Bad Request";
    data = {};
    meta = {};
  }

  return {
    statusCode: code,
    headers: headers,
    body: { status, code, message, data, meta },
  };
};
