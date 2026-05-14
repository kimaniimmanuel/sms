const fs = require("fs");
const path = require("path");
const { Packer, P, H1, H2, H3, Bullet, Numbered, tableFromRows, pageBreak, blankLine, callout, buildDocument } = require("./common");

const sections = [];

// ===== 1. OVERVIEW =====
sections.push([
  H1("1. Why this checklist exists"),
  P("Software is the smallest part of shipping a SaaS product in Kenya. Long-lead approvals, business registration, payment partner onboarding, and data-protection paperwork take weeks of calendar time and must run in parallel with code. This document is the one-time setup list — what to arrange before the first commit, what to defer, and a day-by-day plan for the first two weeks."),
  callout("Rule of thumb",
    "If an item has an external approver — Safaricom, KRA, ODPC, a bank — start it today even if the code that depends on it is months away. If it's purely internal — your IDE, your repo settings — do it when you need it."),
]);

// ===== 2. LONG-LEAD ITEMS =====
sections.push([
  H1("2. Long-lead items — start this week"),
  P("These have approval cycles outside your control. The prototype runs on sandbox credentials, but the live equivalents need to be in flight now so MVP doesn't stall waiting for paperwork."),
  tableFromRows([
    ["Item", "Why it's long-lead", "Typical wait", "Blocks"],
    ["Business registration (Limited company)", "Required for KRA PIN, Daraja go-live, opening a business bank account", "1–3 weeks", "Daraja go-live, banking"],
    ["KRA PIN (company)", "Required by Safaricom and by your bank", "Few days after registration", "Daraja go-live, bank"],
    ["Business bank account", "M-Pesa settlement target for Daraja", "1–2 weeks after KRA PIN", "Daraja go-live"],
    ["Daraja production credentials", "Need a registered business + sandbox-integration demo to apply", "4–8 weeks", "MVP launch"],
    ["ODPC registration (Data Controller/Processor)", "Mandatory under Kenya's Data Protection Act for processing schools' personal data", "2–4 weeks", "Onboarding any real school"],
    ["Domain name", "Needed for email, demo URLs, HTTPS", "Minutes (.com) to days (.co.ke)", "Email, demo URL"],
  ], [2400, 3000, 1600, 2360]),
  callout("Concrete next step",
    "Today: open the Safaricom developer portal at developer.safaricom.co.ke and create a sandbox app. You will need it within a week regardless, and the registration is instant and free. Build sandbox familiarity while the business paperwork runs."),
]);

// ===== 3. GITHUB =====
sections.push([
  H1("3. GitHub and code collaboration"),

  H2("3.1 Why an organisation, not a personal account"),
  Bullet("Ownership is transferable without rewriting URLs"),
  Bullet("Billing is at the org level — easier to expense and account for"),
  Bullet("Teams and branch protection scale to multiple contributors without rework"),
  Bullet("Future hires don't get added to your personal account"),

  H2("3.2 Setup tasks"),
  Numbered("Create the GitHub Organisation (free tier is enough to start)"),
  Numbered("Create a single private repository inside the org (e.g. `sms-app` or your product slug)"),
  Numbered("Push the initial commit: `docs/`, `.github/`, `.gitignore`, `.editorconfig`, `.nvmrc`, `README.md`, `LICENSE`. These are already prepared for you in the working directory."),
  Numbered("Replace placeholders flagged in `.github/SETUP.md` (handles, org, repo, domain, company name)"),
  Numbered("Run `./.github/setup-branch-protection.sh` to lock down `main` — note that the solo-builder default does not require external approvals; tighten when you hire"),
  Numbered("Enable Discussions (Settings → Features → Discussions) — useful even solo for keeping decision threads searchable"),
  Numbered("(Skip until first hire) Add collaborators with the `Maintain` role"),
  Numbered("Set up GitHub Projects board — load epics and stories from `03-Product-Backlog.docx`"),

  H2("3.3 What's already prepared in this repo"),
  tableFromRows([
    ["File", "Purpose"],
    [".gitignore", "Ignores node_modules, .env, build outputs, OS junk, Electron and Expo artefacts"],
    [".editorconfig", "Cross-editor consistency: LF line endings, 2-space indent, UTF-8"],
    [".nvmrc", "Pins Node version to 20 (LTS)"],
    ["README.md", "Project description and pointer to docs/"],
    ["LICENSE", "Proprietary license placeholder — replace TBDs"],
    [".github/CODEOWNERS", "Auto-requests review based on changed paths"],
    [".github/PULL_REQUEST_TEMPLATE.md", "Default PR body — summary, why, linked story, test plan, checklist"],
    [".github/ISSUE_TEMPLATE/*", "Bug, feature, and backlog-story templates"],
    [".github/setup-branch-protection.sh", "Idempotent script that applies protection rules to main"],
    [".github/SETUP.md", "Walkthrough of these files and the placeholders to replace"],
  ], [3000, 6360]),
]);

