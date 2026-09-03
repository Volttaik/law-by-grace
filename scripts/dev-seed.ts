/* Local dev seed: Grace (admin) + a student + a few sample law courses.
   Run with: npx tsx scripts/dev-seed.ts */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSQL({
  url: (process.env.TURSO_DATABASE_URL || "file:./prisma/dev.db").replace(/['"]/g, "").trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.replace(/['"]/g, "").trim(),
});
const prisma = new PrismaClient({ adapter });

const SAMPLE_PDF = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

async function main() {
  const gracePw = await bcrypt.hash("Grace2026!", 10);
  const studentPw = await bcrypt.hash("Study2026!", 10);

  const grace = await prisma.user.upsert({
    where: { email: "grace@lawbygrace.test" },
    update: { role: "ADMIN", isVerified: true },
    create: {
      name: "Grace",
      username: "grace",
      email: "grace@lawbygrace.test",
      password: gracePw,
      role: "ADMIN",
      isVerified: true,
      bio: "Curator of the Law by Grace library.",
      university: "Law by Grace Library",
      department: "Library Administration",
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "alex@lawbygrace.test" },
    update: { isVerified: true },
    create: {
      name: "Alex Student",
      username: "alex",
      email: "alex@lawbygrace.test",
      password: studentPw,
      role: "STUDENT",
      isVerified: true,
      bio: "Studying law part-time.",
      university: "Faculty of Law",
      department: "Criminal Law",
      level: "Year 2",
    },
  });

  const courses = [
    {
      title: "Introduction to Family Law",
      description: "Foundations of family law: marriage, matrimonial causes, custody and maintenance. Ideal for first-year law students.",
      courseCode: "LAW 101",
      department: "Family Law",
      semester: "Year 1",
      language: "PDF",
      modules: ["Marriage & Matrimonial Causes", "Custody & Maintenance"],
      tags: ["family-law", "marriage", "custody"],
      files: [
        { name: "Introduction to Family Law.pdf", label: "Introduction to Family Law" },
        { name: "Marriage and Matrimonial Causes.pdf", label: "Marriage and Matrimonial Causes" },
        { name: "Principles of Child Custody.pdf", label: "Principles of Child Custody" },
      ],
    },
    {
      title: "Criminal Law: General Principles",
      description: "The elements of crime, defences and liability. Covers actus reus, mens rea and general defences with case references.",
      courseCode: "LAW 201",
      department: "Criminal Law",
      semester: "Year 2",
      language: "PDF",
      modules: ["Elements of a Crime", "Defences"],
      tags: ["criminal-law", "actus-reus", "mens-rea"],
      files: [
        { name: "Elements of Crime.pdf", label: "Elements of Crime" },
        { name: "General Defences in Criminal Law.pdf", label: "General Defences in Criminal Law" },
      ],
    },
    {
      title: "Constitutional Law Fundamentals",
      description: "Sources of constitutional law, separation of powers, fundamental rights and judicial review.",
      courseCode: "LAW 301",
      department: "Constitutional Law",
      semester: "Year 2",
      language: "Document",
      modules: ["Sources & Structure", "Fundamental Rights"],
      tags: ["constitutional-law", "human-rights"],
      files: [
        { name: "Sources of Constitutional Law.pdf", label: "Sources of Constitutional Law" },
        { name: "Fundamental Rights Overview.pdf", label: "Fundamental Rights Overview" },
      ],
    },
    {
      title: "Contract Law Essentials",
      description: "Formation of contracts, offer and acceptance, consideration, vitiating factors and remedies for breach.",
      courseCode: "LAW 202",
      department: "Contract Law",
      semester: "Year 1",
      language: "PDF",
      modules: ["Formation", "Vitiating Factors & Remedies"],
      tags: ["contract-law", "consideration"],
      files: [
        { name: "Offer, Acceptance & Consideration.pdf", label: "Offer, Acceptance & Consideration" },
        { name: "Breach of Contract and Remedies.pdf", label: "Breach of Contract and Remedies" },
      ],
    },
  ];

  for (const c of courses) {
    const baseSlug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const existing = await prisma.course.findUnique({ where: { slug: baseSlug } });
    if (existing) continue;

    const course = await prisma.course.create({
      data: {
        title: c.title,
        slug: baseSlug,
        description: c.description,
        courseCode: c.courseCode,
        university: "Law by Grace Library",
        department: c.department,
        semester: c.semester,
        language: c.language,
        isPublic: true,
        isVerified: true,
        ownerId: grace.id,
        tags: {
          create: c.tags.map((name) => ({
            tag: { connectOrCreate: { where: { name }, create: { name } } },
          })),
        },
      },
    });

    let moduleIdx = 0;
    const perModule = Math.ceil(c.files.length / c.modules.length);
    for (let mi = 0; mi < c.modules.length; mi++) {
      await prisma.module.create({
        data: {
          courseId: course.id,
          title: c.modules[mi],
          type: mi === 0 ? "lecture" : "reading",
          order: mi,
          files: c.files.slice(moduleIdx, moduleIdx + perModule).length,
        },
      });
      moduleIdx += perModule;
    }
    const moduleRows = await prisma.module.findMany({ where: { courseId: course.id }, orderBy: { order: "asc" } });

    let fi = 0;
    let mi = 0;
    for (const f of c.files) {
      await prisma.material.create({
        data: {
          courseId: course.id,
          moduleId: moduleRows[mi]?.id ?? null,
          name: f.name,
          url: SAMPLE_PDF,
          rawPath: SAMPLE_PDF,
          size: 8123,
          mimeType: "application/pdf",
        },
      });
      fi++;
      if (fi >= perModule) { fi = 0; mi = Math.min(mi + 1, moduleRows.length - 1); }
    }
    console.log("Seeded course:", course.title);
  }

  console.log("Done. Admin:", grace.email, "/ Grace2026!  Student:", student.email, "/ Study2026!");
}

main().finally(() => prisma.$disconnect());