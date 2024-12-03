import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient();

export const handler = async (event) => {
  for (const record of event.Records) {
    console.log('rec', record)
    const message = record.body;
    const notificationType =
      record.messageAttributes.NotificationType.stringValue;
    const customerEmail = record.messageAttributes.CustomerEmail.stringValue;
    const CustomerFirstName =
      record.messageAttributes.CustomerFirstName.stringValue;
    const topicARN = record.messageAttributes.TopicArn.stringValue;

    // Add your logic to verify the customerId if needed
    let subject, body;

    switch (notificationType) {
      case "Signup":
        subject = "Welcome to Our Service";
        body = `Thank you for signing up, ${CustomerFirstName}!`;
        break;
      case "Login":
        subject = "Login Alert";
        body = "You have successfully logged in!";
        break;
      case "OrderPlaced":
        subject = "Order Confirmation";
        body = "Your order has been placed!";
        break;
      case "OrderStatusUpdated":
        subject = "Order Status Updated";
        body = "Your order status has been updated!";
        break;
      default:
        console.error("Unknown notification type:", notificationType);
        continue;
    }

    const params = {
      TopicArn: topicARN,
      Subject: subject,
      Message: body,
    };
    try {
      const data = await snsClient.send(new PublishCommand(params));
      console.log("Notification sent successfully", data);
    } catch (error) {
      console.error("Error sending notification", error);
    }
  }
};