// ===== 4. GCP =====
sections.push([
  H1("4. Google Cloud (GCP)"),
  P("Set up the foundation now so MVP deployment is a configuration task, not a project. The prototype runs locally in Docker — no cloud cost until you're ready."),

  H2("4.1 Setup tasks"),
  Numbered("Create a GCP organisation via Google Workspace (preferred) or create projects under a personal Google account as a starting point"),
  Numbered("Two GCP projects: `sms-prod` and `sms-staging`"),
  Numbered("Billing account with a hard budget alert — start at KES 10,000/month with email alerts at 50% and 100%"),
  Numbered("Confirm `africa-south1` (Johannesburg) supports Cloud Run + Cloud SQL — it does, but verify quotas for your account"),
  Numbered("Enable the APIs you'll need: Cloud Run, Cloud SQL Admin, Artifact Registry, Secret Manager, Cloud Build, IAM Credentials"),
  Numbered("Create Artifact Registry Docker repository in `africa-south1`"),
  Numbered("Set up Workload Identity Federation between GitHub and GCP (eliminates long-lived service account keys)"),
  Numbered("Enable 2FA on every GCP user"),

  H2("4.2 What to spend on (yet)"),
  P("Nothing until MVP. Cloud Run scales to zero, Cloud SQL is the only real cost. Until you provision them you pay nothing. Set the budget alert anyway — it catches mistakes."),
]);

// ===== 5. DARAJA =====
sections.push([
  H1("5. M-Pesa Daraja"),

  H2("5.1 Sandbox (do today)"),
  Numbered("Register at `developer.safaricom.co.ke`"),
  Numbered("Create a new app — choose **Lipa Na M-Pesa Online (M-Pesa Express, STK Push)** as the product"),
  Numbered("Note the consumer key, consumer secret, shortcode (174379 for sandbox), and passkey"),
  Numbered("Save credentials in your password manager. They go into `.env` later, never into git."),
  Numbered("Use sandbox test MSISDNs (e.g. 254708374149) for STK Push testing — they accept any PIN"),

  H2("5.2 Production (start the application now)"),
  P("Production credentials require: a registered business name, KRA PIN, signed Safaricom agreement, a paybill or till number issued in the business name, and proof that you have an integration working on sandbox. The integration proof comes after Epic E9 (M-Pesa stub) is built. The other paperwork can run in parallel."),

  H2("5.3 Test the sandbox flow once"),
  P("Before writing the integration, prove the credentials work by doing a single STK Push from Postman / curl. If the credentials are wrong, you'll find out in five minutes, not five hours into Epic E9."),
  callout("Sandbox STK Push test",
    "POST https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials with basic auth (consumer key:secret), get the access token. Then POST to /mpesa/stkpush/v1/processrequest with the shortcode, passkey-derived password, and a sandbox MSISDN. Your test phone receives a prompt within seconds. Do this once before scheduling demo dates."),
]);

// ===== 6. IDENTITY & SECRETS =====
sections.push([
  H1("6. Identity, email, and secrets management"),

  H2("6.1 Email"),
  Bullet("Google Workspace on your domain — USD 6/user/month. Gives you `info@`, `support@`, `security@`, plus Calendar and Drive"),
  Bullet("At minimum: `info@`, `security@` (referenced by issue-template config.yml). Add others as you hire"),

  H2("6.2 Password manager (mandatory)"),
  Bullet("1Password or Bitwarden — personal plan is enough today; upgrade to Teams/Business when you hire"),
  Bullet("Required vault contents: GitHub org, GCP, Daraja, domain registrar, Google Workspace, bank, ODPC portal, social media (later), password-manager recovery codes"),
  Bullet("Even as a solo builder, treat secrets as if a teammate will inherit them tomorrow — labels, notes, MFA backup codes attached to each entry"),

  H2("6.3 Two-factor authentication"),
  P("Mandatory on every account. Use an authenticator app (Authy, 1Password, Google Authenticator) — not SMS — wherever the service supports it. SMS 2FA is vulnerable to SIM-swap fraud, which is common in Kenya."),
  tableFromRows([
    ["Account", "2FA method"],
    ["GitHub", "Authenticator app + hardware key if available"],
    ["GCP / Google Workspace", "Authenticator app or hardware key"],
    ["Daraja portal", "Whatever Safaricom offers (often SMS-only — accept it)"],
    ["Domain registrar", "Authenticator app — domain hijacking is real"],
    ["Bank", "Bank's app + SIM-binding"],
    ["1Password / Bitwarden", "Authenticator app + emergency-kit recovery code printed and stored offline"],
  ], [3500, 5860]),
]);

