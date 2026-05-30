import Seo from "../components/Seo";
import { useSettings } from "../lib/settings-context";

export default function TermsOfService() {
  const { phone, email } = useSettings();
  return (
    <div className="pt-32 pb-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">
      <Seo
        title="Terms of Service | Ultra Pressure Washing"
        description="The terms and conditions for using Ultra Pressure Washing & Window Cleaning's website and services in East Tennessee."
        path="/terms-of-service"
      />
      <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-8">Terms of Service</h1>

      <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-400">
        <p className="mb-6">Last updated: {new Date().toLocaleDateString()}</p>

        <p className="mb-6">
          These Terms of Service ("Terms") govern your use of the website and the cleaning services provided by Ultra Pressure Washing And Window Cleaning ("we," "us," or "our"). Please read them carefully. By requesting an estimate, scheduling work, or otherwise engaging our services, you agree to these Terms in full.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">1. Agreement to Terms</h2>
        <p className="mb-4">
          By accessing our website and requesting services from Ultra Pressure Washing And Window Cleaning, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these Terms, you may not access our website or use our services.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">2. Services Provided</h2>
        <p className="mb-4">
          We provide exterior cleaning services including, but not limited to, house and building soft washing, concrete and driveway cleaning, roof washing, window cleaning, gutter cleaning, and surface sealing. The specific services to be performed will be described in your individual estimate. We reserve the right to refuse or discontinue service for any property where conditions are deemed unsafe or unsuitable for cleaning.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">3. Estimates &amp; Pricing</h2>
        <p className="mb-4">
          All estimates are provided free of charge and are based on the information you supply and a visual inspection of the property. Because every job differs in size, surface type, and the amount of buildup involved, pricing is determined on a per-project basis. Final pricing may be adjusted if the actual scope of work, square footage, or condition of the surfaces differs materially from the initial assessment. Any such adjustments will be communicated to you before additional work is performed.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">4. Scheduling, Weather &amp; Cancellations</h2>
        <p className="mb-4">
          We will make every reasonable effort to perform services on the agreed-upon date. However, because our work depends on safe weather conditions, we reserve the right to reschedule due to rain, freezing temperatures, high winds, or other circumstances beyond our control. If you need to cancel or reschedule, we ask that you provide as much advance notice as possible. We reserve the right to charge a fee for cancellations made without reasonable notice or for missed appointments where access to the property could not be obtained.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">5. Customer Responsibilities</h2>
        <p className="mb-4">
          Prior to our arrival, customers are responsible for: closing and securing all windows and doors; removing or relocating vehicles, furniture, planters, decorations, and other fragile or valuable items away from the work area; and providing access to a working exterior water source and electrical outlet if required. Please notify us in advance of any pre-existing damage, sensitive landscaping, faulty seals, or areas of concern. We are not responsible for water intrusion or damage resulting from open windows, faulty or aged seals, improperly installed fixtures, or pre-existing property conditions.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">6. Payment Terms</h2>
        <p className="mb-4">
          Payment is due in full upon completion of the requested services unless otherwise agreed upon in writing. We accept various forms of payment as discussed during the estimate process. Returned checks or failed payments may be subject to additional fees. Accounts that remain unpaid may be referred for collection, and the customer agrees to be responsible for any reasonable costs incurred in collecting past-due balances.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">7. Satisfaction &amp; Results</h2>
        <p className="mb-4">
          We take pride in our work and stand behind the quality of our services. If you are not satisfied with a completed job, please contact us within three (3) days of service so we can address your concerns. While we use professional-grade equipment and proven methods to achieve the best possible results, certain stains, discoloration, oxidation, or organic growth may be permanent due to the age, porosity, or condition of the surface. We will always communicate realistic expectations before beginning work.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">8. Limitation of Liability</h2>
        <p className="mb-4">
          While we take every precaution to protect your property using professional-grade equipment and safe cleaning methods, Ultra Pressure Washing And Window Cleaning is not liable for damage to loose, deteriorated, or improperly installed siding, trim, screens, or fixtures; peeling, failing, or oxidized paint and coatings; or pre-existing structural or cosmetic issues that become apparent during or after the cleaning process. Our total liability for any claim arising out of our services shall not exceed the amount paid by the customer for the specific service in question.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">9. Insurance</h2>
        <p className="mb-4">
          Ultra Pressure Washing And Window Cleaning carries liability insurance for your protection and our peace of mind. Proof of insurance is available upon request.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">10. Photography &amp; Marketing</h2>
        <p className="mb-4">
          We may photograph completed work for quality assurance and promotional purposes. These images may be used on our website and social media. We will never share personal information, addresses, or identifying details alongside such images. If you prefer that photos of your property not be used, simply let us know and we will honor your request.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">11. Changes to These Terms</h2>
        <p className="mb-4">
          We reserve the right to update or modify these Terms at any time without prior notice. Any changes will be effective immediately upon posting to this page. Your continued use of our website or services after changes are posted constitutes your acceptance of the revised Terms.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">12. Governing Law</h2>
        <p className="mb-4">
          These Terms shall be governed by and construed in accordance with the laws of the State of Tennessee, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the jurisdiction of the courts located in Sevier County, Tennessee.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">13. Contact Us</h2>
        <p className="mb-4">
          If you have any questions about these Terms of Service, please contact us at:
          <br /><br />
          <strong>Ultra Pressure Washing And Window Cleaning</strong><br />
          Phone: {phone}<br />
          Email: {email}
        </p>
      </div>
    </div>
  );
}
