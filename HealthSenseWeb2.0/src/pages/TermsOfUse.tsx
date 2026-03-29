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

export default function TermsOfUse() {
  return (
    <StaticPageLayout
      title="Terms of Use"
      subtitle="Rules of the platform"
      lastUpdated="January 1, 2026"
    >
      <p className="text-[#1e7a96] text-sm leading-relaxed font-normal">
        By accessing the HealthSense Patient Portal or using a HealthSense kiosk, you agree to the
        following terms. Please read them carefully.
      </p>

      <Section title="1. Eligibility">
        <p>
          The HealthSense platform is intended for individuals who have been assigned a Patient ID
          through an authorised HealthSense facility. You must be at least 18 years old to create an
          account independently. Minors may use kiosk services under the supervision of a parent or
          guardian.
        </p>
      </Section>

      <Section title="2. Account responsibility">
        <p>
          You are responsible for maintaining the confidentiality of your Patient ID and password.
          Do not share your credentials with others. If you suspect unauthorised access to your
          account, contact support immediately.
        </p>
        <p>
          You agree not to attempt to access another patient's account, reverse-engineer the
          platform, or use the system for any purpose other than managing your own health data.
        </p>
      </Section>

      <Section title="3. Not a substitute for medical advice">
        <p>
          HealthSense kiosk readings and portal data are for general wellness monitoring purposes
          only. They are not a diagnosis, medical opinion, or substitute for consultation with a
          qualified healthcare professional.
        </p>
        <p>
          In a medical emergency, call your local emergency number immediately. Do not rely on
          HealthSense data in place of professional emergency care.
        </p>
      </Section>

      <Section title="4. Accuracy of readings">
        <p>
          Kiosk readings may be affected by environmental conditions, physical movement, or device
          calibration. HealthSense makes no guarantee of clinical-grade accuracy. Always consult a
          doctor for clinical assessment.
        </p>
      </Section>

      <Section title="5. Prohibited conduct">
        <p>
          You may not use the platform to: submit false information, attempt to gain unauthorised
          access to any account or system, disrupt or overload the portal infrastructure, or
          distribute malware or harmful code.
        </p>
      </Section>

      <Section title="6. Termination">
        <p>
          HealthSense reserves the right to suspend or terminate accounts that violate these terms
          or are found to be engaging in abusive or fraudulent behaviour, without prior notice.
        </p>
      </Section>

      <Section title="7. Changes to these terms">
        <p>
          We may update these terms periodically. Continued use of the platform after changes
          constitutes acceptance. We will notify registered users of material changes via their
          recovery email where one is provided.
        </p>
      </Section>

      <Section title="8. Contact">
        <p>
          Questions about these terms? Visit our{" "}
          <a href="/support" className="text-[#139dc7] hover:underline font-medium">
            Contact Support
          </a>{" "}
          page.
        </p>
      </Section>
    </StaticPageLayout>
  );
}