// ===== 7. LEGAL =====
sections.push([
  H1("7. Legal and compliance"),

  H2("7.1 Business entity"),
  Bullet("Register a Limited company (preferred over sole proprietorship for liability and contracting)"),
  Bullet("Use eCitizen (`ecitizen.go.ke`) for company registration"),
  Bullet("After registration, apply for the company KRA PIN immediately"),

  H2("7.2 Data Protection (Kenya DPA 2019)"),
  Bullet("Register as a Data Controller with the Office of the Data Protection Commissioner (ODPC) at `odpc.go.ke`"),
  Bullet("Children's personal data (students under 18) requires explicit guardian consent and stricter handling — your privacy policy must address this"),
  Bullet("Data Protection Impact Assessment (DPIA): a placeholder for the prototype, a full document before the first pilot school"),
  Bullet("Designate a Data Protection Officer — at prototype scale, this can be the project owner"),

  H2("7.3 Documents to draft"),
  tableFromRows([
    ["Document", "Audience", "When"],
    ["Privacy Policy", "Schools, parents, ODPC", "Draft now, lawyer-review before pilot"],
    ["Terms of Service", "Schools", "Draft now, lawyer-review before pilot"],
    ["Data Processing Agreement (DPA template)", "Each school you onboard", "Lawyer-reviewed before first pilot"],
    ["Pilot MoU", "First 1–2 schools", "Before MVP demo to pilots"],
    ["Acceptable Use Policy", "End users", "MVP launch"],
  ], [2800, 3200, 3360]),

  H2("7.4 Insurance (defer to MVP)"),
  Bullet("Professional indemnity and cyber liability are MVP-stage purchases"),
  Bullet("Note them now so they're not a surprise when revenue starts"),
]);

// ===== 8. COMMS & DOCS =====
sections.push([
  H1("8. Communication and project documentation"),

  H2("8.1 Team communication (solo today, ready for tomorrow)"),
  Bullet("**Slack** (free tier) or **Discord** — set up the workspace now even though you're solo. It becomes your decision log: paste deploys, link PRs, write `#daraja` notes-to-self. When the first hire joins, channel history is invaluable"),
  Bullet("Suggested channels: `#general`, `#engineering`, `#daraja-and-mpesa`, `#stakeholders`, `#decisions`, `#random`"),
  Bullet("Even solo, the discipline of writing decisions in `#decisions` instead of leaving them in your head pays off when reviewing what you did last quarter"),

  H2("8.2 Document home"),
  Bullet("**Notion** (free tier) or **Google Drive** — single home for the four `.docx` files, meeting notes, ADRs (Architecture Decision Records), and stakeholder updates"),
  Bullet("Make the docs read-only for stakeholders; suggestion mode for the team"),
  Bullet("Every stakeholder demo gets a leave-behind Loom recording uploaded to the same place"),

  H2("8.3 Demo recording"),
  Bullet("**Loom** (free tier) — for async walkthroughs, demo recordings, and bug repros"),
  Bullet("**OBS** or **macOS QuickTime** — for the higher-quality polished demo recording"),

  H2("8.4 Scheduling"),
  Bullet("**Calendly** or **SavvyCal** — share a booking link for stakeholder demos instead of email back-and-forth"),
]);

