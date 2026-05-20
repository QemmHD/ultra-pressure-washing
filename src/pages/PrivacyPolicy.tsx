export default function PrivacyPolicy() {
  return (
    <div className="pt-32 pb-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">
      <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-8">Privacy Policy</h1>
      
      <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-400">
        <p className="mb-6">Last updated: {new Date().toLocaleDateString()}</p>
        
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
          Ultra Pressure Washing And Window Cleaning does not sell, rent, or lease your personal information to third parties. We only share information when legally required or with trusted service providers who assist us in operating our business and serving our customers.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">4. Data Security</h2>
        <p className="mb-4">
          We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">5. Contact Us</h2>
        <p className="mb-4">
          If you have questions or comments about this Privacy Policy, please contact us at:
          <br /><br />
          <strong>Ultra Pressure Washing And Window Cleaning</strong><br />
          Phone: (865) 236-9240<br />
          Email: Ultrapressureandclean@gmail.com
        </p>
      </div>
    </div>
  );
}