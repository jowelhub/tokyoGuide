import Header from "@/components/layout/header";

export const metadata = {
  title: "Terms of Service - Tokyo Guide",
  description: "Read the Terms of Service for Tokyo Guide.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
          <div className="prose max-w-none">
            <p>Welcome to Tokyo Guide!</p>
            <p>
              These terms and conditions outline the rules and regulations for the use of
              Tokyo Guide's Website, located at [Your Website URL].
            </p>
            <p>
              By accessing this website we assume you accept these terms and conditions. Do not
              continue to use Tokyo Guide if you do not agree to take all of the terms and
              conditions stated on this page.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-3">Cookies</h2>
            <p>
              We employ the use of cookies. By accessing Tokyo Guide, you agreed to use cookies
              in agreement with the Tokyo Guide's Privacy Policy.
            </p>
            <p>
              Most interactive websites use cookies to let us retrieve the user's details for
              each visit. Cookies are used by our website to enable the functionality of
              certain areas to make it easier for people visiting our website. Some of our
              affiliate/advertising partners may also use cookies.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-3">License</h2>
            <p>
              Unless otherwise stated, Tokyo Guide and/or its licensors own the intellectual
              property rights for all material on Tokyo Guide. All intellectual property rights
              are reserved. You may access this from Tokyo Guide for your own personal use
              subjected to restrictions set in these terms and conditions.
            </p>
            <p>You must not:</p>
            <ul>
              <li>Republish material from Tokyo Guide</li>
              <li>Sell, rent or sub-license material from Tokyo Guide</li>
              <li>Reproduce, duplicate or copy material from Tokyo Guide</li>
              <li>Redistribute content from Tokyo Guide</li>
            </ul>

            <p>This Agreement shall begin on the date hereof.</p>

            {/* Add more sections as needed: User Comments, Hyperlinking, iFrames, Content Liability, Reservation of Rights, Disclaimer etc. */}
            <p className="mt-6">
              <strong>[Placeholder: Add more detailed terms and conditions here.]</strong>
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-3">Disclaimer</h2>
            <p>
              To the maximum extent permitted by applicable law, we exclude all representations,
              warranties and conditions relating to our website and the use of this website.
              Nothing in this disclaimer will:
            </p>
            <ul>
              <li>limit or exclude our or your liability for death or personal injury;</li>
              <li>limit or exclude our or your liability for fraud or fraudulent misrepresentation;</li>
              <li>limit any of our or your liabilities in any way that is not permitted under applicable law; or</li>
              <li>exclude any of our or your liabilities that may not be excluded under applicable law.</li>
            </ul>
            <p>
              The limitations and prohibitions of liability set in this Section and elsewhere in
              this disclaimer: (a) are subject to the preceding paragraph; and (b) govern all
              liabilities arising under the disclaimer, including liabilities arising in contract,
              in tort and for breach of statutory duty.
            </p>
            <p>
              As long as the website and the information and services on the website are provided
              free of charge, we will not be liable for any loss or damage of any nature.
            </p>
          </div>
        </div>
      </main>
      {/* No Footer here */}
    </div>
  );
}