// ===== 9. DEV MACHINE =====
sections.push([
  H1("9. Developer machine setup"),
  P("Bake this into a short README the next engineer can follow on day one."),

  H2("9.1 Runtimes"),
  tableFromRows([
    ["Tool", "Purpose", "Install"],
    ["Node.js 20 LTS", "Required runtime", "`nvm install 20` or `winget install OpenJS.NodeJS.LTS`"],
    ["pnpm", "Workspace package manager", "`npm install -g pnpm`"],
    ["Git", "Version control", "Built-in on macOS; `winget install Git.Git` on Windows"],
    ["Docker Desktop", "Local Postgres + API container", "docker.com/products/docker-desktop"],
    ["GitHub CLI (gh)", "PR and issue workflow", "`brew install gh` / `winget install GitHub.cli`"],
    ["Android Studio", "Expo APK builds (needed at Epic E14)", "developer.android.com — install when needed"],
  ], [1800, 3200, 4360]),

  H2("9.2 IDE"),
  Bullet("**VS Code** + extensions: ESLint, Prettier, Tailwind CSS IntelliSense, TypeScript Next, GitLens, Docker, REST Client"),
  Bullet("Workspace settings (`.vscode/settings.json`) committed to enforce format-on-save and shared editor config"),

  H2("9.3 Database tools"),
  Bullet("**DBeaver** (free) or **pgAdmin** — for browsing the local Postgres and writing ad-hoc queries"),
  Bullet("**TablePlus** is a paid alternative if you prefer the UX"),

  H2("9.4 API testing"),
  Bullet("**Postman** or **Insomnia** — for hand-driving the NestJS API while building"),
  Bullet("Save a workspace with the prototype's endpoints once they exist; share via export"),

  H2("9.5 Test devices"),
  Bullet("**A baseline Android phone** — Tecno Spark or similar, 2 GB RAM. The mobile NFRs are written against this profile, so test on it from the first build"),
  Bullet("Avoid testing only on flagship devices — they hide perf problems that bite real users"),

  H2("9.6 SSH keys and GitHub auth"),
  Bullet("Generate an Ed25519 SSH key per developer machine, register the public key on GitHub"),
  Bullet("Also run `gh auth login` so the CLI works"),
]);

// ===== 10. PILOT PIPELINE =====
sections.push([
  H1("10. Pilot school pipeline (parallel)"),
  P("Independent of code. The pilot pipeline is itself a six-to-eight-week process: identify candidates, build trust, sign agreements, plan rollout, train staff."),
  Numbered("Identify 1–2 candidate schools — bias toward warm contacts and small (100–300 student) institutions"),
  Numbered("First conversation — share the Blueprint and gauge interest. No contract yet"),
  Numbered("Visit the school in person at least once before MVP build kicks off"),
  Numbered("Have the Pilot MoU and Data Processing Agreement lawyer-reviewed and ready to sign by the time MVP demo is done"),
  Numbered("Document what each pilot school is committing to provide (devices, staff time, feedback) and what you'll provide in return"),
]);

// ===== 11. DEFER =====
sections.push([
  H1("11. Defer to MVP — do not start now"),
  P("These are easy traps. They feel like progress but burn time before they're needed."),
  Bullet("Custom monitoring stack (Grafana, Datadog, New Relic) — Cloud Logging + Error Reporting is sufficient for MVP"),
  Bullet("Heavy CI/CD beyond GitHub Actions"),
  Bullet("Multi-region deployment"),
  Bullet("Penetration testing — schedule before first paying school, not now"),
  Bullet("Custom design system / heavy branding investment"),
  Bullet("Marketing site, landing page, A/B tests"),
  Bullet("Mobile app on Google Play Store (sideload APKs for pilots)"),
  Bullet("Email marketing platforms, CRMs"),
  Bullet("Analytics platforms (Mixpanel, Amplitude) — instrument when you have users to study"),
  Bullet("Custom error-tracking SDK beyond Cloud Error Reporting"),
  Bullet("Documentation site generator (e.g. Docusaurus) — Notion is fine for now"),
]);

// ===== 12. TWO-WEEK PLAN =====
sections.push([
  H1("12. Day-by-day plan for the first two weeks"),
  P("Concrete, sequenced. Adjust dates as needed; the order is what matters."),
  tableFromRows([
    ["Day", "Owner", "Tasks"],
    ["1 (Mon)", "Project owner", "Create GitHub Organisation. Create private repo. Push the prepared files. Set up 1Password / Bitwarden. Enable 2FA on GitHub."],
    ["2 (Tue)", "Project owner", "Domain registration. Google Workspace signup. Slack/Discord workspace. Notion / Drive folder for project docs."],
    ["3 (Wed)", "Project owner", "Safaricom developer account. Sandbox app created. Run the Daraja STK Push smoke test from Postman to confirm credentials work."],
    ["4 (Thu)", "Project owner", "Submit company registration on eCitizen. Apply for KRA PIN. Open conversation with bank about a business account."],
    ["5 (Fri)", "Project owner", "Create GCP organisation/projects. Set billing budget alerts. Reserve Artifact Registry namespace. Don't deploy anything yet."],
    ["Weekend", "—", "Buffer. Read ODPC site and Daraja API docs at leisure."],
    ["6 (Mon)", "Project owner", "Draft Privacy Policy (use a template, adapt to Kenya DPA). Draft Terms of Service. Start ODPC Data Controller registration."],
    ["7 (Tue)", "Project owner", "Replace placeholders in `.github/CODEOWNERS` and `LICENSE` (your GitHub handle, org, repo, domain, company name). Run `setup-branch-protection.sh`. Skip collaborators — you're solo."],
    ["8 (Wed)", "Project owner", "Pilot school list — write down 5 candidate schools. Reach out to 2 to schedule conversations."],
    ["9 (Thu)", "Project owner", "Once business registration is in hand (or expected within a week), submit Daraja go-live application. It can sit pending while you build."],
    ["10 (Fri)", "Engineer", "Begin Epic E1 (Foundations) from the backlog. Monorepo, lint, Docker Compose, baseline TypeScript config."],
    ["11+ (Week 3+)", "Engineer", "Continue Epic E1 → E2 (core-logic) → E3 (DB) per backlog priorities."],
  ], [1400, 1700, 6260]),
  callout("Coding can start on day 10",
    "By the end of week 2 you have the GitHub repo locked down, sandbox credentials working, business registration in flight, and a clear pilot pipeline. The engineering work then runs to a known timeline without waiting on paperwork."),
]);

