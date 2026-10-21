import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  FileClock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavigationSubItem {
  label: string;
  path: string;
  navigationCode?: string;
}

export interface NavigationItem {
  label: string;
  path?: string;
  icon: LucideIcon;
  section?: string;
  navigationCode?: string;
  subItems?: NavigationSubItem[];
}

export const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    section: "MAIN",
    navigationCode: "DASHBOARD",
  },
  {
    label: "Real Estate Management",
    icon: Building2,
    section: "REAL ESTATE",
    subItems: [
      { label: "Portfolio", path: "/real-estate/portfolio", navigationCode: "REAL_ESTATE_PORTFOLIO" },
      { label: "Properties", path: "/real-estate/properties", navigationCode: "REAL_ESTATE_PROPERTIES" },
      { label: "Stays & Availability", path: "/real-estate/stays", navigationCode: "REAL_ESTATE_BOOKINGS" },
      { label: "Accounting", path: "/real-estate/accounting", navigationCode: "REAL_ESTATE_PAYMENTS" },
    ],
  },
  {
    label: "System & Security",
    icon: ShieldCheck,
    section: "SECURITY & ACCESS",
    subItems: [
      { label: "Users", path: "/configurations/users", navigationCode: "CONFIG_USERS" },
      { label: "Roles", path: "/configurations/roles", navigationCode: "CONFIG_ROLES" },
      { label: "Role Assignments", path: "/configurations/user-role-assignment", navigationCode: "CONFIG_USER_ROLE_ASSIGNMENT" },
      { label: "Role Permissions", path: "/configurations/role-group-permissions", navigationCode: "CONFIG_ROLES" },
      { label: "API Permissions", path: "/configurations/role-api-permissions", navigationCode: "CONFIG_ROLE_API_PERMISSIONS" },
      { label: "MCP Tool Permissions", path: "/configurations/role-mcp-tool-permissions", navigationCode: "CONFIG_ROLE_MCP_TOOL_PERMISSIONS" },
    ],
  },
  {
    label: "Logs & Audit",
    icon: FileClock,
    section: "SYSTEM LOGS",
    subItems: [
      { label: "Audit Log", path: "/log/audit", navigationCode: "AUDIT_LOG" },
      { label: "System Logs", path: "/log/system-logs", navigationCode: "AUDIT_LOG" },
    ],
  },
];


