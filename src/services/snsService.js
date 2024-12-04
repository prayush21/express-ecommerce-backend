import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient();

export const publishNotification = async (params) => {
  try {
    const data = await snsClient.send(new PublishCommand(params));
    console.log("Notification sent successfully", data);
    return data;
  } catch (error) {
    console.error("Error sending notification", error);
    throw error;
  }
};

export const constructNotificationMessage = (
  notificationType,
  CustomerFirstName
) => {
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
      throw new Error("Unknown notification type: " + notificationType);
  }

  return { subject, body };
};
