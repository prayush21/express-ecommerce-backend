const dynamo = require("../config/dynamodb");
const {
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const {
  SNSClient,
  CreateTopicCommand,
  SubscribeCommand,
  ListTopicsCommand,
} = require("@aws-sdk/client-sns");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const awsConfig = require("../config/config");

const TABLE_NAME = "UsersTable";
const snsClient = new SNSClient(awsConfig);
const sqsClient = new SQSClient(awsConfig);

const userController = {
  getAllUsers: async (req, res) => {
    try {
      const result = await dynamo.send(
        new ScanCommand({ TableName: TABLE_NAME })
      );
      res.json({
        status: "success",
        message: "All Users",
        data: result.Items,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },

  getUser: async (req, res) => {
    try {
      const result = await dynamo.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { id: req.params.id },
        })
      );
      if ("Item" in result) {
        res.json({
          status: "success",
          message: `Data for ${req.params.id}`,
          data: result.Item,
        });
      } else {
        res.json({
          status: "success",
          message: `No Data for ${req.params.id}`,
        });
      }
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },

  createUser: async (req, res) => {
    try {
      const user = {
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        ...req.body,
      };
      console.log("create User hadnler");

      if (!user.password) {
        throw new Error("Password is required");
      }

      await dynamo.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: user,
        })
      );

      // Handle notification for signup
      await handleNotification("Signup", user.email, user.firstName);

      res.status(201).json({
        status: "success",
        message: "New User Created",
        data: user,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },

  updateUser: async (req, res) => {
    try {
      const updateBody = req.body;
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
          TableName: TABLE_NAME,
          Key: { id: req.params.id },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames,
          ExpressionAttributeValues,
          ReturnValues: "ALL_NEW",
        })
      );

      res.json({
        status: "success",
        message: `Updated User ${req.params.id}`,
        data: updateBody,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },

  deleteUser: async (req, res) => {
    try {
      await dynamo.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { id: req.params.id },
        })
      );
      res.status(204).json({
        status: "success",
        message: `Deleted item ${req.params.id}`,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new Error("Email and Password are required");
      }

      const result = await dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "email-index",
          KeyConditionExpression: "email = :email",
          ExpressionAttributeValues: {
            ":email": email,
          },
        })
      );
      console.log("result", result);
      if (result.Items.length === 0) {
        throw new Error("Invalid email or password");
      }

      const user = result.Items[0];

      if (password !== user.password) {
        throw new Error("Invalid email or password");
      }

      // Handle notification for login
      await handleNotification("Login", user.email, user.firstName);

      res.json({
        status: "success",
        message: "User logged in",
        data: {
          id: user.id,
          email: user.email,
          address: user.address,
          firstName: user.firstName,
          type: user.type || "customer",
        },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },
};

// TODO: Move these notification-related functions to a separate service file
const handleNotification = async (
  NotificationType,
  CustomerEmail,
  CustomerFirstName
) => {
  try {
    const topicName = `user-${CustomerFirstName}-actions`;
    let topicArn;
    console.log("handleNotifcation");

    if (NotificationType === "Signup") {
      console.log("handleNotifcation 1");
      topicArn = await createSnsTopic(topicName);
      console.log("handleNotifcation 2");
      await subscribeEmailToSnsTopic(topicArn, CustomerEmail);
    } else {
      console.log("handleNotifcation 3");
      topicArn = await getTopicArn(topicName);
    }

    await sendToSqsQueue(
      CustomerFirstName,
      CustomerEmail,
      NotificationType,
      topicArn
    );

    return {
      statusCode: 200,
      body: {
        message: "User data processed successfully",
        username: CustomerFirstName,
        email: CustomerEmail,
        topicArn: topicArn,
      },
    };
  } catch (error) {
    console.error(`Error processing user data: ${error.message}`);
    throw error;
  }
};

const createSnsTopic = async (topicName) => {
  const params = {
    Name: topicName,
  };
  const command = new CreateTopicCommand(params);
  const response = await snsClient.send(command);
  console.log(`Created SNS topic: ${topicName}, ARN: ${response.TopicArn}`);
  return response.TopicArn;
};

const subscribeEmailToSnsTopic = async (topicArn, email) => {
  const params = {
    TopicArn: topicArn,
    Protocol: "email",
    Endpoint: email,
  };
  const command = new SubscribeCommand(params);
  const response = await snsClient.send(command);
  console.log(
    `Subscribed ${email} to ${topicArn}, Subscription ARN: ${response.SubscriptionArn}`
  );
};

const getTopicArn = async (topicName) => {
  const command = new ListTopicsCommand({});
  console.log("get topic arns");
  const response = await snsClient.send(command);
  for (const topic of response.Topics) {
    const topicArn = topic.TopicArn;
    if (topicArn.endsWith(`:${topicName}`)) {
      return topicArn;
    }
  }
  return null;
};

const sendToSqsQueue = async (
  CustomerFirstName,
  CustomerEmail,
  NotificationType,
  topicArn
) => {
  console.log(
    "sendToSqsQueue",
    CustomerFirstName,
    CustomerEmail,
    NotificationType
  );
  const queueUrl = process.env.QUEUE_URL;
  const MessageAttributes = {
    CustomerFirstName: {
      DataType: "String",
      StringValue: CustomerFirstName,
    },
    CustomerEmail: {
      DataType: "String",
      StringValue: CustomerEmail,
    },
    NotificationType: {
      DataType: "String",
      StringValue: NotificationType,
    },
    TopicArn: {
      DataType: "String",
      StringValue: topicArn,
    },
  };
  const delaySeconds = NotificationType === "Signup" ? 40 : 0;
  const params = {
    QueueUrl: queueUrl,
    DelaySeconds: delaySeconds,
    MessageAttributes,
    MessageBody: `Notification for ${CustomerFirstName}`,
  };
  const command = new SendMessageCommand(params);
  const response = await sqsClient.send(command);
  console.log(
    `Sent message to SQS queue: ${queueUrl}, Message ID: ${response.MessageId}`
  );
};

module.exports = userController;
