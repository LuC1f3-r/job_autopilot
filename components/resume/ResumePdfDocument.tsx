import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { Profile } from "@/lib/profile-types";
import { GeneratedResumeContent } from "@/lib/resume-generation-schema";

// Reproduces the layout of public/2025-template_bullet.docx (Harvard OCS
// bullet-point resume template): centered header, bold-centered section
// headers with a rule beneath, and per-entry rows with the org/role on the
// left and location/date right-aligned on the same line. Single page,
// plain black-on-white, no photos or icons — output must stay
// ATS-parseable (real text layer, not an image).

// React-PDF ships its own font engine and does not read system/Google
// fonts by default — Helvetica is one of its built-in base-14 fonts and is
// visually close to the template's Calibri without needing a font file
// bundled or fetched at render time.
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#000000",
  },
  header: {
    textAlign: "center",
    marginBottom: 12,
  },
  name: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    marginBottom: 3,
  },
  contactLine: {
    fontSize: 9,
  },
  section: {
    marginTop: 10,
  },
  sectionHeader: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  entry: {
    marginBottom: 8,
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  entryTitleLine: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  entrySubtitleLine: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 10,
  },
  entryMeta: {
    fontSize: 10,
  },
  bulletRow: {
    flexDirection: "row",
    marginTop: 2,
    paddingLeft: 10,
  },
  bulletMarker: {
    width: 10,
  },
  bulletText: {
    flex: 1,
  },
  skillsLine: {
    marginTop: 2,
  },
  skillsLabel: {
    fontFamily: "Helvetica-Bold",
  },
});

function ContactLine({ profile }: { profile: Profile }) {
  const parts = [profile.location, profile.email, profile.phone, profile.linkedin_url, profile.portfolio_url].filter(
    (part): part is string => Boolean(part && part.trim())
  );
  return <Text style={styles.contactLine}>{parts.join(" • ")}</Text>;
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletMarker}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

export function ResumePdfDocument({
  profile,
  content,
}: {
  profile: Profile;
  content: GeneratedResumeContent;
}) {
  const education = profile.education;
  const hasEducation = Boolean(
    education && (education.institutionName || education.fieldOfStudy || education.highestDegree)
  );

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{profile.full_name || "Your Name"}</Text>
          <ContactLine profile={profile} />
        </View>

        {hasEducation && education && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Education</Text>
            <View style={styles.entry}>
              <View style={styles.entryRow}>
                <Text style={styles.entryTitleLine}>{education.institutionName}</Text>
                <Text style={styles.entryMeta}>{education.graduationYear}</Text>
              </View>
              <View style={styles.entryRow}>
                <Text style={styles.entrySubtitleLine}>
                  {[education.highestDegree, education.fieldOfStudy].filter(Boolean).join(", ")}
                </Text>
              </View>
            </View>
          </View>
        )}

        {content.workExperience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Experience</Text>
            {content.workExperience.map((role, index) => (
              <View key={`${role.companyName}-${index}`} style={styles.entry}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitleLine}>{role.companyName}</Text>
                  <Text style={styles.entryMeta}>{role.location}</Text>
                </View>
                <View style={styles.entryRow}>
                  <Text style={styles.entrySubtitleLine}>{role.jobTitle}</Text>
                  <Text style={styles.entryMeta}>{role.dateRange}</Text>
                </View>
                {role.bullets.map((bullet, bulletIndex) => (
                  <Bullet key={bulletIndex} text={bullet} />
                ))}
              </View>
            ))}
          </View>
        )}

        {content.skillsSummary.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Skills & Interests</Text>
            <View style={styles.skillsLine}>
              <Text>
                <Text style={styles.skillsLabel}>Technical: </Text>
                {content.skillsSummary.join(", ")}
              </Text>
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
