import { sendEmail } from ".";

type SendRateUpdatedEmailParams = {
  email: string;
  userName: string;
  oldRate: {
    rateXs: string;
    rateS: string;
    rateM: string;
    rateL: string;
    rateXl: string;
    dailyRate: string;
  } | null;
  newRate: {
    rateXs: string;
    rateS: string;
    rateM: string;
    rateL: string;
    rateXl: string;
    dailyRate: string;
  };
};

export const sendRateUpdatedEmail = async ({
  email,
  userName,
  oldRate,
  newRate,
}: SendRateUpdatedEmailParams) => {
  await sendEmail({
    to: email,
    subject: "Your rate has been updated",
    html: `
      <h2>Hello ${userName},</h2>

      <p>Your rate has been updated by your organization owner.</p>

      <h3>Previous rates:</h3>
      <ul>
        <li>XS: ${oldRate?.rateXs ?? "0"}</li>
        <li>S: ${oldRate?.rateS ?? "0"}</li>
        <li>M: ${oldRate?.rateM ?? "0"}</li>
        <li>L: ${oldRate?.rateL ?? "0"}</li>
        <li>XL: ${oldRate?.rateXl ?? "0"}</li>
        <li>Daily: ${oldRate?.dailyRate ?? "0"}</li>
      </ul>

      <h3>New rates:</h3>
      <ul>
        <li>XS: ${newRate.rateXs}</li>
        <li>S: ${newRate.rateS}</li>
        <li>M: ${newRate.rateM}</li>
        <li>L: ${newRate.rateL}</li>
        <li>XL: ${newRate.rateXl}</li>
        <li>Daily: ${newRate.dailyRate}</li>
      </ul>

      <p>
        Regards,<br />
        Collabill Team
      </p>
    `,
    text: `
Your rate has been updated.

Previous M rate: ${oldRate?.rateM ?? "0"}
New M rate: ${newRate.rateM}
    `,
  });
};
