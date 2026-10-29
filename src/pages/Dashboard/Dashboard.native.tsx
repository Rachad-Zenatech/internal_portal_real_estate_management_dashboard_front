import { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  NativeCard,
  NativeCardHeader,
  NativeCardTitle,
  NativeCardDescription,
  NativeCardContent,
  NativeBadge,
  NativeButton,
  SafeAreaView,
} from "@/components/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useAuth } from "@/lib/AuthContext";
import type { User, Role } from "@/types/auth";

export default function Dashboard() {
  const { user, hasRole, logout } = useAuth();
  const isSuperAdmin = hasRole("SUPER_ADMIN") || user?.is_super_admin;

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiClient.get<User[]>("/api/configuration/users").catch(() => []),
    enabled: !!isSuperAdmin,
  });

  const { data: allRoles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiClient.get<Role[]>("/api/configuration/roles").catch(() => []),
  });

  const activeUsers = useMemo(() => users.filter((u) => u.is_active !== false).length, [users]);
  const activeRoles = useMemo(() => allRoles.filter((r) => r.is_active !== false).length, [allRoles]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.full_name || "Real Estate Manager"}</Text>
          </View>
          <NativeButton
            title="Sign out"
            variant="ghost"
            size="sm"
            leftIcon={<MaterialCommunityIcons name="logout" size={16} color="#64748b" />}
            onPress={() => logout()}
          />
        </View>

        {/* User Card */}
        <NativeCard style={styles.profileCard}>
          <NativeCardContent style={styles.profileContent}>
            <View style={styles.avatarBox}>
              <MaterialCommunityIcons name="layers-outline" size={28} color="#2563eb" />
            </View>
            <View style={styles.profileMeta}>
              <Text style={styles.profileEmail}>{user?.email || "user@zenatech.com"}</Text>
              <View style={styles.badgeRow}>
                {isSuperAdmin && (
                  <NativeBadge label="SUPER ADMIN" variant="default" style={styles.badge} />
                )}
                <NativeBadge
                  label={user?.department || "Operations"}
                  variant="secondary"
                  style={styles.badge}
                />
              </View>
            </View>
          </NativeCardContent>
        </NativeCard>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>System Overview</Text>
        <View style={styles.statsGrid}>
          <NativeCard style={styles.statCard}>
            <NativeCardContent style={styles.statCardContent}>
              <View style={[styles.statIconBox, { backgroundColor: "#eff6ff" }]}>
                <MaterialCommunityIcons name="account-group" size={24} color="#2563eb" />
              </View>
              <View>
                <Text style={styles.statValue}>
                  {isLoadingUsers ? <ActivityIndicator size="small" /> : activeUsers}
                </Text>
                <Text style={styles.statLabel}>Active Users</Text>
              </View>
            </NativeCardContent>
          </NativeCard>

          <NativeCard style={styles.statCard}>
            <NativeCardContent style={styles.statCardContent}>
              <View style={[styles.statIconBox, { backgroundColor: "#f0fdf4" }]}>
                <MaterialCommunityIcons name="shield-check" size={24} color="#16a34a" />
              </View>
              <View>
                <Text style={styles.statValue}>
                  {isLoadingRoles ? <ActivityIndicator size="small" /> : activeRoles}
                </Text>
                <Text style={styles.statLabel}>Configured Roles</Text>
              </View>
            </NativeCardContent>
          </NativeCard>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Real Estate Management Services</Text>
        <NativeCard style={styles.serviceCard}>
          <NativeCardHeader>
            <NativeCardTitle style={styles.serviceTitle}>Real Estate Management Portal</NativeCardTitle>
            <NativeCardDescription>
              Access enterprise resources, manage operational workflows, and view system audit trails.
            </NativeCardDescription>
          </NativeCardHeader>
          <NativeCardContent>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="check-circle" size={18} color="#16a34a" />
              <Text style={styles.featureText}>Operational Workflows & Approvals</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="check-circle" size={18} color="#16a34a" />
              <Text style={styles.featureText}>Role-Based Access & Policy Controls</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="check-circle" size={18} color="#16a34a" />
              <Text style={styles.featureText}>Real-time System & Event Notifications</Text>
            </View>
          </NativeCardContent>
        </NativeCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  greeting: {
    fontSize: 14,
    color: "#64748b",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  profileCard: {
    marginBottom: 24,
    backgroundColor: "#ffffff",
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  profileMeta: {
    flex: 1,
  },
  profileEmail: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    marginRight: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  statCardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  serviceCard: {
    backgroundColor: "#ffffff",
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: "#475569",
  },
});