// ===== 13. CHECKLIST APPENDIX =====
sections.push([
  H1("Appendix A — Single-page checklist"),
  P("Print this. Tick boxes as you go."),
  H2("Long-lead approvals"),
  Bullet("[ ] Company registered (eCitizen)"),
  Bullet("[ ] Company KRA PIN issued"),
  Bullet("[ ] Business bank account opened"),
  Bullet("[ ] Daraja sandbox app working (STK Push tested)"),
  Bullet("[ ] Daraja production application submitted"),
  Bullet("[ ] ODPC Data Controller registration submitted"),
  Bullet("[ ] Domain name registered"),

  H2("GitHub"),
  Bullet("[ ] Organisation created"),
  Bullet("[ ] Private repo created"),
  Bullet("[ ] Initial commit pushed"),
  Bullet("[ ] Placeholders replaced (CODEOWNERS, LICENSE, SETUP.md, issue-template config)"),
  Bullet("[ ] Branch protection applied on main (solo-builder defaults)"),
  Bullet("[ ] Discussions enabled"),
  Bullet("[ ] GitHub Projects board set up from backlog"),

  H2("GCP"),
  Bullet("[ ] Organisation or project created (`sms-prod`, `sms-staging`)"),
  Bullet("[ ] Billing + budget alerts active"),
  Bullet("[ ] Required APIs enabled"),
  Bullet("[ ] Artifact Registry repo in africa-south1"),
  Bullet("[ ] Workload Identity Federation linked to GitHub org"),
  Bullet("[ ] 2FA enforced on all GCP users"),

  H2("Identity and secrets"),
  Bullet("[ ] Google Workspace active on domain"),
  Bullet("[ ] Password manager set up; team vault created"),
  Bullet("[ ] 2FA enabled on GitHub, GCP, Daraja, domain registrar, bank, password manager"),
  Bullet("[ ] Recovery codes printed and stored offline"),

  H2("Legal"),
  Bullet("[ ] Privacy Policy draft"),
  Bullet("[ ] Terms of Service draft"),
  Bullet("[ ] Pilot MoU template"),
  Bullet("[ ] Data Processing Agreement template"),
  Bullet("[ ] DPIA placeholder document"),

  H2("Communication"),
  Bullet("[ ] Slack / Discord workspace"),
  Bullet("[ ] Notion / Drive doc home"),
  Bullet("[ ] Loom account for recordings"),
  Bullet("[ ] Scheduling tool (Calendly)"),

  H2("Dev machine"),
  Bullet("[ ] Node 20 LTS, pnpm, Git, Docker Desktop installed"),
  Bullet("[ ] GitHub CLI installed and `gh auth login` done"),
  Bullet("[ ] VS Code with required extensions"),
  Bullet("[ ] SSH key registered with GitHub"),
  Bullet("[ ] Baseline Android phone identified"),

  H2("Pilot pipeline"),
  Bullet("[ ] 5 candidate schools listed"),
  Bullet("[ ] First 2 contacted"),
  Bullet("[ ] At least one in-person visit scheduled"),
]);

const doc = buildDocument({
  title: "Pre-Coding Setup Checklist",
  subtitle: "Long-lead approvals, accounts, and governance before the first commit",
  sections,
});

const outPath = path.join(__dirname, "..", "docs", "00-Pre-Coding-Setup-Checklist.docx");
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Wrote", outPath, "(", buf.length, "bytes )");
});
