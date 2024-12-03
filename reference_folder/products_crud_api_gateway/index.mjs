import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const tableName = "tbl_products";

export const handler = async (event, context) => {
  let status;
  let code = 200;
  let message;
  let data;
  let meta;
  const headers = {
    "Content-Type": "application/json",
  };
  
  console.log("Event:", event);

  try {
    const { httpMethod, resource, pathParameters, body } = event;
    
    let requestBody = body;
    
   

    switch (`${httpMethod} ${resource}`) {
      case "DELETE /products/{id}":
        await dynamo.send(
          new DeleteCommand({
            TableName: tableName,
            Key: {
              id: pathParameters.id,
            },
          })
        );
        status = "success";
        code = 204;
        message = `Deleted item ${pathParameters.id}`;
        data = {};
        meta = {};
        break;

      case "GET /products/{id}":
          let getResponse = await dynamo.send(
            new GetCommand({
              TableName: tableName,
              Key: {
                id: pathParameters.id,
              },
            })
          );
          if (!getResponse.Item) {
          // If the item is not found
          status = "error";
          code = 404; // Not Found
          message = `Product with id ${pathParameters.id} not found`;
          data = {};
          meta = {};
        } else {
          // If the item is found
          status = "success";
          code = 200;
          message = `Data for ${pathParameters.id}`;
          data = getResponse.Item;
          meta = {};
        }
        break;


      case "GET /products":
        let scanResponse = await dynamo.send(
          new ScanCommand({ TableName: tableName })
        );
        status = "success";
        code = 200;
        message = "All Data";
        data = scanResponse.Items;
        meta = {};
        break;

      case "POST /products":
        requestBody.id = uuidv4(); // Generate a unique id
        requestBody.createdAt = new Date().toISOString(); // Set the current time
        await dynamo.send(
          new PutCommand({
            TableName: tableName,
            Item: requestBody,
          })
        );
        status = "success";
        code = 201;
        message = "Created new item";
        data = requestBody;
        meta = {};
        break;

      case "PATCH /products/{id}":
        let updateBody = requestBody;
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
            Key: { id: pathParameters.id },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
            ReturnValues: "ALL_NEW",
          })
        );

        status = "success";
        code = 200;
        message = `Updated item ${pathParameters.id}`;
        data = updateBody;
        meta = {};
        break;

      default:
        throw new Error("Unsupported route");
    }
  } catch (err) {
    console.log("ERROR", err);
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
