import {
  Activity,
  Building2,
  CalendarClock,
  FileText,
  HeartPulse,
  Home,
  MailPlus,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";


export const operationalModules = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Unified operational command center.",
    testPath: "/app/admin/dashboard",
    icon: Home,
    areas: ["admin", "provider", "viewer"],
  },
  {
    key: "profile",
    label: "Profile",
    description: "Independent Firebase and PostgreSQL-linked profile workflow.",
    testPath: "/profile-test",
    icon: User,
    areas: ["admin", "provider", "viewer"],
  },
  {
    key: "organizations",
    label: "Organizations",
    description: "Organization admin scaffold.",
    testPath: "/admin-org-test",
    icon: Building2,
    areas: ["admin"],
  },
  {
    key: "memberships",
    label: "Memberships",
    description: "Organization member lifecycle scaffold.",
    testPath: "/org-members-test",
    icon: Users,
    areas: ["admin", "provider", "viewer"],
  },
  {
    key: "invitations",
    label: "Invitations",
    description: "Invitation create, list, and accept workflow.",
    testPath: "/invitations-test",
    icon: MailPlus,
    areas: ["admin"],
  },
  {
    key: "documents",
    label: "Documents",
    description: "Firebase Storage upload plus metadata registration.",
    testPath: "/documents-test",
    icon: FileText,
    areas: ["admin", "provider", "viewer"],
  },
  {
    key: "audit",
    label: "Audit logs",
    description: "Admin-only audit visibility scaffold.",
    testPath: "/audit-test",
    icon: Activity,
    areas: ["admin"],
  },
  {
    key: "availability",
    label: "Availability",
    description: "Provider availability management scaffold.",
    testPath: "/availability-test",
    icon: CalendarClock,
    areas: ["admin", "provider"],
  },
  {
    key: "appointments",
    label: "Appointment requests",
    description: "Appointment request lifecycle scaffold.",
    testPath: "/appointments-test",
    icon: HeartPulse,
    areas: ["admin", "provider"],
  },
  {
    key: "system-health",
    label: "System health",
    description: "Migration system health dashboard.",
    testPath: "/system-health-test",
    icon: ShieldCheck,
    areas: ["admin"],
  },
];


export function modulesForArea(area) {
  return operationalModules.filter((module) => module.areas.includes(area));
}


export function moduleByKey(key) {
  return operationalModules.find((module) => module.key === key);
}
