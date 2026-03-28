import StaticPageLayout from "../components/StaticPageLayout";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-[#0a4d61] mb-3 tracking-tight italic">{title}</h2>
      <div className="text-[#1e7a96] font-normal text-sm leading-relaxed flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}

export default function PrivacyPolicy() {
  return (
    <StaticPageLayout
      title="Privacy Policy"
      subtitle="Your data, explained"
      lastUpdated="January 1, 2026"
    >
      <p className="text-[#1e7a96] text-sm leading-relaxed font-normal">
        HealthSense is committed to protecting your personal health information. This policy explains
        what data we collect, how we use it, and your rights as a patient.
      </p>

      <Section title="1. What we collect">
        <p>
          When you use a HealthSense kiosk, we collect biometric readings including heart rate, blood
          pressure, blood oxygen saturation, and body temperature. We also collect your Patient ID,
          name, and optionally a personal recovery email address you provide for account access.
        </p>
        <p>
          We do not collect payment information, government ID numbers, or any data beyond what is
          necessary to provide health monitoring services.
        </p>
      </Section>

      <Section title="2. How we use your data">
        <p>
          Your health readings are stored securely and used solely to display your personal wellness
          history and trends through the Patient Portal. We do not sell, rent, or share your data
          with third-party advertisers.
        </p>
        <p>
          Anonymised, aggregated statistics may be used to improve kiosk accuracy and software
          performance. This data cannot be traced back to any individual.
        </p>
      </Section>

      <Section title="3. Data storage and security">
        <p>
          All health data is encrypted at rest and in transit using industry-standard protocols.
          Access is restricted to your authenticated account only. HealthSense staff cannot view your
          individual health records without your explicit written consent.
        </p>
        <p>
          Your data is stored on servers located within the Philippines. We retain your data for up
          to 5 years from your last kiosk visit, after which it is permanently deleted.
        </p>
      </Section>

      <Section title="4. Sharing with healthcare providers">
        <p>
          You may voluntarily export and share your health reports as PDF documents with your doctor
          or healthcare provider. HealthSense does not automatically transmit your data to any
          third-party medical system.
        </p>
      </Section>

      <Section title="5. Your rights">
        <p>
          You have the right to request a full copy of your stored data, to correct inaccurate
          records, or to request permanent deletion of your account and all associated health data.
          To exercise these rights, contact us at the address below.
        </p>
      </Section>

      <Section title="6. Contact">
        <p>
          For privacy-related inquiries, email{" "}
          <a href="mailto:privacy@healthsense.ph" className="text-[#139dc7] hover:underline font-medium">
            privacy@healthsense.ph
          </a>{" "}
          or visit our{" "}
          <a href="/support" className="text-[#139dc7] hover:underline font-medium">
            Contact Support
          </a>{" "}
          page.
        </p>
      </Section>
    </StaticPageLayout>
  );
}
