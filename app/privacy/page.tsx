import Header from "@/components/layout/header";

export const metadata = {
  title: "Privacy Policy - Tokyo Guide",
  description: "Read the Privacy Policy for Tokyo Guide.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          <div className="prose max-w-none">
            <p>
              Your privacy is important to us. It is Tokyo Guide's policy to respect your privacy
              regarding any information we may collect from you across our website,
              [Your Website URL], and other sites we own and operate.
            </p>
            <p>
              We only ask for personal information when we truly need it to provide a service to
              you. We collect it by fair and lawful means, with your knowledge and consent. We
              also let you know why we’re collecting it and how it will be used.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-3">Information We Collect</h2>
            <p>
              The personal information that you are asked to provide, and the reasons why you are
              asked to provide it, will be made clear to you at the point we ask you to provide
              your personal information.
            </p>
            <p>
              If you contact us directly, we may receive additional information about you such as
              your name, email address, phone number, the contents of the message and/or
              attachments you may send us, and any other information you may choose to provide.
            </p>
            <p>
              When you register for an Account, we may ask for your contact information, including
              items such as name, company name, address, email address, and telephone number.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-3">How We Use Your Information</h2>
            <p>We use the information we collect in various ways, including to:</p>
            <ul>
              <li>Provide, operate, and maintain our website</li>
              <li>Improve, personalize, and expand our website</li>
              <li>Understand and analyze how you use our website</li>
              <li>Develop new products, services, features, and functionality</li>
              <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes</li>
              <li>Send you emails</li>
              <li>Find and prevent fraud</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-6 mb-3">Log Files</h2>
            <p>
              Tokyo Guide follows a standard procedure of using log files. These files log
              visitors when they visit websites. All hosting companies do this and a part of
              hosting services' analytics. The information collected by log files include
              internet protocol (IP) addresses, browser type, Internet Service Provider (ISP),
              date and time stamp, referring/exit pages, and possibly the number of clicks. These
              are not linked to any information that is personally identifiable. The purpose of
              the information is for analyzing trends, administering the site, tracking users'
              movement on the website, and gathering demographic information.
            </p>

            {/* Add more sections as needed: Cookies, Advertising Partners, Third-Party Policies, CCPA/GDPR Rights, Children's Information etc. */}
            <p className="mt-6">
              <strong>[Placeholder: Add more detailed privacy policy information here.]</strong>
            </p>

            <p className="mt-6">
              This policy is effective as of [Date].
            </p>
            <p>
              If you have any questions about how we handle user data and personal information,
              feel free to contact us.
            </p>
          </div>
        </div>
      </main>
      {/* No Footer here */}
    </div>
  );
}