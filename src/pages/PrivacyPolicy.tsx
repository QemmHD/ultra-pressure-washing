import Breadcrumbs from "../components/Breadcrumbs";
import StructuredData from "../components/StructuredData";
import { createRouteMeta, getRoute } from "../data/routes";
import { SITE } from "../data/site";
import { useSettings } from "../lib/settings-context";

const route = getRoute("/privacy-policy");

export const meta = () => createRouteMeta(route);

export default function PrivacyPolicy() {
  const { phone, email } = useSettings();
  return (
    <div className="pt-32 pb-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">
      <StructuredData route={route} />
      <Breadcrumbs current="Privacy Policy" />
      <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-8">Privacy Policy</h1>
      
      <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-400">
        <p className="mb-6">Last updated: July 27, 2026</p>
        
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">1. Information We Collect</h2>
        <p className="mb-4">
          When you request a quote or contact us for services, we collect personal information that you voluntarily provide to us, including your name, phone number, email address, property address, and details about the services you require.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">2. How We Use Your Information</h2>
        <p className="mb-4">
          We use the information we collect primarily to provide you with accurate estimates, schedule services, communicate about your project, and ensure the highest quality of customer service.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">3. Information Sharing</h2>
        <p className="mb-4">
          {SITE.name} does not sell, rent, or lease your personal information to third parties. We only share information when legally required or with trusted service providers who assist us in operating our business and serving our customers.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">4. Data Security</h2>
        <p className="mb-4">
          We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">5. Contact Us</h2>
        <p className="mb-4">
          If you have questions or comments about this Privacy Policy, please contact us at:
          <br /><br />
          <strong>{SITE.name}</strong><br />
          Phone: {phone}<br />
          Email: {email}
        </p>
      </div>
    </div>
  );
}
