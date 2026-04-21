// "use client";

// import * as Sentry from "@sentry/nextjs";
// import { Button } from "antd";
// import { testSentryAction } from "@/http/actions/password.action";

// export default function TestSentryButton() {
//   const handleClick = async () => {
//     try {
//       await testSentryAction();
//     } catch (error) {
//       console.log("Erreur capturée côté client:", error);
//       Sentry.captureException(error);
//     }
//   };

//   return <Button onClick={handleClick}>Test Sentry</Button>;
// }
