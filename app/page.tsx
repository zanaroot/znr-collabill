import { JsonLd } from "@/app/_components/json-ld";
import { landingFaqs } from "@/app/_statics/landing-faq";
import {
  faqPageSchema,
  jsonLdGraph,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from "@/lib/structured-data";
import LandingPage from "./_components/landing-page";

const structuredData = jsonLdGraph([
  organizationSchema,
  websiteSchema,
  softwareApplicationSchema,
  faqPageSchema(landingFaqs),
]);

const Page = () => {
  return (
    <>
      <JsonLd data={structuredData} />
      <LandingPage />
    </>
  );
};

export default Page;
