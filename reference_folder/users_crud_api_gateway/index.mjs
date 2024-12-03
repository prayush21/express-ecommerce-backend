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

import { SNSClient, CreateTopicCommand, SubscribeCommand, ListTopicsCommand } from "@aws-sdk/client-sns";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const snsClient = new SNSClient({});
const sqsClient = new SQSClient({});
const tableName = process.env.TABLE_NAME;


export const handler = async (event, context) => {
  let status;
  let code = 200;
  let message;
  let data;
  let meta;
  console.log('Event:', event);
  
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  
  try {
    const { httpMethod, resource, pathParameters, body } = event;
    console.log('method, resource', httpMethod, resource)
    
    switch (`${httpMethod} ${resource}`) {
      case "OPTIONS /users/{id}":
      case "OPTIONS /users":
      case "OPTIONS /users/login":
        return {
          statusCode: 204,
          headers: headers,
          body: JSON.stringify({ message: "CORS preflight request handled" }),
        };

      case "DELETE /users/{id}":
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

      case "GET /users/{id}":
        let getResponse = await dynamo.send(
          new GetCommand({
            TableName: tableName,
            Key: {
              id: pathParameters.id,
            },
          })
        );
        status = "success";
        code = 200;
        message = `Data for ${pathParameters.id}`;
        data = getResponse.Item;
        meta = {};
        break;

      case "GET /users":
        let scanResponse = await dynamo.send(
          new ScanCommand({ TableName: tableName })
        );
        status = "success";
        code = 200;
        message = "All Users";
        data = scanResponse.Items;
        meta = {};
        break;

      case "POST /users":
        let requestBody = body;
        requestBody.createdAt = new Date().toISOString(); // Set the current time
        if (!requestBody.password) {
          throw new Error("Password is required");
        }
        requestBody.id = uuidv4();

        await dynamo.send(
          new PutCommand({
            TableName: tableName,
            Item: requestBody,
          })
        );
        status = "success";
        code = 201;
        message = "New User Created";
        data = requestBody;
        meta = {};
        
        //SNS Topic Creation if not present and send to queue using queue url.
        await handleNotification('Signup', requestBody.email, requestBody.firstName)
        
        
        break;

      case "PATCH /users/{id}":
        console.log('boyd', body);
        let updateBody = body;
        let updateExpression = "set";
        let ExpressionAttributeNames = {};
        let ExpressionAttributeValues = {};

        for (let [key, value] of Object.entries(updateBody)) {
          updateExpression += ` #${key} = :${key},`;
          ExpressionAttributeNames[`#${key}`] = key;
          ExpressionAttributeValues[`:${key}`] = value;
        }

        updateExpression = updateExpression.slice(0, -1);

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
        message = `Updated User ${pathParameters.id}`;
        data = updateBody;
        meta = {};
        break;

      case "POST /users/login":
        console.log('body', body)
        let loginBody = body;
        if (!loginBody.email || !loginBody.password) {
          throw new Error("Email and Password are required");
        }

        let queryResponse = await dynamo.send(
          new QueryCommand({
            TableName: tableName,
            IndexName: "email-index",
            KeyConditionExpression: "email = :email",
            ExpressionAttributeValues: {
              ":email": loginBody.email,
            },
          })
        );

        if (queryResponse.Items.length === 0) {
          throw new Error("Invalid email or password");
        }

        const user = queryResponse.Items[0];

        if (loginBody.password != user.password) {
          throw new Error("Invalid email or password");
        }
        
        status = "success";
        code = 200;
        message = "User logged in";
        data = {
          id: user.id,
          email: user.email,
          address: user.address,
          firstName: user.firstName,
          type: user.type ? user.type :'customer'
        };
        // data= user;
        
        await handleNotification('Login', user.email, user.firstName)
        
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




const handleNotification = async (NotificationType, CustomerEmail, CustomerFirstName) => {
  console.log('nnn', NotificationType, CustomerEmail, CustomerFirstName);
    try {
        const topicName = `user-${CustomerFirstName}-actions`;
        let topicArn;

        if (NotificationType === "Signup") {
            // Create SNS topic dynamically
            topicArn = await createSnsTopic(topicName);
            // Subscribe email to this SNS topic
            await subscribeEmailToSnsTopic(topicArn, CustomerEmail);
        } else {
            topicArn = await getTopicArn(topicName);
        }

        // Send user data to SQS queue
        await sendToSqsQueue(CustomerFirstName, CustomerEmail, NotificationType, topicArn);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'User data processed successfully',
                username: CustomerFirstName,
                email: CustomerEmail,
                topicArn: topicArn
            })
        };
    } catch (error) {
        console.error(`Error processing user data: ${error.message}`);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message })
        };
    }
};

const createSnsTopic = async (topicName) => {
    const params = {
        Name: topicName
    };
    const command = new CreateTopicCommand(params);
    
    const response = await snsClient.send(command);
    console.log(`Created SNS topic: ${topicName}, ARN: ${response.TopicArn}`);
    return response.TopicArn;
      
    
    
    
};

const subscribeEmailToSnsTopic = async (topicArn, email) => {
    const params = {
        TopicArn: topicArn,
        Protocol: 'email',
        Endpoint: email
    };
    const command = new SubscribeCommand(params);
    const response = await snsClient.send(command);
    console.log(`Subscribed ${email} to ${topicArn}, Subscription ARN: ${response.SubscriptionArn}`);
};

const getTopicArn = async (topicName) => {
    const command = new ListTopicsCommand({});
    const response = await snsClient.send(command);
    for (const topic of response.Topics) {
        const topicArn = topic.TopicArn;
        if (topicArn.endsWith(`:${topicName}`)) {
            return topicArn;
        }
    }
    return null;
};

const sendToSqsQueue = async (CustomerFirstName, CustomerEmail, NotificationType, topicArn) => {
    console.log('sendToSqsQueue', CustomerFirstName, CustomerEmail, NotificationType);
    const queueUrl = process.env.QUEUE_URL;  // Ensure this is the correct SQS URL
    const MessageAttributes = {
        CustomerFirstName: {
            DataType: "String",
            StringValue: CustomerFirstName
        },
        CustomerEmail: {
            DataType: "String",
            StringValue: CustomerEmail
        },
        NotificationType: {
            DataType: "String",
            StringValue: NotificationType
        },
        TopicArn: {
            DataType: "String",
            StringValue: topicArn
        }
    };
    const delaySeconds = NotificationType === "Signup" ? 40 : 0;
    const params = {
        QueueUrl: queueUrl,
        DelaySeconds: delaySeconds,
        MessageAttributes,
        MessageBody: `Notification for ${CustomerFirstName}`
    };
    const command = new SendMessageCommand(params);
    const response = await sqsClient.send(command);
    console.log(`Sent message to SQS queue: ${queueUrl}, Message ID: ${response.MessageId}`);
};
