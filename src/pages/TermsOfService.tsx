export default function TermsOfService() {
  return (
    <div className="pt-32 pb-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">
      <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-8">Terms of Service</h1>
      
      <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-400">
        <p className="mb-6">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">1. Agreement to Terms</h2>
        <p className="mb-4">
          By accessing our website and requesting services from Ultra Pressure Washing And Window Cleaning, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access our services.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">2. Services Provided</h2>
        <p className="mb-4">
          Ultra Pressure Washing And Window Cleaning provides exterior cleaning services including but not limited to soft washing, concrete cleaning, roof washing, and window cleaning. Estimates provided are based on the information given and visual inspection. Final pricing may be adjusted if the scope of work differs from the initial assessment.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">3. Customer Responsibilities</h2>
        <p className="mb-4">
          Prior to our arrival, customers are expected to secure all windows and doors, move fragile items away from the cleaning area, and ensure accessible water connections if required. We are not responsible for water intrusion due to faulty seals, open windows, or pre-existing property damage.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">4. Payment Terms</h2>
        <p className="mb-4">
          Payment is due upon completion of the requested services unless otherwise agreed upon in writing. We accept various forms of payment as discussed during the estimate process.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">5. Liability</h2>
        <p className="mb-4">
          While we take every precaution to protect your property using professional grade equipment and safe cleaning methods, Ultra Pressure Washing And Window Cleaning is not liable for damage to loose siding, peeling paint, oxidized surfaces, or pre-existing structural issues that become apparent during or after the cleaning process.
        </p>
      </div>
    </div>
  );
}